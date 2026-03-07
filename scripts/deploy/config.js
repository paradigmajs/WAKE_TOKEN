const { ethers } = require('hardhat');
require("dotenv").config({ path: ".env.testnet" });

const E18 = 10n ** 18n;
const toWei = (value) => (BigInt(value) * E18).toString();
const days = (value) => value * 24 * 60 * 60;

const TOTAL_SUPPLY = 1575137505n;
const TGE_TIMESTAMP = 1814400000; // 2027-07-01 00:00:00 UTC

const allocations = {
  presalePrivate: toWei(393784376n),
  liquidity: toWei(157513750n),
  ecosystemIncentives: toWei(252022001n),
  treasury: toWei(157513750n),
  userRewards: toWei(126011000n),
  stakingEmissions: toWei(126011000n),
  team: toWei(189016500n),
  advisors: toWei(47254125n),
  marketingGrowth: toWei(78756875n),
  reserve: toWei(47254128n),
};

const totalAllocated = Object.values(allocations).reduce((acc, value) => acc + BigInt(value), 0n);
if (totalAllocated !== TOTAL_SUPPLY * E18) {
  throw new Error(`Allocation mismatch: expected ${TOTAL_SUPPLY * E18}, got ${totalAllocated}`);
}

const testnetConfig = {
  networkName: 'sepolia',
  chainId: 11155111,
  token: {
    name: 'WAKE',
    symbol: 'WAKE',
    totalSupply: (TOTAL_SUPPLY * E18).toString(),
  },
  tgeTimestamp: TGE_TIMESTAMP,
  safe: {
    address: process.env.SAFE_ADDRESS || '',
    owners: [
      '0x52c52e02812b68401814a128454Df9254D3454dC',
      '0x45bB1590dDa06a789577A425B6e286E5d6688411',
      '0x9F8dB038aC51fA1e8cAAC0Bc211Cb38E2D283E85',
    ],
    threshold: 2,
  },
  beneficiaries: {
    team: process.env.TEAM_BENEFICIARY || '',
    advisors: process.env.ADVISORS_BENEFICIARY || '',
  },
  allocations,
  schedules: {
    presalePrivate: {
      cliffDuration: days(60),
      vestingDuration: days(540),
      initialUnlockBps: 800,
    },
    liquidity: {
      unlockTimestamp: TGE_TIMESTAMP + days(360),
    },
    ecosystemIncentives: {
      cliffDuration: days(90),
      vestingDuration: days(1080),
      initialUnlockBps: 500,
    },
    treasury: {
      cliffDuration: days(180),
      vestingDuration: days(1080),
      initialUnlockBps: 0,
    },
    userRewards: {
      cliffDuration: 0,
      vestingDuration: days(720),
      initialUnlockBps: 0,
    },
    stakingEmissions: {
      cliffDuration: days(60),
      vestingDuration: days(1080),
      initialUnlockBps: 0,
    },
    team: {
      cliffDuration: days(360),
      vestingDuration: days(1080),
      initialUnlockBps: 0,
    },
    advisors: {
      cliffDuration: days(180),
      vestingDuration: days(720),
      initialUnlockBps: 0,
    },
    marketingGrowth: {
      cliffDuration: 0,
      vestingDuration: days(360),
      initialUnlockBps: 1000,
    },
  },
};

function getRequiredAddresses() {
  const missing = [];
  if (!testnetConfig.safe.address || !ethers.isAddress(testnetConfig.safe.address)) {
    missing.push('SAFE_ADDRESS');
  }
  if (!testnetConfig.beneficiaries.team || !ethers.isAddress(testnetConfig.beneficiaries.team)) {
    missing.push('TEAM_BENEFICIARY');
  }
  if (!testnetConfig.beneficiaries.advisors || !ethers.isAddress(testnetConfig.beneficiaries.advisors)) {
    missing.push('ADVISORS_BENEFICIARY');
  }
  return missing;
}

module.exports = {
  testnetConfig,
  getRequiredAddresses,
  days,
};
