// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract WakeCustodyVault is Ownable {
    using SafeERC20 for IERC20;

    error InvalidAddress();

    IERC20 public immutable token;

    event Released(address indexed to, uint256 amount);

    constructor(address owner_, IERC20 token_) Ownable(owner_) {
        if (owner_ == address(0) || address(token_) == address(0)) revert InvalidAddress();
        token = token_;
    }

    function releaseTo(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert InvalidAddress();
        token.safeTransfer(to, amount);
        emit Released(to, amount);
    }
}
