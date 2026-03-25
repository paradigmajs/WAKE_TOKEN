const { expect } = require('chai');
const { ethers } = require('hardhat');
const { loadFixture, time } = require('@nomicfoundation/hardhat-toolbox/network-helpers');

describe('WakeTimelockVault', function () {
  async function deployFixture() {
    const [owner, recipient] = await ethers.getSigners();
    const Token = await ethers.getContractFactory('WAKEToken');
    const token = await Token.deploy(owner.address);
    await token.waitForDeployment();

    const unlockTimestamp = (await time.latest()) + 30 * 24 * 60 * 60;
    const Vault = await ethers.getContractFactory('WakeTimelockVault');
    const vault = await Vault.deploy(owner.address, await token.getAddress(), unlockTimestamp);
    await vault.waitForDeployment();
    await token.transfer(await vault.getAddress(), ethers.parseEther('100'));

    return { token, vault, recipient, unlockTimestamp };
  }

  it('blocks release before unlock and allows it after unlock', async function () {
    const { token, vault, recipient, unlockTimestamp } = await loadFixture(deployFixture);
    await expect(vault.releaseTo(recipient.address, 1n)).to.be.revertedWithCustomError(vault, 'Locked');

    await time.increaseTo(unlockTimestamp);
    await expect(vault.releaseTo(recipient.address, ethers.parseEther('100'))).to.changeTokenBalances(
      token,
      [vault, recipient],
      [-ethers.parseEther('100'), ethers.parseEther('100')],
    );
  });
});
