# AUDIT_SCOPE

## In scope

- `contracts/WAKEToken.sol`
- `contracts/WakePresaleMerkleVesting.sol`
- `contracts/WakeBeneficiaryVestingVault.sol`
- `contracts/WakeControlledEmissionVault.sol`
- `contracts/WakeLiquidityVault.sol`
- `contracts/WakeCustodyVault.sol`
- deploy scripts in `scripts/deploy/`

## Out of scope

- off-chain Merkle tree generation
- Safe deployment and Safe UI operations
- future staking / farming / reward-router contracts
- frontend / backend integrations
- exchange listings / LP operations

## Notes

- Rewards are funded into emission vaults on-chain.
- Separate staking contracts are planned for a later phase and are not part of this repository.
- Reserve is computed as the remainder of total supply after all explicit allocations.
