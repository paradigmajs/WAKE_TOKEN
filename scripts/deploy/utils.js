const fs = require('fs');
const path = require('path');
const { network, ethers } = require('hardhat');
const { testnetConfig } = require('./config');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function getDeploymentDir() {
  return path.join(process.cwd(), 'deployments', network.name);
}

function getDeploymentFile() {
  return path.join(getDeploymentDir(), 'latest.json');
}

function readDeployment() {
  const file = getDeploymentFile();
  if (!fs.existsSync(file)) {
    return {
      network: network.name,
      chainId: testnetConfig.chainId,
      updatedAt: new Date().toISOString(),
      contracts: {},
      config: {},
      tx: {},
      funded: {},
      meta: {},
    };
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeDeployment(payload) {
  ensureDir(getDeploymentDir());
  const normalized = {
    ...payload,
    updatedAt: new Date().toISOString(),
  };
  fs.writeFileSync(getDeploymentFile(), JSON.stringify(normalized, null, 2));
  return normalized;
}

function saveContract(key, value) {
  const deployment = readDeployment();
  deployment.contracts[key] = value;
  return writeDeployment(deployment);
}

function saveTx(key, value) {
  const deployment = readDeployment();
  deployment.tx[key] = value;
  return writeDeployment(deployment);
}

function saveConfig(key, value) {
  const deployment = readDeployment();
  deployment.config[key] = value;
  return writeDeployment(deployment);
}

function saveMeta(key, value) {
  const deployment = readDeployment();
  deployment.meta[key] = value;
  return writeDeployment(deployment);
}

function saveFunded(key, value) {
  const deployment = readDeployment();
  deployment.funded[key] = value;
  return writeDeployment(deployment);
}

async function deployContract(contractName, args, key) {
  const Factory = await ethers.getContractFactory(contractName);
  const contract = await Factory.deploy(...args);
  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const txHash = contract.deploymentTransaction() ? contract.deploymentTransaction().hash : null;

  saveContract(key, {
    name: contractName,
    address,
    args,
  });
  if (txHash) {
    saveTx(`${key}DeployTx`, txHash);
  }

  console.log(`[deploy] ${key} -> ${address}`);
  return contract;
}

function requireContract(deployment, key) {
  const value = deployment.contracts[key];
  if (!value?.address) {
    throw new Error(`Missing deployed contract for key: ${key}`);
  }
  return value.address;
}

async function getCode(address) {
  return ethers.provider.getCode(address);
}

module.exports = {
  ensureDir,
  readDeployment,
  writeDeployment,
  saveContract,
  saveTx,
  saveConfig,
  saveMeta,
  saveFunded,
  deployContract,
  requireContract,
  getCode,
};
