const { run } = require('hardhat');
const { readDeployment } = require('./utils');

async function verifyOne(address, args) {
  try {
    await run('verify:verify', {
      address,
      constructorArguments: args,
    });
    console.log(`[verify] ok -> ${address}`);
  } catch (error) {
    const message = String(error?.message || error);
    if (message.toLowerCase().includes('already verified')) {
      console.log(`[verify] already verified -> ${address}`);
      return;
    }
    throw error;
  }
}

async function main() {
  const deployment = readDeployment();
  for (const [key, contract] of Object.entries(deployment.contracts || {})) {
    if (!contract?.address) continue;
    await verifyOne(contract.address, contract.args || []);
    console.log(`[verify] completed ${key}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
