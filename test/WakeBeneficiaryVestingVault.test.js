const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("WakeBeneficiaryVestingVault", function () {
  async function deployFixture() {
    const [owner, beneficiary, outsider] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("WAKEToken");
    const token = await Token.deploy(owner.address, owner.address);
    await token.waitForDeployment();

    const latest = await time.latest();
    const tge = latest + 10;
    const totalAllocation = ethers.parseEther("1000");
    const cliff = 60 * 24 * 60 * 60;
    const vesting = 360 * 24 * 60 * 60;
    const initialUnlockBps = 1000;

    const Vault = await ethers.getContractFactory("WakeBeneficiaryVestingVault");
    const vault = await Vault.deploy(
      owner.address,
      await token.getAddress(),
      beneficiary.address,
      totalAllocation,
      tge,
      cliff,
      vesting,
      initialUnlockBps
    );
    await vault.waitForDeployment();
    await token.transfer(await vault.getAddress(), totalAllocation);

    return { token, vault, owner, beneficiary, outsider, tge, totalAllocation, cliff, vesting };
  }

  it("releases nothing before TGE", async function () {
    const { vault } = await loadFixture(deployFixture);
    expect(await vault.releasable()).to.equal(0n);
    await expect(vault.release()).to.be.revertedWithCustomError(vault, "NothingToRelease");
  });

  it("releases initial unlock at TGE and monthly thereafter", async function () {
    const { token, vault, beneficiary, tge, totalAllocation, cliff, vesting } = await loadFixture(deployFixture);
    const initial = (totalAllocation * 1000n) / 10000n;
    const remaining = totalAllocation - initial;
    const totalMonths = BigInt(Math.floor(vesting / (30 * 24 * 60 * 60)));

    await time.increaseTo(tge);
    expect(await vault.releasable()).to.equal(initial);
    await expect(vault.release()).to.changeTokenBalances(token, [vault, beneficiary], [-initial, initial]);

    await time.increaseTo(tge + cliff + 30 * 24 * 60 * 60);
    const expectedVested = initial + (remaining * 3n) / totalMonths; // 90 days from TGE => 3 months elapsed
    const expectedRelease = expectedVested - initial;
    expect(await vault.releasable()).to.equal(expectedRelease);
    await expect(vault.release()).to.changeTokenBalances(token, [vault, beneficiary], [-expectedRelease, expectedRelease]);
  });

  it("fully releases by vesting end", async function () {
    const { token, vault, beneficiary, tge, totalAllocation, vesting } = await loadFixture(deployFixture);
    await time.increaseTo(tge + vesting + 1);
    await expect(vault.release()).to.changeTokenBalances(token, [vault, beneficiary], [-totalAllocation, totalAllocation]);
    expect(await vault.releasable()).to.equal(0n);
  });

  it("validates constructor params", async function () {
    const [owner, beneficiary] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("WAKEToken");
    const token = await Token.deploy(owner.address, owner.address);
    await token.waitForDeployment();
    const Vault = await ethers.getContractFactory("WakeBeneficiaryVestingVault");
    const latest = await time.latest();

    await expect(
      Vault.deploy(owner.address, await token.getAddress(), beneficiary.address, 1n, latest + 1, 0, 0, 10001)
    ).to.be.revertedWithCustomError(Vault, "InvalidSchedule");
  });
});
