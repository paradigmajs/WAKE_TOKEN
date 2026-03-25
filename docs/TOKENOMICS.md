# TOKENOMICS

Total supply: `1,575,137,505 WAKE`

All allocations are fixed and sum exactly to total supply.

## Allocation table

- Presale / Private Round: `393,784,376`
- Liquidity: `157,513,750`
- Ecosystem Incentives: `252,022,001`
- Treasury: `157,513,750`
- User Rewards: `126,011,000`
- Staking Emissions: `126,011,000`
- Strategic Reserve: `47,254,125`
- Team: `189,016,500`
- Marketing / Growth: `78,756,875`
- Advisors: `47,254,128`

## Public-doc sync

The repository is aligned to the public Litepaper / Whitepaper split:

- `Advisors = 47,254,128 WAKE`
- `Strategic Reserve = 47,254,125 WAKE`

## Control model by bucket

- Presale / Private: `WakePresaleMerkleVesting`
- Liquidity: retained by the initial holder for TGE provisioning, then LP position / LP receipt must be locked externally and published in deployment manifest
- Ecosystem Incentives: `WakeControlledEmissionVault`
- Treasury: `WakeControlledEmissionVault`
- User Rewards: `WakeBoundEmissionVault`
- Staking Emissions: `WakeBoundEmissionVault -> WakeStaking`
- Team: `WakeBeneficiaryVestingVault`
- Marketing / Growth: `WakeControlledEmissionVault`
- Advisors: `WakeBeneficiaryVestingVault`
- Strategic Reserve: `WakeTimelockVault`

## Token admin surface

`WAKEToken.sol` has no owner role and no mint extensions.
