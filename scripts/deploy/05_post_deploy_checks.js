const assert = require('assert');
const { ethers } = require('hardhat');
const { testnetConfig } = require('./config');
const { readDeployment, requireContract, getCode, writeDeployment } = require('./utils');

async function main() {
  const deployment = readDeployment();
  const tokenAddress = requireContract(deployment, 'token');
  const token = await ethers.getContractAt('WAKEToken', tokenAddress);
  const expectedOwner = testnetConfig.safe.address;

  const contractKeys = [
    'token',
    'presalePrivateVault',
    'liquidityVault',
    'ecosystemVault',
    'treasuryVault',
    'userRewardsVault',
    'stakingVault',
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

  assert.strictEqual(await token.owner(), expectedOwner, 'Token owner mismatch');
  assert.strictEqual((await token.totalSupply()).toString(), testnetConfig.token.totalSupply, 'Total supply mismatch');

  const ownerChecks = [
    ['presalePrivateVault', 'WakePresaleMerkleVesting'],
    ['liquidityVault', 'WakeLiquidityVault'],
    ['ecosystemVault', 'WakeControlledEmissionVault'],
    ['treasuryVault', 'WakeControlledEmissionVault'],
    ['userRewardsVault', 'WakeControlledEmissionVault'],
    ['stakingVault', 'WakeControlledEmissionVault'],
    ['teamVault', 'WakeBeneficiaryVestingVault'],
    ['advisorsVault', 'WakeBeneficiaryVestingVault'],
    ['marketingVault', 'WakeControlledEmissionVault'],
    ['reserveVault', 'WakeCustodyVault'],
  ];

  for (const [key, name] of ownerChecks) {
    const instance = await ethers.getContractAt(name, requireContract(deployment, key));
    assert.strictEqual(await instance.owner(), expectedOwner, `${key} owner mismatch`);
  }

  const balanceChecks = [
    ['presalePrivateVault', testnetConfig.allocations.presalePrivate],
    ['liquidityVault', testnetConfig.allocations.liquidity],
    ['ecosystemVault', testnetConfig.allocations.ecosystemIncentives],
    ['treasuryVault', testnetConfig.allocations.treasury],
    ['userRewardsVault', testnetConfig.allocations.userRewards],
    ['stakingVault', testnetConfig.allocations.stakingEmissions],
    ['teamVault', testnetConfig.allocations.team],
    ['advisorsVault', testnetConfig.allocations.advisors],
    ['marketingVault', testnetConfig.allocations.marketingGrowth],
    ['reserveVault', testnetConfig.allocations.reserve],
  ];

  for (const [key, amount] of balanceChecks) {
    const balance = await token.balanceOf(requireContract(deployment, key));
    assert.strictEqual(balance.toString(), amount, `${key} balance mismatch`);
  }

  const safeBalance = await token.balanceOf(testnetConfig.safe.address);
  assert.strictEqual(safeBalance.toString(), '0', 'Safe should have zero balance after funding');

  deployment.checks = {
    executedAt: new Date().toISOString(),
    ok: true,
    safeBalance: safeBalance.toString(),
  };
  writeDeployment(deployment);

  console.log('[checks] all post-deploy checks passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
