# WAKE Contracts

Audit-oriented WAKE repo aligned with the current Litepaper / Whitepaper token logic.

## Contracts

- `WAKEToken.sol` — fixed-supply ERC-20 (`1,575,137,505 WAKE`)
- `WakePresaleMerkleVesting.sol` — Merkle claim + vesting + `claimAndStake`
- `WakeBeneficiaryVestingVault.sol` — beneficiary vesting vault for team / advisors
- `WakeControlledEmissionVault.sol` — discretionary emission vault for treasury / ecosystem / marketing
- `WakeBoundEmissionVault.sol` — controller-bound emission vault for staking / rewards
- `WakeStaking.sol` — retail staking v1 with cooldown unstake and accumulator rewards
- `WakeTimelockVault.sol` — 24-month reserve timelock vault
- `WakeLiquidityVault.sol` — legacy helper, no longer part of canonical mainnet path
- `WakeCustodyVault.sol` — legacy helper, superseded by `WakeTimelockVault`

## What changed versus the old repo state

1. Added standalone staking.
2. Fixed cliff math across presale / vesting / emissions.
3. Split discretionary emission vaults from bound staking/rewards emission vaults.
4. Replaced reserve custody model with real timelock reserve.
5. Removed token-timelock liquidity vault from the canonical mainnet path.
6. Synced Advisors / Strategic Reserve allocations with public docs.
7. Prepared timelock ownership path for staking-related contracts.

## Canonical architecture

```text
WAKEToken (fixed supply)
├── WakePresaleMerkleVesting
│   ├── claim()
│   ├── claimTo()
│   └── claimAndStake()
├── WakeBoundEmissionVault (staking bucket)
│   └── WakeStaking
├── WakeBoundEmissionVault (user rewards bucket)
├── WakeControlledEmissionVault (treasury)
├── WakeControlledEmissionVault (ecosystem)
├── WakeControlledEmissionVault (marketing)
├── WakeBeneficiaryVestingVault (team)
├── WakeBeneficiaryVestingVault (advisors)
└── WakeTimelockVault (reserve)
```

## Mainnet logic notes

- **Liquidity**: liquidity tokens stay on Safe for provisioning; the LP position should be locked in an external audited locker. This repo no longer pretends that a token timelock equals an LP lock.
- **Staking v1**: non-slashing retail staking only. Future sequencer/operator bonds should live in a separate module.
- **Governance**: staking-sensitive contracts are intended to sit behind a timelock path, not instant Safe admin.

## Deployment flow

- `scripts/deploy/00_clean_deployment.js`
- `scripts/deploy/01_deploy_token.js`
- `scripts/deploy/02_deploy_vaults.js`
- `scripts/deploy/03_fund_vaults.js`
- `scripts/deploy/04_set_merkle_root.js`
- `scripts/deploy/05_post_deploy_checks.js`
- `scripts/deploy/06_verify_all.js`

## Local commands

```bash
npm install
npx hardhat compile
npm test
```

## Important note

This environment did not include installed npm dependencies, so the updated repo was prepared structurally but should be compiled and test-run on your machine with `npm install` before deployment or audit submission.

```rm -rf artifacts cache
npx hardhat compile
npm test```

```npm run deploy:testnet:clean
npm run deploy:testnet:token
npm run deploy:testnet:vaults
npm run deploy:testnet:fund
npm run deploy:testnet:check```




