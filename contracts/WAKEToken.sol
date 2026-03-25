// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WAKEToken is ERC20 {
    error InvalidInitialHolder();

    uint256 public constant FIXED_SUPPLY = 1_575_137_505 ether;

    constructor(address initialHolder) ERC20("WAKE", "WAKE") {
        if (initialHolder == address(0)) revert InvalidInitialHolder();
        _mint(initialHolder, FIXED_SUPPLY);
    }
}
