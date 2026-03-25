// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {WakeVestingMath} from "./WakeVestingMath.sol";

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
        if (initialUnlockBps_ > 10_000 || cliffDuration_ > vestingDuration_) revert InvalidSchedule();
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
        return WakeVestingMath.vestedAmount(
            totalAllocation,
            tgeTimestamp,
            cliffDuration,
            vestingDuration,
            initialUnlockBps,
            timestamp
        );
    }

    function releaseTo(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert InvalidAddress();
        if (amount > availableToRelease()) revert AmountExceedsAvailable();
        released += amount;
        token.safeTransfer(to, amount);
        emit Released(to, amount);
    }
}
