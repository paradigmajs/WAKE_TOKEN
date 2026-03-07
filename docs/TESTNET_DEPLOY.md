# Testnet deploy flow

## 1. Fill env

Copy `.env.testnet.example` to your shell environment.

Example:

```bash
export PRIVATE_KEY=...
export SAFE_ADDRESS=0x...
export TEAM_BENEFICIARY=0x...
export ADVISORS_BENEFICIARY=0x...
export SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
export ETHERSCAN_API_KEY=...
```

## 2. Clean previous deployment state

```bash
npx hardhat run scripts/deploy/00_clean_deployment.js --network sepolia
```

## 3. Deploy token

```bash
npx hardhat run scripts/deploy/01_deploy_token.js --network sepolia
```

## 4. Deploy vaults

```bash
npx hardhat run scripts/deploy/02_deploy_vaults.js --network sepolia
```

## 5. Fund vaults

```bash
npx hardhat run scripts/deploy/03_fund_vaults.js --network sepolia
```

## 6. Set and freeze Merkle root

```bash
export MERKLE_ROOT=0x...
npx hardhat run scripts/deploy/04_set_merkle_root.js --network sepolia
```

## 7. Post-deploy checks

```bash
npx hardhat run scripts/deploy/05_post_deploy_checks.js --network sepolia
```

## 8. Verify contracts

```bash
npx hardhat run scripts/deploy/06_verify_all.js --network sepolia
```

## 9. Deployment output

All addresses, constructor args, tx hashes, funding txs and checks are written to:

```txt
deployments/sepolia/latest.json
```
