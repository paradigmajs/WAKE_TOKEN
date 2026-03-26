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
    const start = latest + 10;
    const totalAllocation = ethers.parseEther('3400');
    const duration = 1080 * 24 * 60 * 60;

    const Vault = await ethers.getContractFactory('WakeBoundEmissionVault');
    const vault = await Vault.deploy(
      owner.address,
      await token.getAddress(),
      totalAllocation,
      start,
      duration,
      controller.address
    );
    await vault.waitForDeployment();
    await token.transfer(await vault.getAddress(), totalAllocation);

    return { token, vault, controller, outsider, start, totalAllocation, duration };
  }

  it('only controller can pull emissions', async function () {
    const { vault, outsider, start } = await loadFixture(deployFixture);
    await time.increaseTo(start + 1);
    await expect(vault.connect(outsider).releaseAvailable()).to.be.revertedWithCustomError(
      vault,
      'NotController'
    );
  });

  it('releases time-based emissions directly to controller', async function () {
    const { token, vault, controller, start } = await loadFixture(deployFixture);

    await time.increaseTo(start + 86400);

    const vaultBalanceBefore = await token.balanceOf(await vault.getAddress());
    const controllerBalanceBefore = await token.balanceOf(controller.address);

    const tx = await vault.connect(controller).releaseAvailable();
    const receipt = await tx.wait();
    const block = await ethers.provider.getBlock(receipt.blockNumber);

    const released = await vault.released();

    const vaultBalanceAfter = await token.balanceOf(await vault.getAddress());
    const controllerBalanceAfter = await token.balanceOf(controller.address);

    expect(controllerBalanceAfter - controllerBalanceBefore).to.equal(released);
    expect(vaultBalanceBefore - vaultBalanceAfter).to.equal(released);

    const expectedReleased =
      (BigInt(block.timestamp - start) * ethers.parseEther('3400')) /
      BigInt(1080 * 24 * 60 * 60);

    expect(released).to.equal(expectedReleased);
  });
});