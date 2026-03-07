const { ethers } = require('hardhat');
const { testnetConfig } = require('./config');
const { readDeployment, requireContract, saveFunded, saveTx } = require('./utils');

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
  await transferAndWait(token, requireContract(deployment, 'liquidityVault'), a.liquidity, 'liquidityVault');
  await transferAndWait(token, requireContract(deployment, 'ecosystemVault'), a.ecosystemIncentives, 'ecosystemVault');
  await transferAndWait(token, requireContract(deployment, 'treasuryVault'), a.treasury, 'treasuryVault');
  await transferAndWait(token, requireContract(deployment, 'userRewardsVault'), a.userRewards, 'userRewardsVault');
  await transferAndWait(token, requireContract(deployment, 'stakingVault'), a.stakingEmissions, 'stakingVault');
  await transferAndWait(token, requireContract(deployment, 'teamVault'), a.team, 'teamVault');
  await transferAndWait(token, requireContract(deployment, 'advisorsVault'), a.advisors, 'advisorsVault');
  await transferAndWait(token, requireContract(deployment, 'marketingVault'), a.marketingGrowth, 'marketingVault');
  await transferAndWait(token, requireContract(deployment, 'reserveVault'), a.reserve, 'reserveVault');

  const safeBalance = await token.balanceOf(testnetConfig.safe.address);
  console.log(`[fund] remaining safe balance: ${safeBalance}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
