const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture, time } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

describe('WakeControlledEmissionVault', function () {
  async function deployFixture() {
    const [owner, recipient, outsider] = await ethers.getSigners();
    const Token = await ethers.getContractFactory('WAKEToken');
    const token = await Token.deploy(owner.address);
    await token.waitForDeployment();

    const latest = await time.latest();
    const tge = latest + 10;
    const totalAllocation = ethers.parseEther('2400');
    const cliff = 60 * 24 * 60 * 60;
    const vesting = 720 * 24 * 60 * 60;

    const Vault = await ethers.getContractFactory('WakeControlledEmissionVault');
    const vault = await Vault.deploy(owner.address, await token.getAddress(), totalAllocation, tge, cliff, vesting, 0);
    await vault.waitForDeployment();
    await token.transfer(await vault.getAddress(), totalAllocation);

    return { token, vault, recipient, outsider, tge, totalAllocation, cliff, vesting };
  }

  it('only owner can release', async function () {
    const { vault, recipient, outsider, tge, cliff } = await loadFixture(deployFixture);
    await time.increaseTo(tge + cliff);
    await expect(vault.connect(outsider).releaseTo(recipient.address, 1n)).to.be.revertedWithCustomError(vault, 'OwnableUnauthorizedAccount');
  });

  it('releases only the first post-cliff month at cliff boundary', async function () {
    const { vault, tge, cliff, totalAllocation, vesting } = await loadFixture(deployFixture);
    const postCliffMonths = BigInt((vesting - cliff) / (30 * 24 * 60 * 60));

    await time.increaseTo(tge + cliff);
    expect(await vault.availableToRelease()).to.equal(totalAllocation / postCliffMonths);
  });

  it('tracks partial releases and unlocks the rest by vesting end', async function () {
    const { token, vault, recipient, tge, cliff, totalAllocation, vesting } = await loadFixture(deployFixture);
    const postCliffMonths = BigInt((vesting - cliff) / (30 * 24 * 60 * 60));
    const firstMonth = totalAllocation / postCliffMonths;

    await time.increaseTo(tge + cliff);
    const partial = firstMonth / 2n;
    await expect(vault.releaseTo(recipient.address, partial)).to.changeTokenBalances(token, [vault, recipient], [-partial, partial]);
    expect(await vault.availableToRelease()).to.equal(firstMonth - partial);

    await time.increaseTo(tge + vesting + 1);
    const remainder = totalAllocation - partial;
    await expect(vault.releaseTo(recipient.address, remainder)).to.changeTokenBalances(token, [vault, recipient], [-remainder, remainder]);
  });
});
