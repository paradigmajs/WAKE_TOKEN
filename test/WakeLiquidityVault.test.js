const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("WakeLiquidityVault", function () {
  async function deployFixture() {
    const [owner, recipient, outsider] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("WAKEToken");
    const token = await Token.deploy(owner.address, owner.address);
    await token.waitForDeployment();

    const latest = await time.latest();
    const unlockTimestamp = latest + 365 * 24 * 60 * 60;
    const allocation = ethers.parseEther("500");

    const Vault = await ethers.getContractFactory("WakeLiquidityVault");
    const vault = await Vault.deploy(owner.address, await token.getAddress(), unlockTimestamp);
    await vault.waitForDeployment();
    await token.transfer(await vault.getAddress(), allocation);

    return { token, vault, owner, recipient, outsider, allocation, unlockTimestamp };
  }

  it("blocks release before unlock", async function () {
    const { vault, recipient } = await loadFixture(deployFixture);
    await expect(vault.releaseTo(recipient.address, 1n)).to.be.revertedWithCustomError(vault, "Locked");
  });

  it("allows owner release after unlock", async function () {
    const { token, vault, recipient, unlockTimestamp, allocation } = await loadFixture(deployFixture);
    await time.increaseTo(unlockTimestamp);
    await expect(vault.releaseTo(recipient.address, allocation)).to.changeTokenBalances(
      token,
      [vault, recipient],
      [-allocation, allocation]
    );
  });
});
