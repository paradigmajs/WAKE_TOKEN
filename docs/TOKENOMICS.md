# TOKENOMICS

Total supply: `1,575,137,505 WAKE`

## Explicit allocations

- Presale / Private Round: `393,784,376`
- Liquidity: `157,513,750`
- Ecosystem Incentives: `252,022,001`
- Treasury: `157,513,750`
- User Rewards: `126,011,000`
- Staking Emissions: `126,011,000`
- Team: `189,016,500`
- Advisors: `47,254,125`
- Marketing / Growth: `78,756,875`

Sum of explicit allocations: `1,527,883,377`

## Reserve remainder

Reserve is not maintained as a risky hardcoded tokenomics number.
It is computed automatically during configuration:

`reserve = totalSupply - sum(explicitAllocations)`

Current computed reserve: `47,254,128 WAKE`

## Why this is safer

This prevents mismatches between the tokenomics table and deployment config.
If any explicit bucket changes, reserve updates automatically and total supply remains exact.
