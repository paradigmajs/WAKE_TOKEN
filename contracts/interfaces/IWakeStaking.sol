// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IWakeStaking {
    event Staked(address indexed user, uint256 amount);
    event UnstakeRequested(address indexed user, uint256 amount, uint64 availableAt);
    event Unstaked(address indexed user, uint256 amount);
    event RewardsClaimed(address indexed user, uint256 amount);

    function stake(uint256 amount) external;
    function stakeFor(address beneficiary, uint256 amount) external;
    function requestUnstake(uint256 amount) external;
    function withdrawUnstaked() external;
    function claimRewards() external returns (uint256);
    function compoundRewards() external returns (uint256);
    function pendingRewards(address user) external view returns (uint256);
    function effectiveStakeOf(address user) external view returns (uint256);
}
