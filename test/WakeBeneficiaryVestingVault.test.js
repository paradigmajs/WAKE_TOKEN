const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture, time } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

describe('WakeBeneficiaryVestingVault', function () {
  async function deployFixture() {
    const [owner, beneficiary] = await ethers.getSigners();
    const Token = await ethers.getContractFactory('WAKEToken');
    const token = await Token.deploy(owner.address);
    await token.waitForDeployment();

    const latest = await time.latest();
    const tge = latest + 10;
    const totalAllocation = ethers.parseEther('1000');
    const cliff = 60 * 24 * 60 * 60;
    const vesting = 360 * 24 * 60 * 60;
    const initialUnlockBps = 1000;

    const Vault = await ethers.getContractFactory('WakeBeneficiaryVestingVault');
    const vault = await Vault.deploy(owner.address, await token.getAddress(), beneficiary.address, totalAllocation, tge, cliff, vesting, initialUnlockBps);
    await vault.waitForDeployment();
    await token.transfer(await vault.getAddress(), totalAllocation);

    return { token, vault, beneficiary, tge, totalAllocation, cliff, vesting };
  }

  it('releases nothing before TGE', async function () {
    const { vault } = await loadFixture(deployFixture);
    expect(await vault.releasable()).to.equal(0n);
    await expect(vault.release()).to.be.revertedWithCustomError(vault, 'NothingToRelease');
  });

  it('releases initial unlock at TGE and stays flat during the cliff', async function () {
    const { token, vault, beneficiary, tge, totalAllocation, cliff } = await loadFixture(deployFixture);
    const initial = (totalAllocation * 1000n) / 10000n;

    await time.increaseTo(tge);
    await expect(vault.release()).to.changeTokenBalances(token, [vault, beneficiary], [-initial, initial]);

    await time.increaseTo(tge + cliff - 1);
    expect(await vault.releasable()).to.equal(0n);
  });

  it('releases monthly after cliff using only the post-cliff window', async function () {
    const { token, vault, beneficiary, tge, totalAllocation, cliff, vesting } = await loadFixture(deployFixture);
    const initial = (totalAllocation * 1000n) / 10000n;
    const remaining = totalAllocation - initial;
    const postCliffMonths = BigInt((vesting - cliff) / (30 * 24 * 60 * 60));

    await time.increaseTo(tge);
    await vault.release();

    await time.increaseTo(tge + cliff);
    const monthOne = remaining / postCliffMonths;
    expect(await vault.releasable()).to.equal(monthOne);
    await expect(vault.release()).to.changeTokenBalances(token, [vault, beneficiary], [-monthOne, monthOne]);

    await time.increaseTo(tge + vesting + 1);
    const finalClaim = totalAllocation - initial - monthOne;
    await expect(vault.release()).to.changeTokenBalances(token, [vault, beneficiary], [-finalClaim, finalClaim]);
  });
});
