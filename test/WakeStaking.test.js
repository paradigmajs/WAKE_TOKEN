const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture, time } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

describe('WakeStaking', function () {
  async function deployFixture() {
    const [owner, alice, bob, treasury] = await ethers.getSigners();
    const Token = await ethers.getContractFactory('WAKEToken');
    const token = await Token.deploy(owner.address);
    await token.waitForDeployment();

    const latest = await time.latest();
    const tge = latest + 10;
    const cliff = 60 * 24 * 60 * 60;
    const vesting = 1080 * 24 * 60 * 60;

    const EmissionVault = await ethers.getContractFactory('WakeBoundEmissionVault');
    const emissionVault = await EmissionVault.deploy(owner.address, await token.getAddress(), ethers.parseEther('3400'), tge, cliff, vesting, 0, owner.address);
    await emissionVault.waitForDeployment();
    await token.transfer(await emissionVault.getAddress(), ethers.parseEther('3400'));

    const Staking = await ethers.getContractFactory('WakeStaking');
    const staking = await Staking.deploy(owner.address, await token.getAddress(), await emissionVault.getAddress(), 7 * 24 * 60 * 60);
    await staking.waitForDeployment();
    await emissionVault.setController(await staking.getAddress());

    await token.transfer(alice.address, ethers.parseEther('1000'));
    await token.transfer(bob.address, ethers.parseEther('1000'));
    await token.connect(alice).approve(await staking.getAddress(), ethers.MaxUint256);
    await token.connect(bob).approve(await staking.getAddress(), ethers.MaxUint256);

    return { token, emissionVault, staking, owner, alice, bob, treasury, tge, cliff, vesting };
  }

  it('stakes principal and accrues rewards after emissions unlock', async function () {
  const { token, staking, alice, tge, cliff } = await loadFixture(deployFixture);
  const stakeAmount = ethers.parseEther('100');

  await staking.connect(alice).stake(stakeAmount);
  expect(await staking.effectiveStakeOf(alice.address)).to.equal(stakeAmount);

  await time.increaseTo(tge + cliff);

  await staking.syncRewards();

  const pending = await staking.pendingRewards(alice.address);
  expect(pending).to.be.gt(0n);

  await expect(staking.connect(alice).claimRewards())
    .to.changeTokenBalances(token, [staking, alice], [-pending, pending]);
});

  it('supports compounding and cooldown-based unstake flow', async function () {
    const { token, staking, alice, tge, cliff } = await loadFixture(deployFixture);
    const stakeAmount = ethers.parseEther('100');

    await staking.connect(alice).stake(stakeAmount);
    await time.increaseTo(tge + cliff);

    const pending = await staking.pendingRewards(alice.address);
    await staking.connect(alice).compoundRewards();
    expect(await staking.effectiveStakeOf(alice.address)).to.equal(stakeAmount + pending);

    await staking.connect(alice).requestUnstake(ethers.parseEther('50'));
    await expect(staking.connect(alice).withdrawUnstaked()).to.be.revertedWithCustomError(staking, 'UnstakeNotReady');

    await time.increase(7 * 24 * 60 * 60);
    await expect(staking.connect(alice).withdrawUnstaked()).to.changeTokenBalances(token, [staking, alice], [-ethers.parseEther('50'), ethers.parseEther('50')]);
  });

  it('records undistributed rewards when emissions unlock with no stakers', async function () {
    const { staking, alice, tge, cliff } = await loadFixture(deployFixture);
    await time.increaseTo(tge + cliff);
    await staking.syncRewards();
    const undistributed = await staking.undistributedRewards();
    expect(undistributed).to.be.gt(0n);

    await staking.connect(alice).stake(ethers.parseEther('100'));
    expect(await staking.pendingRewards(alice.address)).to.equal(0n);
  });

  it('allows owner to release undistributed rewards through governance path', async function () {
    const { token, staking, owner, treasury, tge, cliff } = await loadFixture(deployFixture);
    await time.increaseTo(tge + cliff);
    await staking.syncRewards();
    const undistributed = await staking.undistributedRewards();

    await expect(staking.connect(owner).releaseUndistributedRewards(treasury.address, undistributed))
      .to.changeTokenBalances(token, [staking, treasury], [-undistributed, undistributed]);

    expect(await staking.undistributedRewards()).to.equal(0n);
  });
});
