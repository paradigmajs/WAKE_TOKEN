// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {WakeVestingMath} from "./WakeVestingMath.sol";

contract WakeBoundEmissionVault is Ownable {
    using SafeERC20 for IERC20;

    error InvalidAddress();
    error InvalidSchedule();
    error NotController();

    IERC20 public immutable token;
    uint256 public immutable totalAllocation;
    uint64 public immutable tgeTimestamp;
    uint64 public immutable cliffDuration;
    uint64 public immutable vestingDuration;
    uint16 public immutable initialUnlockBps;

    address public controller;
    uint256 public released;

    event ControllerUpdated(address indexed controller);
    event Released(address indexed to, uint256 amount);

    constructor(
        address owner_,
        IERC20 token_,
        uint256 totalAllocation_,
        uint64 tgeTimestamp_,
        uint64 cliffDuration_,
        uint64 vestingDuration_,
        uint16 initialUnlockBps_,
        address controller_
    ) Ownable(owner_) {
        if (owner_ == address(0) || address(token_) == address(0)) revert InvalidAddress();
        if (initialUnlockBps_ > 10_000 || cliffDuration_ > vestingDuration_) revert InvalidSchedule();
        token = token_;
        totalAllocation = totalAllocation_;
        tgeTimestamp = tgeTimestamp_;
        cliffDuration = cliffDuration_;
        vestingDuration = vestingDuration_;
        initialUnlockBps = initialUnlockBps_;
        controller = controller_;
    }

    function setController(address controller_) external onlyOwner {
        if (controller_ == address(0)) revert InvalidAddress();
        controller = controller_;
        emit ControllerUpdated(controller_);
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

    function availableToRelease() public view returns (uint256) {
        uint256 vested = vestedAmount(block.timestamp);
        if (vested <= released) return 0;
        return vested - released;
    }

    function releaseAvailable() external returns (uint256 amount) {
        if (msg.sender != controller) revert NotController();
        amount = availableToRelease();
        if (amount == 0) return 0;
        released += amount;
        token.safeTransfer(controller, amount);
        emit Released(controller, amount);
    }
}
