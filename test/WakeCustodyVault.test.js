const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("WakeCustodyVault", function () {
  async function deployFixture() {
    const [owner, recipient, outsider] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("WAKEToken");
    const token = await Token.deploy(owner.address, owner.address);
    await token.waitForDeployment();

    const allocation = ethers.parseEther("750");
    const Vault = await ethers.getContractFactory("WakeCustodyVault");
    const vault = await Vault.deploy(owner.address, await token.getAddress());
    await vault.waitForDeployment();
    await token.transfer(await vault.getAddress(), allocation);

    return { token, vault, owner, recipient, outsider, allocation };
  }

  it("only owner can release", async function () {
    const { vault, recipient, outsider } = await loadFixture(deployFixture);
    await expect(vault.connect(outsider).releaseTo(recipient.address, 1n)).to.be.revertedWithCustomError(
      vault,
      "OwnableUnauthorizedAccount"
    );
  });

  it("releases custody balance", async function () {
    const { token, vault, recipient, allocation } = await loadFixture(deployFixture);
    await expect(vault.releaseTo(recipient.address, allocation)).to.changeTokenBalances(
      token,
      [vault, recipient],
      [-allocation, allocation]
    );
  });
});
