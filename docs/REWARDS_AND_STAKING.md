# REWARDS_AND_STAKING

## On-chain model now implemented

This repository separates three distinct paths:

- `WakeBoundEmissionVault` for **staking emissions**
- `WakeBoundEmissionVault` for **user rewards**
- `WakeStaking` as a standalone **retail staking v1** pool

The WAKE token stays fixed-supply ERC-20 with no rebasing, no mint extensions and no staking logic embedded in the token contract.

## Staking v1 scope

`WakeStaking.sol` is a **non-slashing retail pool**.

Included in v1:

- `stake(uint256)`
- `stakeFor(address,uint256)`
- `requestUnstake(uint256)`
- `withdrawUnstaked()` with zero cooldown in the current config
- `claimRewards()`
- `compoundRewards()`
- accumulator-based accounting with `accRewardPerShare`
- `effectiveStakeOf(address)`

Explicitly not included in v1:

- slashable sequencer bonds
- operator committee logic
- paymaster underwriting logic
- governance voting logic

Those modules belong to later protocol phases and can plug into `effectiveStakeOf()` later.

## Emission semantics

The staking bucket now follows the requested retail behavior:

- rewards start from the emission start timestamp with no staking cliff
- emissions release continuously over time
- APR is variable because it depends on current pool stake
- rewards are pulled from the bound vault into staking without any arbitrary owner release

Implementation detail:

- `WakeBoundEmissionVault` releases emissions linearly by elapsed time
- `WakeStaking` can sync and distribute newly released rewards at any interaction point
- users can unstake and withdraw immediately in the current deployment config

## Empty-pool semantics

If emissions unlock while `totalStaked == 0`, those tokens do **not** retroactively go to the first later staker.

They are tracked as `undistributedRewards` inside `WakeStaking` and can only be released later through the owner path. In canonical deployment that owner is the timelock.

## Governance / control

Staking-related contracts are governed through a timelock-controlled path:

- `WakePresaleMerkleVesting`
- `WakeBoundEmissionVault` (staking)
- `WakeBoundEmissionVault` (user rewards)
- `WakeStaking`
- `WakeTimelockVault` (reserve)

Safe remains the operational authority behind timelock proposals, but the repo no longer models staking control as instant Safe admin.

## Presale interaction

Presale users can:

- `claim(...)`
- `claimTo(...)`
- `claimAndStake(...)`

This ensures only already-claimable / liquid WAKE enters staking.
