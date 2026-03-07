const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("WAKEToken", function () {
  async function deployFixture() {
    const [owner, other] = await ethers.getSigners();
    const Token = await ethers.getContractFactory("WAKEToken");
    const token = await Token.deploy(owner.address, owner.address);
    await token.waitForDeployment();
    return { token, owner, other };
  }

  it("deploys with fixed supply minted to initial holder", async function () {
    const { token, owner } = await loadFixture(deployFixture);
    const expectedSupply = ethers.parseEther("1575137505");

    expect(await token.name()).to.equal("WAKE");
    expect(await token.symbol()).to.equal("WAKE");
    expect(await token.totalSupply()).to.equal(expectedSupply);
    expect(await token.balanceOf(owner.address)).to.equal(expectedSupply);
    expect(await token.owner()).to.equal(owner.address);
  });

  it("reverts with zero initial holder", async function () {
    const Token = await ethers.getContractFactory("WAKEToken");
   
    await expect(
      Token.deploy(ethers.ZeroAddress, ethers.ZeroAddress)
    ).to.be.reverted;
  });
});
