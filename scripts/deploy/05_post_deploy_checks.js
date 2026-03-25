const assert = require('assert');
const { ethers, network } = require('hardhat');
const { testnetConfig } = require('./config');
const { readDeployment, requireContract, getCode, writeDeployment } = require('./utils');

async function main() {
  const deployment = readDeployment();
  const tokenAddress = requireContract(deployment, 'token');
  const token = await ethers.getContractAt('WAKEToken', tokenAddress);
  const safe = testnetConfig.safe.address;
  const timelock = requireContract(deployment, 'timelock');
  const holder = deployment.meta?.tokenInitialHolder || safe;

  const contractKeys = [
    'token',
    'timelock',
    'presalePrivateVault',
    'ecosystemVault',
    'treasuryVault',
    'userRewardsVault',
    'stakingEmissionVault',
    'staking',
    'teamVault',
    'advisorsVault',
    'marketingVault',
    'reserveVault',
  ];

  for (const key of contractKeys) {
    const address = requireContract(deployment, key);
    const code = await getCode(address);
    assert.notStrictEqual(code, '0x', `${key} is not deployed`);
  }

  assert.strictEqual((await token.totalSupply()).toString(), testnetConfig.token.totalSupply, 'Total supply mismatch');

  const ownerChecks = [
    ['presalePrivateVault', 'WakePresaleMerkleVesting', timelock],
    ['ecosystemVault', 'WakeControlledEmissionVault', safe],
    ['treasuryVault', 'WakeControlledEmissionVault', safe],
    ['userRewardsVault', 'WakeBoundEmissionVault', timelock],
    ['stakingEmissionVault', 'WakeBoundEmissionVault', timelock],
    ['staking', 'WakeStaking', timelock],
    ['teamVault', 'WakeBeneficiaryVestingVault', safe],
    ['advisorsVault', 'WakeBeneficiaryVestingVault', safe],
    ['marketingVault', 'WakeControlledEmissionVault', safe],
    ['reserveVault', 'WakeTimelockVault', timelock],
  ];

  for (const [key, name, expectedOwner] of ownerChecks) {
    const instance = await ethers.getContractAt(name, requireContract(deployment, key));
    assert.strictEqual(await instance.owner(), expectedOwner, `${key} owner mismatch`);
  }

  const stakingEmissionVault = await ethers.getContractAt('WakeBoundEmissionVault', requireContract(deployment, 'stakingEmissionVault'));
  const staking = requireContract(deployment, 'staking');
  assert.strictEqual(await stakingEmissionVault.controller(), staking, 'staking emission controller mismatch');

  const balanceChecks = [
    ['presalePrivateVault', testnetConfig.allocations.presalePrivate],
    ['ecosystemVault', testnetConfig.allocations.ecosystemIncentives],
    ['treasuryVault', testnetConfig.allocations.treasury],
    ['userRewardsVault', testnetConfig.allocations.userRewards],
    ['stakingEmissionVault', testnetConfig.allocations.stakingEmissions],
    ['teamVault', testnetConfig.allocations.team],
    ['advisorsVault', testnetConfig.allocations.advisors],
    ['marketingVault', testnetConfig.allocations.marketingGrowth],
    ['reserveVault', testnetConfig.allocations.reserve],
  ];

  let fundedTotal = 0n;
  for (const [key, amount] of balanceChecks) {
    const balance = await token.balanceOf(requireContract(deployment, key));
    assert.strictEqual(balance.toString(), amount, `${key} balance mismatch`);
    fundedTotal += BigInt(amount);
  }

  const holderBalance = await token.balanceOf(holder);
  assert.strictEqual(holderBalance.toString(), testnetConfig.allocations.liquidity, 'Initial holder should retain liquidity bucket only');
  assert.strictEqual((fundedTotal + holderBalance).toString(), testnetConfig.token.totalSupply, 'funded allocations + holder balance mismatch');

  deployment.checks = {
    executedAt: new Date().toISOString(),
    network: network.name,
    ok: true,
    holderBalance: holderBalance.toString(),
    fundedTotal: fundedTotal.toString(),
    stakingController: staking,
    reserveUnlockTimestamp: testnetConfig.schedules.reserve.unlockTimestamp,
    liquidityMode: testnetConfig.liquidity.mode,
    lpLockRequired: testnetConfig.liquidity.lpLockRequired,
    lpLockerAddress: testnetConfig.liquidity.lpLockerAddress || null,
    lpProvisionReceiver: testnetConfig.liquidity.lpProvisionReceiver || null,
  };

  deployment.manifest = {
    token: tokenAddress,
    timelock,
    tgeTimestamp: testnetConfig.tgeTimestamp,
    liquidityBucketHolder: holder,
    liquidityBucketAmount: holderBalance.toString(),
    lpLockRequired: testnetConfig.liquidity.lpLockRequired,
    lpLockerAddress: testnetConfig.liquidity.lpLockerAddress || null,
    contracts: Object.fromEntries(contractKeys.map((key) => [key, requireContract(deployment, key)])),
  };

  writeDeployment(deployment);
  console.log('[checks] all post-deploy checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
