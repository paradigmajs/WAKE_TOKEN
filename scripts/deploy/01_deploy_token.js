const { ethers, network } = require('hardhat');
const { testnetConfig, getRequiredAddresses } = require('./config');
const { deployContract, saveMeta } = require('./utils');

async function main() {
  if (network.name !== testnetConfig.networkName) {
    console.warn(`[warn] config is prepared for ${testnetConfig.networkName}, current network is ${network.name}`);
  }

  const missing = getRequiredAddresses();
  if (missing.length) {
    throw new Error(`Missing required env values: ${missing.join(', ')}`);
  }

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  saveMeta('deployer', deployerAddress);
  saveMeta('deployerBalanceBefore', (await ethers.provider.getBalance(deployerAddress)).toString());

  const tokenInitialHolder = process.env.TOKEN_INITIAL_HOLDER && ethers.isAddress(process.env.TOKEN_INITIAL_HOLDER)
    ? process.env.TOKEN_INITIAL_HOLDER
    : deployerAddress;

  saveMeta('tokenAdminSurface', 'none');
  saveMeta('tokenInitialHolder', tokenInitialHolder);

  await deployContract('WAKEToken', [tokenInitialHolder], 'token');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
