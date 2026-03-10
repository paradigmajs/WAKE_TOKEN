# SECURITY

## Security model

- WAKE token has fixed supply minted once at deployment.
- Ownership of token and vault contracts is assigned to Safe.
- Allocation funding happens only after deployment and is checked by post-deploy assertions.
- Presale distribution is controlled by Merkle root and can be frozen.
- Vesting and emission contracts release tokens gradually according to schedule.

## Operational assumptions

- Safe owners and threshold must be configured correctly before mainnet deployment.
- Merkle root must be generated from an audited allocation file.
- Beneficiary addresses must be final before deployment.

## Known non-scope items

- Separate staking logic is not implemented in this repo.
- Off-chain CSV / tree generation is operational, not on-chain, scope.
