const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

function hashLeaf(account, amount) {
  return ethers.keccak256(ethers.solidityPacked(["bytes32"], [ethers.keccak256(ethers.AbiCoder.defaultAbiCoder().encode(["address", "uint256"], [account, amount]))]));
}

function sortPair(a, b) {
  return BigInt(a) < BigInt(b) ? [a, b] : [b, a];
}

function hashPair(a, b) {
  const [left, right] = sortPair(a, b);
  return ethers.keccak256(ethers.concat([left, right]));
}

function buildMerkle(leaves) {
  if (leaves.length === 0) throw new Error("empty leaves");
  let layers = [leaves.slice()];
  while (layers[layers.length - 1].length > 1) {
    const prev = layers[layers.length - 1];
    const next = [];
    for (let i = 0; i < prev.length; i += 2) {
      const left = prev[i];
      const right = i + 1 < prev.length ? prev[i + 1] : prev[i];
      next.push(hashPair(left, right));
    }
    layers.push(next);
  }
  return {
    root: layers[layers.length - 1][0],
    getProof(leaf) {
      const proof = [];
      let index = layers[0].indexOf(leaf);
      if (index === -1) throw new Error("leaf not found");
      for (let level = 0; level < layers.length - 1; level++) {
        const layer = layers[level];
        const pairIndex = index ^ 1;
        const pairElement = pairIndex < layer.length ? layer[pairIndex] : layer[index];
        proof.push(pairElement);
        index = Math.floor(index / 2);
      }
      return proof;
    },
  };
}

describe("WakePresaleMerkleVesting", function () {
  async function deployFixture() {
    const [owner, alice, bob, outsider] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("WAKEToken");
    const token = await Token.deploy(owner.address, owner.address);
    await token.waitForDeployment();

    const latest = await time.latest();
    const tge = latest + 10;
    const cliff = 60 * 24 * 60 * 60;
    const vesting = 540 * 24 * 60 * 60;
    const initialUnlockBps = 800;

    const Presale = await ethers.getContractFactory("WakePresaleMerkleVesting");
    const presale = await Presale.deploy(
      owner.address,
      await token.getAddress(),
      tge,
      cliff,
      vesting,
      initialUnlockBps
    );
    await presale.waitForDeployment();

    const aliceAllocation = ethers.parseEther("1000");
    const bobAllocation = ethers.parseEther("2000");

    const aliceLeaf = hashLeaf(alice.address, aliceAllocation);
    const bobLeaf = hashLeaf(bob.address, bobAllocation);
    const merkle = buildMerkle([aliceLeaf, bobLeaf]);

    await presale.setMerkleRoot(merkle.root);
    await token.transfer(await presale.getAddress(), aliceAllocation + bobAllocation);

    return {
      token,
      presale,
      owner,
      alice,
      bob,
      outsider,
      tge,
      cliff,
      vesting,
      aliceAllocation,
      bobAllocation,
      aliceProof: merkle.getProof(aliceLeaf),
      bobProof: merkle.getProof(bobLeaf),
    };
  }

  it("owner can set and freeze merkle root", async function () {
    const { presale } = await loadFixture(deployFixture);
    const currentRoot = await presale.merkleRoot();
    expect(currentRoot).to.not.equal(ethers.ZeroHash);

    await expect(presale.freezeRoot()).to.emit(presale, "MerkleRootFrozen");
    await expect(presale.setMerkleRoot(currentRoot)).to.be.revertedWithCustomError(presale, "RootFrozen");
  });

  it("rejects invalid proof", async function () {
    const { presale, outsider, aliceAllocation, aliceProof } = await loadFixture(deployFixture);
    await expect(presale.connect(outsider).claimable(outsider.address, aliceAllocation, aliceProof)).to.be.revertedWithCustomError(
      presale,
      "InvalidProof"
    );
  });

  it("allows initial claim at TGE and prevents double-claiming same tranche", async function () {
    const { token, presale, alice, tge, aliceAllocation, aliceProof } = await loadFixture(deployFixture);
    const initial = (aliceAllocation * 800n) / 10000n;

    await time.increaseTo(tge);
    expect(await presale.claimable(alice.address, aliceAllocation, aliceProof)).to.equal(initial);
    await expect(presale.connect(alice).claim(aliceAllocation, aliceProof)).to.changeTokenBalances(
      token,
      [presale, alice],
      [-initial, initial]
    );

    expect(await presale.claimed(alice.address)).to.equal(initial);
    await expect(presale.connect(alice).claim(aliceAllocation, aliceProof)).to.be.revertedWithCustomError(
      presale,
      "NothingToClaim"
    );
  });

  it("unlocks monthly after cliff and reaches full allocation at end", async function () {
    const { token, presale, bob, tge, cliff, vesting, bobAllocation, bobProof } = await loadFixture(deployFixture);
    const initial = (bobAllocation * 800n) / 10000n;
    const remaining = bobAllocation - initial;
    const totalMonths = BigInt(Math.floor(vesting / (30 * 24 * 60 * 60)));

    await time.increaseTo(tge);
    await presale.connect(bob).claim(bobAllocation, bobProof);

    await time.increaseTo(tge + cliff + 30 * 24 * 60 * 60);
    const expectedVested = initial + (remaining * 3n) / totalMonths;
    const claimable = expectedVested - initial;
    await expect(presale.connect(bob).claim(bobAllocation, bobProof)).to.changeTokenBalances(
      token,
      [presale, bob],
      [-claimable, claimable]
    );

    await time.increaseTo(tge + vesting + 1);
    const alreadyClaimed = await presale.claimed(bob.address);
    const finalClaim = bobAllocation - alreadyClaimed;
    await expect(presale.connect(bob).claim(bobAllocation, bobProof)).to.changeTokenBalances(
      token,
      [presale, bob],
      [-finalClaim, finalClaim]
    );
    expect(await presale.claimed(bob.address)).to.equal(bobAllocation);
  });
});
