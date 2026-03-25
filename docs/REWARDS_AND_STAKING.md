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
- `withdrawUnstaked()` after a 7-day cooldown
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

The staking bucket follows the public docs:

- bucket size: `126,011,000 WAKE`
- 0% at TGE
- 2-month cliff
- monthly distribution inside the published 36-month window

Implementation detail:

- no emissions are releasable during cliff
- after cliff, emissions unlock in monthly steps across the **remaining 34 months**
- rewards are pulled from the bound vault into staking without any arbitrary owner release

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
