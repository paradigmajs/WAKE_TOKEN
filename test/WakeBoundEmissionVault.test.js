const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture, time } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

describe('WakeBoundEmissionVault', function () {
  async function deployFixture() {
    const [owner, controller, outsider] = await ethers.getSigners();
    const Token = await ethers.getContractFactory('WAKEToken');
    const token = await Token.deploy(owner.address);
    await token.waitForDeployment();

    const latest = await time.latest();
    const tge = latest + 10;
    const totalAllocation = ethers.parseEther('3400');
    const cliff = 60 * 24 * 60 * 60;
    const vesting = 1080 * 24 * 60 * 60;

    const Vault = await ethers.getContractFactory('WakeBoundEmissionVault');
    const vault = await Vault.deploy(owner.address, await token.getAddress(), totalAllocation, tge, cliff, vesting, 0, controller.address);
    await vault.waitForDeployment();
    await token.transfer(await vault.getAddress(), totalAllocation);

    return { token, vault, controller, outsider, tge, cliff, totalAllocation, vesting };
  }

  it('only controller can pull emissions', async function () {
    const { vault, outsider, tge, cliff } = await loadFixture(deployFixture);
    await time.increaseTo(tge + cliff);
    await expect(vault.connect(outsider).releaseAvailable()).to.be.revertedWithCustomError(vault, 'NotController');
  });

  it('releases vested emissions directly to controller', async function () {
    const { token, vault, controller, tge, cliff, totalAllocation, vesting } = await loadFixture(deployFixture);
    const postCliffMonths = BigInt((vesting - cliff) / (30 * 24 * 60 * 60));
    const firstMonth = totalAllocation / postCliffMonths;

    await time.increaseTo(tge + cliff);
    await expect(vault.connect(controller).releaseAvailable()).to.changeTokenBalances(token, [vault, controller], [-firstMonth, firstMonth]);
  });
});
