// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract WakeControlledEmissionVault is Ownable {
    using SafeERC20 for IERC20;

    error InvalidAddress();
    error InvalidSchedule();
    error AmountExceedsAvailable();

    IERC20 public immutable token;
    uint256 public immutable totalAllocation;
    uint64 public immutable tgeTimestamp;
    uint64 public immutable cliffDuration;
    uint64 public immutable vestingDuration;
    uint16 public immutable initialUnlockBps;

    uint256 public released;

    event Released(address indexed to, uint256 amount);

    constructor(
        address owner_,
        IERC20 token_,
        uint256 totalAllocation_,
        uint64 tgeTimestamp_,
        uint64 cliffDuration_,
        uint64 vestingDuration_,
        uint16 initialUnlockBps_
    ) Ownable(owner_) {
        if (owner_ == address(0) || address(token_) == address(0)) revert InvalidAddress();
        if (initialUnlockBps_ > 10_000) revert InvalidSchedule();
        token = token_;
        totalAllocation = totalAllocation_;
        tgeTimestamp = tgeTimestamp_;
        cliffDuration = cliffDuration_;
        vestingDuration = vestingDuration_;
        initialUnlockBps = initialUnlockBps_;
    }

    function availableToRelease() public view returns (uint256) {
        uint256 vested = vestedAmount(block.timestamp);
        if (vested <= released) return 0;
        return vested - released;
    }

    function vestedAmount(uint256 timestamp) public view returns (uint256) {
        if (timestamp < tgeTimestamp) return 0;

        uint256 initial = (totalAllocation * initialUnlockBps) / 10_000;
        uint256 remaining = totalAllocation - initial;

        if (vestingDuration == 0) {
            return totalAllocation;
        }

        if (timestamp < tgeTimestamp + cliffDuration) {
            return initial;
        }

        uint256 elapsed = timestamp - tgeTimestamp;
        uint256 monthsElapsed = elapsed / 30 days;
        uint256 totalMonths = vestingDuration / 30 days;

        if (totalMonths == 0 || monthsElapsed >= totalMonths) {
            return totalAllocation;
        }

        uint256 vestedRemaining = (remaining * monthsElapsed) / totalMonths;
        return initial + vestedRemaining;
    }

    function releaseTo(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert InvalidAddress();
        if (amount > availableToRelease()) revert AmountExceedsAvailable();
        released += amount;
        token.safeTransfer(to, amount);
        emit Released(to, amount);
    }
}
