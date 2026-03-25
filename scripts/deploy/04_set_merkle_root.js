const { ethers } = require('hardhat');
const { readDeployment, requireContract, saveMeta, saveTx } = require('./utils');

async function main() {
  const merkleRoot = process.env.MERKLE_ROOT;
  if (!merkleRoot || !/^0x[a-fA-F0-9]{64}$/.test(merkleRoot)) {
    throw new Error('Set MERKLE_ROOT as a valid bytes32 hex string');
  }

  const deployment = readDeployment();
  const vaultAddress = requireContract(deployment, 'presalePrivateVault');
  const vault = await ethers.getContractAt('WakePresaleMerkleVesting', vaultAddress);
  const [signer] = await ethers.getSigners();
  const signerAddress = await signer.getAddress();
  const owner = await vault.owner();

  if (owner.toLowerCase() === signerAddress.toLowerCase()) {
    const tx1 = await vault.setMerkleRoot(merkleRoot);
    const rc1 = await tx1.wait();
    saveMeta('merkleRoot', merkleRoot);
    saveTx('setMerkleRootTx', rc1.hash);

    const tx2 = await vault.freezeRoot();
    const rc2 = await tx2.wait();
    saveMeta('rootFrozen', true);
    saveTx('freezeMerkleRootTx', rc2.hash);

    console.log(`[merkle] root set and frozen directly by owner signer: ${merkleRoot}`);
    return;
  }

  const iface = vault.interface;
  const setRootCalldata = iface.encodeFunctionData('setMerkleRoot', [merkleRoot]);
  const freezeCalldata = iface.encodeFunctionData('freezeRoot');

  saveMeta('merkleRoot', merkleRoot);
  saveMeta('rootFrozen', false);
  saveMeta('setMerkleRootTarget', vaultAddress);
  saveMeta('setMerkleRootCalldata', setRootCalldata);
  saveMeta('freezeMerkleRootCalldata', freezeCalldata);

  console.log('[merkle] direct execution is not possible from current signer. Submit these calls through owner / timelock flow:');
  console.log(JSON.stringify({ target: vaultAddress, data: setRootCalldata }, null, 2));
  console.log(JSON.stringify({ target: vaultAddress, data: freezeCalldata }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
