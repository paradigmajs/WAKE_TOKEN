const { run } = require('hardhat');
const { readDeployment } = require('./utils');

async function verifyOne(address, args = [], contract = undefined) {
  try {
    const params = {
      address,
      constructorArguments: args,
    };

    if (contract) {
      params.contract = contract;
    }

    await run('verify:verify', params);
    console.log(`[verify] ok -> ${address}`);
  } catch (error) {
    const message = String(error?.message || error).toLowerCase();

    if (
      message.includes('already verified') ||
      message.includes('contract source code already verified') ||
      message.includes('has already been verified')
    ) {
      console.log(`[verify] already verified -> ${address}`);
      return;
    }

    throw error;
  }
}

function getExplicitContract(key) {
  if (key === 'timelock') {
    return 'contracts/WakeTimelockController.sol:WakeTimelockController';
  }

  if (key === 'reserveVault') {
    return 'contracts/WakeTimelockVault.sol:WakeTimelockVault';
  }

  return undefined;
}

async function main() {
  const deployment = readDeployment();

  for (const [key, contract] of Object.entries(deployment.contracts || {})) {
    if (!contract?.address) continue;

    const explicitContract = getExplicitContract(key);

    await verifyOne(contract.address, contract.args || [], explicitContract);
    console.log(`[verify] completed ${key}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});