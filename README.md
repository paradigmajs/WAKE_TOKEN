# WAKE Contracts

Audit-ready репозиторий для WAKE token + vault architecture.

## Состав проекта

- `WAKEToken.sol` — ERC-20 WAKE, fixed supply `1,575,137,505 * 10^18`
- `WakePresaleMerkleVesting.sol` — Presale / Private Round, Merkle claim + vesting
- `WakeBeneficiaryVestingVault.sol` — вестинг для одного фиксированного получателя
- `WakeControlledEmissionVault.sol` — emission / controlled release под Safe
- `WakeLiquidityVault.sol` — vault для ликвидности с lock по времени
- `WakeCustodyVault.sol` — custody vault для reserve

## Ключевые фиксы для аудита

1. **Reserve считается автоматически как остаток от total supply**.
   - Больше нет ручного риска, что сумма allocation не сойдется.
   - Формула в `scripts/deploy/config.js`:
     - `reserve = totalSupply - sum(all non-reserve allocations)`

2. **Rewards / staking описаны корректно**.
   - В репозитории есть vault-слой для эмиссии (`WakeControlledEmissionVault`).
   - Отдельный staking-contract в этот audit scope не входит.
   - Это зафиксировано в `docs/REWARDS_AND_STAKING.md`.

3. **Token ownership и initial holder разделены**.
   - Конструктор токена принимает `initialOwner` и `initialHolder` отдельно.
   - Для текущей конфигурации оба указывают на Safe, но архитектура теперь прозрачная для аудита.

## Зафиксированные параметры

- Token name: `WAKE`
- Token symbol: `WAKE`
- Total supply: `1,575,137,505`
- TGE timestamp: `1814400000` (`2027-07-01 00:00:00 UTC`)
- Safe threshold: `2/3`

## Tokenomics / allocation logic

Не-reserve allocation фиксируется явно, а `reserve` считается как остаток.

### Explicit allocations

- Presale / Private Round — `393,784,376 WAKE`
- Liquidity — `157,513,750 WAKE`
- Ecosystem Incentives — `252,022,001 WAKE`
- Treasury — `157,513,750 WAKE`
- User Rewards — `126,011,000 WAKE`
- Staking Emissions — `126,011,000 WAKE`
- Team — `189,016,500 WAKE`
- Advisors — `47,254,125 WAKE`
- Marketing / Growth — `78,756,875 WAKE`
- Reserve — **автоматический remainder**

Для текущих цифр remainder равен `47,254,128 WAKE`.

## Rewards / staking

В этой версии репозитория:

- `userRewards` и `stakingEmissions` реализованы как **funded emission vaults**;
- полноценный staking-протокол и reward-distributor **не входят в текущий audit scope**;
- будущий flow: `vault -> staking/rewards contracts -> users`.

## Presale Merkle

На ончейне хранится только `merkleRoot`.

Flow:
1. деплой `WakePresaleMerkleVesting`
2. перевести в него allocation Presale / Private
3. собрать Merkle tree оффчейн
4. вызвать `setMerkleRoot(root)` через Safe
5. вызвать `freezeRoot()` через Safe
6. пользователи claim через `claim(totalAllocation, proof)`

## Deploy pipeline

- `scripts/deploy/00_clean_deployment.js`
- `scripts/deploy/01_deploy_token.js`
- `scripts/deploy/02_deploy_vaults.js`
- `scripts/deploy/03_fund_vaults.js`
- `scripts/deploy/04_set_merkle_root.js`
- `scripts/deploy/05_post_deploy_checks.js`
- `scripts/deploy/06_verify_all.js`

## Запуск

```bash
npm install
npx hardhat compile
npm test
```

Для testnet-деплоя смотри `docs/DEPLOYMENT.md` и `docs/TESTNET_DEPLOY.md`.
