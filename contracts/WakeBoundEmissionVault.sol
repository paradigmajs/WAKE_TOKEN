// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract WakeBoundEmissionVault is Ownable {
    using SafeERC20 for IERC20;

    error InvalidAddress();
    error InvalidSchedule();
    error NotController();

    IERC20 public immutable token;
    uint256 public immutable totalAllocation;
    uint64 public immutable startTimestamp;
    uint64 public immutable emissionDuration;

    address public controller;
    uint256 public released;

    event ControllerUpdated(address indexed controller);
    event Released(address indexed to, uint256 amount);

    constructor(
        address owner_,
        IERC20 token_,
        uint256 totalAllocation_,
        uint64 startTimestamp_,
        uint64 emissionDuration_,
        address controller_
    ) Ownable(owner_) {
        if (owner_ == address(0) || address(token_) == address(0) || controller_ == address(0)) revert InvalidAddress();
        if (emissionDuration_ == 0) revert InvalidSchedule();

        token = token_;
        totalAllocation = totalAllocation_;
        startTimestamp = startTimestamp_;
        emissionDuration = emissionDuration_;
        controller = controller_;
    }

    function setController(address controller_) external onlyOwner {
        if (controller_ == address(0)) revert InvalidAddress();
        controller = controller_;
        emit ControllerUpdated(controller_);
    }

    function vestedAmount(uint256 timestamp) public view returns (uint256) {
        if (timestamp <= startTimestamp) return 0;

        uint256 endTimestamp = uint256(startTimestamp) + uint256(emissionDuration);
        if (timestamp >= endTimestamp) {
            return totalAllocation;
        }

        uint256 elapsed = timestamp - uint256(startTimestamp);
        return (totalAllocation * elapsed) / uint256(emissionDuration);
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
