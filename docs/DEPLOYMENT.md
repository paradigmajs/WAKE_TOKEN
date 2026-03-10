# DEPLOYMENT

## Environment

Use `.env.testnet.example` as reference.
Required values:

- `PRIVATE_KEY`
- `RPC_URL`
- `ETHERSCAN_API_KEY`
- `SAFE_ADDRESS`
- `TEAM_BENEFICIARY`
- `ADVISORS_BENEFICIARY`

## Testnet steps

```bash
npm install
npx hardhat compile
npm test
npm run deploy:testnet:clean
npm run deploy:testnet:token
npm run deploy:testnet:vaults
npm run deploy:testnet:fund
npm run deploy:testnet:check
npm run deploy:testnet:verify
```

## Funding expectation

After `deploy:testnet:fund`:
- all allocation buckets must be funded,
- Safe balance should be zero,
- reserve bucket contains the automatic remainder.
