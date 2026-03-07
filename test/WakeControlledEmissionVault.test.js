const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("WakeControlledEmissionVault", function () {
  async function deployFixture() {
    const [owner, recipient, outsider] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("WAKEToken");
    const token = await Token.deploy(owner.address, owner.address);
    await token.waitForDeployment();

    const latest = await time.latest();
    const tge = latest + 10;
    const totalAllocation = ethers.parseEther("2400");
    const cliff = 60 * 24 * 60 * 60;
    const vesting = 720 * 24 * 60 * 60;
    const initialUnlockBps = 0;

    const Vault = await ethers.getContractFactory("WakeControlledEmissionVault");
    const vault = await Vault.deploy(
      owner.address,
      await token.getAddress(),
      totalAllocation,
      tge,
      cliff,
      vesting,
      initialUnlockBps
    );
    await vault.waitForDeployment();
    await token.transfer(await vault.getAddress(), totalAllocation);

    return { token, vault, owner, recipient, outsider, tge, totalAllocation, cliff, vesting };
  }

  it("only owner can release", async function () {
    const { vault, recipient, outsider, tge, cliff } = await loadFixture(deployFixture);
    await time.increaseTo(tge + cliff + 30 * 24 * 60 * 60);
    await expect(vault.connect(outsider).releaseTo(recipient.address, 1n)).to.be.revertedWithCustomError(
      vault,
      "OwnableUnauthorizedAccount"
    );
  });

  it("releases only vested amount", async function () {
    const { token, vault, recipient, tge, cliff, totalAllocation, vesting } = await loadFixture(deployFixture);
    await time.increaseTo(tge + cliff + 30 * 24 * 60 * 60);

    const totalMonths = BigInt(Math.floor(vesting / (30 * 24 * 60 * 60)));
    const expectedAvailable = (totalAllocation * 3n) / totalMonths;
    expect(await vault.availableToRelease()).to.equal(expectedAvailable);

    const partial = expectedAvailable / 2n;
    await expect(vault.releaseTo(recipient.address, partial)).to.changeTokenBalances(token, [vault, recipient], [-partial, partial]);
    expect(await vault.availableToRelease()).to.equal(expectedAvailable - partial);

    await expect(vault.releaseTo(recipient.address, expectedAvailable)).to.be.revertedWithCustomError(
      vault,
      "AmountExceedsAvailable"
    );
  });

  it("fully releases after vesting end", async function () {
    const { token, vault, recipient, tge, totalAllocation, vesting } = await loadFixture(deployFixture);
    await time.increaseTo(tge + vesting + 1);
    await expect(vault.releaseTo(recipient.address, totalAllocation)).to.changeTokenBalances(
      token,
      [vault, recipient],
      [-totalAllocation, totalAllocation]
    );
    expect(await vault.availableToRelease()).to.equal(0n);
  });
});
