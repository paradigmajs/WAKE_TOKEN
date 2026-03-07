// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract WAKEToken is ERC20, Ownable {
    uint256 public constant FIXED_SUPPLY = 1_575_137_505 ether;

    constructor(address initialOwner, address initialHolder) ERC20("WAKE", "WAKE") Ownable(initialOwner) {
        require(initialOwner != address(0), "initial owner is zero");
        require(initialHolder != address(0), "initial holder is zero");
        _mint(initialHolder, FIXED_SUPPLY);
    }
}
