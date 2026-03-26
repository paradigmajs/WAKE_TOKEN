# AUDIT_SCOPE

## In scope

- `contracts/WAKEToken.sol`
- `contracts/WakePresaleMerkleVesting.sol`
- `contracts/WakeBeneficiaryVestingVault.sol`
- `contracts/WakeControlledEmissionVault.sol`
- `contracts/WakeBoundEmissionVault.sol`
- `contracts/WakeStaking.sol`
- `contracts/WakeTimelockVault.sol`
- deploy scripts in `scripts/deploy/`

## Out of scope

- off-chain Merkle tree generation
- Safe deployment and Safe UI operations
- third-party LP locker deployment / LP management execution
- future sequencer-bond / slashing modules
- frontend / backend integrations

## Notes

- Staking is part of the repository and should be audited together with the staking-bound emission vault. Current repo semantics: no retail slashing, no staking cliff, continuous emission release, immediate withdraw in config.
- Liquidity follows an external LP-lock publication flow. The canonical deployment manifest should include the LP locker address after provisioning.
- Reserve is a real 24-month timelock vault.
- Token contract has no owner/admin surface.
