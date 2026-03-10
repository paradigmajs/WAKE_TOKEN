# REWARDS_AND_STAKING

## Current implementation

This repository includes two funded emission vault buckets:

- `userRewards`
- `stakingEmissions`

Both are implemented via `WakeControlledEmissionVault`.

## Current architecture

The current audited architecture is:

`funded vault -> future distributor / staking contracts -> users`

## Important clarification

There is no standalone staking contract inside this repository yet.
That is intentional for the current phase and must be disclosed to auditors as out of scope.

## Recommended audit wording

"Rewards are funded through controlled emission vaults. Separate staking and reward-distribution contracts are planned for a later phase and are not part of the current audit scope."
