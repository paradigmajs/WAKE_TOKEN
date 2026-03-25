// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library WakeVestingMath {
    uint256 internal constant BPS_DENOMINATOR = 10_000;
    uint256 internal constant MONTH = 30 days;

    function vestedAmount(
        uint256 totalAllocation,
        uint64 tgeTimestamp,
        uint64 cliffDuration,
        uint64 vestingDuration,
        uint16 initialUnlockBps,
        uint256 timestamp
    ) internal pure returns (uint256) {
        if (timestamp < tgeTimestamp) return 0;

        uint256 initial = (totalAllocation * initialUnlockBps) / BPS_DENOMINATOR;
        uint256 remaining = totalAllocation - initial;

        if (remaining == 0) {
            return totalAllocation;
        }

        if (vestingDuration == 0) {
            return totalAllocation;
        }

        uint256 vestingEnd = uint256(tgeTimestamp) + uint256(vestingDuration);
        if (timestamp >= vestingEnd) {
            return totalAllocation;
        }

        uint256 cliffEnd = uint256(tgeTimestamp) + uint256(cliffDuration);
        if (timestamp < cliffEnd) {
            return initial;
        }

        uint256 postCliffDuration = vestingDuration > cliffDuration ? vestingDuration - cliffDuration : 0;
        if (postCliffDuration == 0) {
            return totalAllocation;
        }

        uint256 elapsedAfterCliff = timestamp - cliffEnd;
        uint256 monthsElapsed = (elapsedAfterCliff / MONTH) + 1;
        uint256 totalMonths = postCliffDuration / MONTH;

        if (totalMonths == 0 || monthsElapsed >= totalMonths) {
            return totalAllocation;
        }

        uint256 vestedRemaining = (remaining * monthsElapsed) / totalMonths;
        return initial + vestedRemaining;
    }
}
