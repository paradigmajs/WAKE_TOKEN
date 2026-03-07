// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract WakePresaleMerkleVesting is Ownable {
    using SafeERC20 for IERC20;

    error InvalidAddress();
    error InvalidRoot();
    error RootFrozen();
    error InvalidProof();
    error NothingToClaim();

    IERC20 public immutable token;
    uint64 public immutable tgeTimestamp;
    uint64 public immutable cliffDuration;
    uint64 public immutable vestingDuration;
    uint16 public immutable initialUnlockBps;

    bytes32 public merkleRoot;
    bool public rootIsFrozen;

    mapping(address => uint256) public claimed;

    event MerkleRootUpdated(bytes32 indexed newRoot);
    event MerkleRootFrozen();
    event Claimed(address indexed account, uint256 totalAllocation, uint256 amount);

    constructor(
        address owner_,
        IERC20 token_,
        uint64 tgeTimestamp_,
        uint64 cliffDuration_,
        uint64 vestingDuration_,
        uint16 initialUnlockBps_
    ) Ownable(owner_) {
        if (owner_ == address(0) || address(token_) == address(0)) revert InvalidAddress();
        token = token_;
        tgeTimestamp = tgeTimestamp_;
        cliffDuration = cliffDuration_;
        vestingDuration = vestingDuration_;
        initialUnlockBps = initialUnlockBps_;
    }

    function setMerkleRoot(bytes32 newRoot) external onlyOwner {
        if (rootIsFrozen) revert RootFrozen();
        if (newRoot == bytes32(0)) revert InvalidRoot();
        merkleRoot = newRoot;
        emit MerkleRootUpdated(newRoot);
    }

    function freezeRoot() external onlyOwner {
        if (merkleRoot == bytes32(0)) revert InvalidRoot();
        rootIsFrozen = true;
        emit MerkleRootFrozen();
    }

    function vestedAmount(uint256 totalAllocation, uint256 timestamp) public view returns (uint256) {
        if (timestamp < tgeTimestamp) return 0;

        uint256 initial = (totalAllocation * initialUnlockBps) / 10_000;
        uint256 remaining = totalAllocation - initial;

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

    function claimable(address account, uint256 totalAllocation, bytes32[] calldata proof) public view returns (uint256) {
        _verify(account, totalAllocation, proof);
        uint256 vested = vestedAmount(totalAllocation, block.timestamp);
        uint256 alreadyClaimed = claimed[account];
        if (vested <= alreadyClaimed) return 0;
        return vested - alreadyClaimed;
    }

    function claim(uint256 totalAllocation, bytes32[] calldata proof) external returns (uint256 amount) {
        amount = claimable(msg.sender, totalAllocation, proof);
        if (amount == 0) revert NothingToClaim();
        claimed[msg.sender] += amount;
        token.safeTransfer(msg.sender, amount);
        emit Claimed(msg.sender, totalAllocation, amount);
    }

    function leaf(address account, uint256 totalAllocation) public pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(account, totalAllocation))));
    }

    function _verify(address account, uint256 totalAllocation, bytes32[] calldata proof) internal view {
        if (!MerkleProof.verifyCalldata(proof, merkleRoot, leaf(account, totalAllocation))) {
            revert InvalidProof();
        }
    }
}
