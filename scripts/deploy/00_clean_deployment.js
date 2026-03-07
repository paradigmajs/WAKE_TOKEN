const fs = require('fs');
const path = require('path');
const { network } = require('hardhat');

async function main() {
  const file = path.join(process.cwd(), 'deployments', network.name, 'latest.json');
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`[clean] removed ${file}`);
  } else {
    console.log('[clean] nothing to remove');
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
