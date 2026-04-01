const { ethers } = require('hardhat');
const { testnetConfig } = require('./config');
const { readDeployment, requireContract, deployContract, saveConfig, saveMeta } = require('./utils');

async function main() {
  const deployment = readDeployment();
  const tokenAddress = requireContract(deployment, 'token');
  const safe = testnetConfig.safe.address;
  const tge = testnetConfig.tgeTimestamp;
  const a = testnetConfig.allocations;
  const s = testnetConfig.schedules;

  saveConfig('tgeTimestamp', tge);
  saveConfig('safe', testnetConfig.safe);
  saveConfig('beneficiaries', testnetConfig.beneficiaries);
  saveConfig('allocations', a);
  saveConfig('schedules', s);
  saveConfig('staking', testnetConfig.staking);
  saveConfig('timelock', testnetConfig.timelock);
  saveConfig('liquidity', testnetConfig.liquidity);

  const executors = testnetConfig.timelock.executors.length ? testnetConfig.timelock.executors : [safe];
  await deployContract(
    'WakeTimelockController',
    [testnetConfig.timelock.minDelay, [safe], executors, safe],
    'timelock',
  );

  const timelockAddress = requireContract(readDeployment(), 'timelock');

  const [deployer] = await ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  const currentNonce = await ethers.provider.getTransactionCount(deployerAddress);
  const predictedStakingAddress = ethers.getCreateAddress({ from: deployerAddress, nonce: currentNonce + 5 });
  saveMeta('predictedStakingAddress', predictedStakingAddress);

  await deployContract(
    'WakePresaleMerkleVesting',
    [
      timelockAddress,
      tokenAddress,
      tge,
      s.presalePrivate.cliffDuration,
      s.presalePrivate.vestingDuration,
      s.presalePrivate.initialUnlockBps,
      predictedStakingAddress,
    ],
    'presalePrivateVault',
  );

  await deployContract(
    'WakeControlledEmissionVault',
    [safe, tokenAddress, a.ecosystemIncentives, tge, s.ecosystemIncentives.cliffDuration, s.ecosystemIncentives.vestingDuration, s.ecosystemIncentives.initialUnlockBps],
    'ecosystemVault',
  );

  await deployContract(
    'WakeControlledEmissionVault',
    [safe, tokenAddress, a.treasury, tge, s.treasury.cliffDuration, s.treasury.vestingDuration, s.treasury.initialUnlockBps],
    'treasuryVault',
  );

  await deployContract(
    'WakeBoundEmissionVault',
    [timelockAddress, tokenAddress, a.userRewards, tge + s.userRewards.startOffset, s.userRewards.emissionDuration, safe],
    'userRewardsVault',
  );

  await deployContract(
    'WakeBoundEmissionVault',
    [timelockAddress, tokenAddress, a.stakingEmissions, tge + s.stakingEmissions.startOffset, s.stakingEmissions.emissionDuration, predictedStakingAddress],
    'stakingEmissionVault',
  );

  await deployContract(
    'WakeStaking',
    [timelockAddress, tokenAddress, requireContract(readDeployment(), 'stakingEmissionVault'), testnetConfig.staking.unbondingPeriod],
    'staking',
  );

  await deployContract(
    'WakeBeneficiaryVestingVault',
    [safe, tokenAddress, testnetConfig.beneficiaries.team, a.team, tge, s.team.cliffDuration, s.team.vestingDuration, s.team.initialUnlockBps],
    'teamVault',
  );

  await deployContract(
    'WakeBeneficiaryVestingVault',
    [safe, tokenAddress, testnetConfig.beneficiaries.advisors, a.advisors, tge, s.advisors.cliffDuration, s.advisors.vestingDuration, s.advisors.initialUnlockBps],
    'advisorsVault',
  );

  await deployContract(
    'WakeControlledEmissionVault',
    [safe, tokenAddress, a.marketingGrowth, tge, s.marketingGrowth.cliffDuration, s.marketingGrowth.vestingDuration, s.marketingGrowth.initialUnlockBps],
    'marketingVault',
  );

  await deployContract(
    'WakeTimelockVault',
    [timelockAddress, tokenAddress, s.reserve.unlockTimestamp],
    'reserveVault',
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
