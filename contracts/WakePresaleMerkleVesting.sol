// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IWakeStaking} from "./interfaces/IWakeStaking.sol";
import {WakeVestingMath} from "./WakeVestingMath.sol";

contract WakePresaleMerkleVesting is Ownable {
    using SafeERC20 for IERC20;

    error InvalidAddress();
    error InvalidRoot();
    error RootFrozen();
    error InvalidProof();
    error NothingToClaim();
    error InvalidSchedule();
    error InvalidStakingAddress();
    error UnapprovedStakingAddress();

    IERC20 public immutable token;
    uint64 public immutable tgeTimestamp;
    uint64 public immutable cliffDuration;
    uint64 public immutable vestingDuration;
    uint16 public immutable initialUnlockBps;
    address public immutable stakingContract;

    bytes32 public merkleRoot;
    bool public rootIsFrozen;

    mapping(address => uint256) public claimed;

    event MerkleRootUpdated(bytes32 indexed newRoot);
    event MerkleRootFrozen();
    event Claimed(address indexed account, uint256 totalAllocation, uint256 amount);
    event ClaimedAndStaked(address indexed account, address indexed staking, uint256 totalAllocation, uint256 amount);

    constructor(
        address owner_,
        IERC20 token_,
        uint64 tgeTimestamp_,
        uint64 cliffDuration_,
        uint64 vestingDuration_,
        uint16 initialUnlockBps_,
        address stakingContract_
    ) Ownable(owner_) {
        if (owner_ == address(0) || address(token_) == address(0) || stakingContract_ == address(0)) revert InvalidAddress();
        if (initialUnlockBps_ > 10_000 || cliffDuration_ > vestingDuration_) revert InvalidSchedule();
        token = token_;
        tgeTimestamp = tgeTimestamp_;
        cliffDuration = cliffDuration_;
        vestingDuration = vestingDuration_;
        initialUnlockBps = initialUnlockBps_;
        stakingContract = stakingContract_;
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
        return WakeVestingMath.vestedAmount(
            totalAllocation,
            tgeTimestamp,
            cliffDuration,
            vestingDuration,
            initialUnlockBps,
            timestamp
        );
    }

    function claimable(address account, uint256 totalAllocation, bytes32[] calldata proof) public view returns (uint256) {
        _verify(account, totalAllocation, proof);
        uint256 vested = vestedAmount(totalAllocation, block.timestamp);
        uint256 alreadyClaimed = claimed[account];
        if (vested <= alreadyClaimed) return 0;
        return vested - alreadyClaimed;
    }

    function claim(uint256 totalAllocation, bytes32[] calldata proof) external returns (uint256 amount) {
        amount = _claim(msg.sender, msg.sender, totalAllocation, proof);
        emit Claimed(msg.sender, totalAllocation, amount);
    }

    function claimTo(address beneficiary, uint256 totalAllocation, bytes32[] calldata proof) external returns (uint256 amount) {
        if (beneficiary == address(0)) revert InvalidAddress();
        amount = _claim(msg.sender, beneficiary, totalAllocation, proof);
        emit Claimed(beneficiary, totalAllocation, amount);
    }

    function claimAndStake(address staking, uint256 totalAllocation, bytes32[] calldata proof) external returns (uint256 amount) {
        if (staking == address(0)) revert InvalidStakingAddress();
        if (staking != stakingContract) revert UnapprovedStakingAddress();
        amount = _claim(msg.sender, address(this), totalAllocation, proof);
        token.forceApprove(staking, 0);
        token.forceApprove(staking, amount);
        IWakeStaking(staking).stakeFor(msg.sender, amount);
        token.forceApprove(staking, 0);
        emit ClaimedAndStaked(msg.sender, staking, totalAllocation, amount);
    }

    function leaf(address account, uint256 totalAllocation) public pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(account, totalAllocation))));
    }

    function _claim(address account, address beneficiary, uint256 totalAllocation, bytes32[] calldata proof) internal returns (uint256 amount) {
        amount = claimable(account, totalAllocation, proof);
        if (amount == 0) revert NothingToClaim();
        claimed[account] += amount;
        token.safeTransfer(beneficiary, amount);
    }

    function _verify(address account, uint256 totalAllocation, bytes32[] calldata proof) internal view {
        if (!MerkleProof.verifyCalldata(proof, merkleRoot, leaf(account, totalAllocation))) {
            revert InvalidProof();
        }
    }
}
