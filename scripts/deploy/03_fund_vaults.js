const { ethers } = require('hardhat');
const { testnetConfig } = require('./config');
const { readDeployment, requireContract, saveFunded, saveTx, saveMeta } = require('./utils');

async function transferAndWait(token, to, amount, label) {
  const tx = await token.transfer(to, amount);
  const receipt = await tx.wait();
  saveFunded(label, { to, amount, txHash: receipt.hash });
  saveTx(`${label}FundingTx`, receipt.hash);
  console.log(`[fund] ${label}: ${amount} -> ${to}`);
}

async function main() {
  const deployment = readDeployment();
  const tokenAddress = requireContract(deployment, 'token');
  const token = await ethers.getContractAt('WAKEToken', tokenAddress);
  const a = testnetConfig.allocations;

  await transferAndWait(token, requireContract(deployment, 'presalePrivateVault'), a.presalePrivate, 'presalePrivateVault');
  await transferAndWait(token, requireContract(deployment, 'ecosystemVault'), a.ecosystemIncentives, 'ecosystemVault');
  await transferAndWait(token, requireContract(deployment, 'treasuryVault'), a.treasury, 'treasuryVault');
  await transferAndWait(token, requireContract(deployment, 'userRewardsVault'), a.userRewards, 'userRewardsVault');
  await transferAndWait(token, requireContract(deployment, 'stakingEmissionVault'), a.stakingEmissions, 'stakingEmissionVault');
  await transferAndWait(token, requireContract(deployment, 'teamVault'), a.team, 'teamVault');
  await transferAndWait(token, requireContract(deployment, 'advisorsVault'), a.advisors, 'advisorsVault');
  await transferAndWait(token, requireContract(deployment, 'marketingVault'), a.marketingGrowth, 'marketingVault');
  await transferAndWait(token, requireContract(deployment, 'reserveVault'), a.reserve, 'reserveVault');

  const holder = deployment.meta?.tokenInitialHolder;
  const holderBalance = await token.balanceOf(holder);
  saveMeta('liquidityBucketHolder', holder);
  saveMeta('liquidityBucketAmount', holderBalance.toString());
  console.log(`[fund] remaining holder balance (liquidity bucket reserved for LP provisioning): ${holderBalance}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
