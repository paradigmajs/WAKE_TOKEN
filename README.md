# WAKE Contracts

Состав проекта:

- `WAKEToken.sol` — ERC-20 WAKE, fixed supply `1,575,137,505 * 10^18`
- `WakePresaleMerkleVesting.sol` — Presale / Private Round, Merkle claim + vesting
- `WakeBeneficiaryVestingVault.sol` — вестинг для одного фиксированного получателя
- `WakeControlledEmissionVault.sol` — emission / controlled release под Safe
- `WakeLiquidityVault.sol` — vault для ликвидности с lock по времени
- `WakeCustodyVault.sol` — простой custody vault под reserve / treasury custody

## Зафиксированные параметры

- Token name: `WAKE`
- Token symbol: `WAKE`
- Total supply: `1,575,137,505`
- TGE timestamp: `1814400000` (`2027-07-01 00:00:00 UTC`)
- Safe owners:
  - `0x52c52e02812b68401814a128454Df9254D3454dC`
  - `0x45bB1590dDa06a789577A425B6e286E5d6688411`
  - `0x9F8dB038aC51fA1e8cAAC0Bc211Cb38E2D283E85`
- Safe threshold: `2/3`

## Mapping по токеномике

### 1. Presale / Private Round — `393,784,376 WAKE`
Контракт: `WakePresaleMerkleVesting`

Параметры конструктора:
- `owner_`: Safe address
- `token_`: address WAKE token
- `tgeTimestamp_`: `1814400000`
- `cliffDuration_`: `60 days`
- `vestingDuration_`: `540 days`
- `initialUnlockBps_`: `800`

### 2. Liquidity — `157,513,750 WAKE`
Контракт: `WakeLiquidityVault`

Параметры конструктора:
- `owner_`: Safe address
- `token_`: address WAKE token
- `unlockTimestamp_`: `TGE + 360 days`

### 3. Ecosystem Incentives — `252,022,001 WAKE`
Контракт: `WakeControlledEmissionVault`

Параметры:
- `cliffDuration_`: `90 days`
- `vestingDuration_`: `1080 days`
- `initialUnlockBps_`: `500`

### 4. Treasury — `157,513,750 WAKE`
Контракт: `WakeControlledEmissionVault`

Параметры:
- `cliffDuration_`: `180 days`
- `vestingDuration_`: `1080 days`
- `initialUnlockBps_`: `0`

### 5. User Rewards — `126,011,000 WAKE`
Контракт: `WakeControlledEmissionVault`

Параметры:
- `cliffDuration_`: `0`
- `vestingDuration_`: `720 days`
- `initialUnlockBps_`: `0`

### 6. Staking Emissions — `126,011,000 WAKE`
Контракт: `WakeControlledEmissionVault`

Параметры:
- `cliffDuration_`: `60 days`
- `vestingDuration_`: `1080 days`
- `initialUnlockBps_`: `0`

### 7. Team — `189,016,500 WAKE`
Контракт: `WakeBeneficiaryVestingVault`

Параметры:
- `cliffDuration_`: `360 days`
- `vestingDuration_`: `1080 days`
- `initialUnlockBps_`: `0`
- `beneficiary_`: отдельный адрес/vesting recipient, утверждается отдельно

### 8. Advisors — `47,254,125 WAKE`
Контракт: `WakeBeneficiaryVestingVault`

Параметры:
- `cliffDuration_`: `180 days`
- `vestingDuration_`: `720 days`
- `initialUnlockBps_`: `0`
- `beneficiary_`: отдельный адрес/vesting recipient, утверждается отдельно

### 9. Marketing / Growth — `78,756,875 WAKE`
Контракт: `WakeControlledEmissionVault`

Параметры:
- `cliffDuration_`: `0`
- `vestingDuration_`: `360 days`
- `initialUnlockBps_`: `1000`

### 10. Reserve — `47,255,128 WAKE`
Контракт: `WakeCustodyVault` или хранение прямо на Safe

## Assumption по monthly release

Во всех vesting / emission vault используется следующая логика:
- initial unlock доступен с TGE
- до cliff доступен только initial unlock
- после cliff накопленное monthly vesting считается от TGE, с шагом `30 days`
- после окончания полного срока доступно 100%

Это поведение зафиксировано в коде и его нужно отдельно утвердить перед аудитом.

## Presale Merkle

В контракте **не хранится CSV**. На ончейне хранится только `merkleRoot`.

Flow:
1. деплой `WakePresaleMerkleVesting`
2. перевести в него `393,784,376 WAKE`
3. когда будет финальный CSV `address,amount`, собрать Merkle tree оффчейн
4. вызвать `setMerkleRoot(root)` через Safe
5. вызвать `freezeRoot()` через Safe
6. пользователи claim через `claim(totalAllocation, proof)`

Leaf формируется так:

```solidity
keccak256(bytes.concat(keccak256(abi.encode(account, totalAllocation))))
```

## Этап 1 — Testnet deploy pipeline

Добавлены готовые deploy-скрипты:

- `scripts/deploy/00_clean_deployment.js`
- `scripts/deploy/01_deploy_token.js`
- `scripts/deploy/02_deploy_vaults.js`
- `scripts/deploy/03_fund_vaults.js`
- `scripts/deploy/04_set_merkle_root.js`
- `scripts/deploy/05_post_deploy_checks.js`
- `scripts/deploy/06_verify_all.js`
- `scripts/deploy/config.js`
- `scripts/deploy/utils.js`
- `docs/TESTNET_DEPLOY.md`
- `.env.testnet.example`

Что делает pipeline:

1. чистит прошлый deployment state
2. деплоит token
3. деплоит все vault-контракты
4. разносит allocation по vault-адресам
5. опционально выставляет и фризит Merkle root
6. прогоняет post-deploy checks
7. верифицирует контракты в explorer
8. пишет результат в `deployments/sepolia/latest.json`

## Запуск

```bash
npm install
npx hardhat compile
npm test
```

Для testnet-деплоя смотри `docs/TESTNET_DEPLOY.md`.


## Important deployment note

For automated testnet deployment, the token is deployed with:
- `owner = SAFE_ADDRESS`
- `initialHolder = deployer EOA`

This lets the deployer fund all vaults during `03_fund_vaults.js`, while governance ownership stays on the Safe from the start.
