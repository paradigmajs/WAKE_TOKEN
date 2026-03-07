const { ethers } = require('hardhat');
const { testnetConfig } = require('./config');
const { readDeployment, requireContract, deployContract, saveConfig } = require('./utils');

async function main() {
  const deployment = readDeployment();
  const tokenAddress = requireContract(deployment, 'token');
  const owner = testnetConfig.safe.address;
  const tge = testnetConfig.tgeTimestamp;
  const a = testnetConfig.allocations;
  const s = testnetConfig.schedules;

  saveConfig('tgeTimestamp', tge);
  saveConfig('safe', testnetConfig.safe);
  saveConfig('beneficiaries', testnetConfig.beneficiaries);
  saveConfig('allocations', a);
  saveConfig('schedules', s);

  await deployContract(
    'WakePresaleMerkleVesting',
    [owner, tokenAddress, tge, s.presalePrivate.cliffDuration, s.presalePrivate.vestingDuration, s.presalePrivate.initialUnlockBps],
    'presalePrivateVault',
  );

  await deployContract(
    'WakeLiquidityVault',
    [owner, tokenAddress, s.liquidity.unlockTimestamp],
    'liquidityVault',
  );

  await deployContract(
    'WakeControlledEmissionVault',
    [owner, tokenAddress, a.ecosystemIncentives, tge, s.ecosystemIncentives.cliffDuration, s.ecosystemIncentives.vestingDuration, s.ecosystemIncentives.initialUnlockBps],
    'ecosystemVault',
  );

  await deployContract(
    'WakeControlledEmissionVault',
    [owner, tokenAddress, a.treasury, tge, s.treasury.cliffDuration, s.treasury.vestingDuration, s.treasury.initialUnlockBps],
    'treasuryVault',
  );

  await deployContract(
    'WakeControlledEmissionVault',
    [owner, tokenAddress, a.userRewards, tge, s.userRewards.cliffDuration, s.userRewards.vestingDuration, s.userRewards.initialUnlockBps],
    'userRewardsVault',
  );

  await deployContract(
    'WakeControlledEmissionVault',
    [owner, tokenAddress, a.stakingEmissions, tge, s.stakingEmissions.cliffDuration, s.stakingEmissions.vestingDuration, s.stakingEmissions.initialUnlockBps],
    'stakingVault',
  );

  await deployContract(
    'WakeBeneficiaryVestingVault',
    [owner, tokenAddress, testnetConfig.beneficiaries.team, a.team, tge, s.team.cliffDuration, s.team.vestingDuration, s.team.initialUnlockBps],
    'teamVault',
  );

  await deployContract(
    'WakeBeneficiaryVestingVault',
    [owner, tokenAddress, testnetConfig.beneficiaries.advisors, a.advisors, tge, s.advisors.cliffDuration, s.advisors.vestingDuration, s.advisors.initialUnlockBps],
    'advisorsVault',
  );

  await deployContract(
    'WakeControlledEmissionVault',
    [owner, tokenAddress, a.marketingGrowth, tge, s.marketingGrowth.cliffDuration, s.marketingGrowth.vestingDuration, s.marketingGrowth.initialUnlockBps],
    'marketingVault',
  );

  await deployContract(
    'WakeCustodyVault',
    [owner, tokenAddress],
    'reserveVault',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
