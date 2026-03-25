// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IWakeBoundEmissionVault} from "./interfaces/IWakeBoundEmissionVault.sol";
import {IWakeStaking} from "./interfaces/IWakeStaking.sol";

contract WakeStaking is Ownable, ReentrancyGuard, IWakeStaking {
    using SafeERC20 for IERC20;

    error InvalidAddress();
    error InvalidAmount();
    error InsufficientStake();
    error UnstakeNotReady();
    error AmountExceedsUndistributed();

    uint256 public constant ACC_PRECISION = 1e24;

    struct UserInfo {
        uint256 activeStake;
        uint256 rewardDebt;
        uint256 unclaimed;
        uint256 pendingWithdrawal;
        uint64 unstakeAvailableAt;
    }

    IERC20 public immutable token;
    IWakeBoundEmissionVault public immutable emissionVault;
    uint64 public immutable unbondingPeriod;

    uint256 public totalStaked;
    uint256 public accRewardPerShare;
    uint256 public rewardsPulled;
    uint256 public undistributedRewards;

    mapping(address => UserInfo) public users;

    event RewardsSynced(uint256 amount);
    event UndistributedRewardsRecorded(uint256 amount);
    event UndistributedRewardsReleased(address indexed to, uint256 amount);

    constructor(address owner_, IERC20 token_, IWakeBoundEmissionVault emissionVault_, uint64 unbondingPeriod_)
        Ownable(owner_)
    {
        if (owner_ == address(0) || address(token_) == address(0) || address(emissionVault_) == address(0)) {
            revert InvalidAddress();
        }
        token = token_;
        emissionVault = emissionVault_;
        unbondingPeriod = unbondingPeriod_;
    }

    function stake(uint256 amount) external nonReentrant {
        _stakeFrom(msg.sender, msg.sender, amount);
    }

    function stakeFor(address beneficiary, uint256 amount) external nonReentrant {
        _stakeFrom(msg.sender, beneficiary, amount);
    }

    function requestUnstake(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        _syncRewards();

        UserInfo storage user = users[msg.sender];
        _accrueUser(user);

        if (user.activeStake < amount) revert InsufficientStake();

        user.activeStake -= amount;
        totalStaked -= amount;
        user.pendingWithdrawal += amount;
        user.unstakeAvailableAt = uint64(block.timestamp + unbondingPeriod);
        user.rewardDebt = (user.activeStake * accRewardPerShare) / ACC_PRECISION;

        emit UnstakeRequested(msg.sender, amount, user.unstakeAvailableAt);
    }

    function withdrawUnstaked() external nonReentrant {
        UserInfo storage user = users[msg.sender];
        uint256 amount = user.pendingWithdrawal;
        if (amount == 0) revert InvalidAmount();
        if (block.timestamp < user.unstakeAvailableAt) revert UnstakeNotReady();

        user.pendingWithdrawal = 0;
        user.unstakeAvailableAt = 0;
        token.safeTransfer(msg.sender, amount);

        emit Unstaked(msg.sender, amount);
    }

    function claimRewards() external nonReentrant returns (uint256 amount) {
        _syncRewards();
        UserInfo storage user = users[msg.sender];
        _accrueUser(user);

        amount = user.unclaimed;
        if (amount == 0) revert InvalidAmount();

        user.unclaimed = 0;
        user.rewardDebt = (user.activeStake * accRewardPerShare) / ACC_PRECISION;
        token.safeTransfer(msg.sender, amount);

        emit RewardsClaimed(msg.sender, amount);
    }

    function compoundRewards() external nonReentrant returns (uint256 amount) {
        _syncRewards();
        UserInfo storage user = users[msg.sender];
        _accrueUser(user);

        amount = user.unclaimed;
        if (amount == 0) revert InvalidAmount();

        user.unclaimed = 0;
        user.activeStake += amount;
        totalStaked += amount;
        user.rewardDebt = (user.activeStake * accRewardPerShare) / ACC_PRECISION;

        emit RewardsClaimed(msg.sender, amount);
        emit Staked(msg.sender, amount);
    }

    function pendingRewards(address account) external view returns (uint256) {
        UserInfo storage user = users[account];
        uint256 _accRewardPerShare = accRewardPerShare;
        uint256 pendingEmission = emissionVault.availableToRelease();

        if (pendingEmission > 0 && totalStaked > 0) {
            _accRewardPerShare += (pendingEmission * ACC_PRECISION) / totalStaked;
        }

        uint256 accumulated = (user.activeStake * _accRewardPerShare) / ACC_PRECISION;
        uint256 pending = accumulated > user.rewardDebt ? accumulated - user.rewardDebt : 0;
        return user.unclaimed + pending;
    }

    function effectiveStakeOf(address user) external view returns (uint256) {
        return users[user].activeStake;
    }

    function syncRewards() external nonReentrant returns (uint256) {
        return _syncRewards();
    }

    function releaseUndistributedRewards(address to, uint256 amount) external onlyOwner nonReentrant {
        if (to == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (amount > undistributedRewards) revert AmountExceedsUndistributed();

        undistributedRewards -= amount;
        token.safeTransfer(to, amount);

        emit UndistributedRewardsReleased(to, amount);
    }

    function _stakeFrom(address payer, address beneficiary, uint256 amount) internal {
        if (beneficiary == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();

        _syncRewards();
        UserInfo storage user = users[beneficiary];
        _accrueUser(user);

        token.safeTransferFrom(payer, address(this), amount);

        user.activeStake += amount;
        totalStaked += amount;
        user.rewardDebt = (user.activeStake * accRewardPerShare) / ACC_PRECISION;

        emit Staked(beneficiary, amount);
    }

    function _syncRewards() internal returns (uint256 amount) {
        amount = emissionVault.releaseAvailable();
        if (amount == 0) return 0;

        rewardsPulled += amount;

        if (totalStaked == 0) {
            undistributedRewards += amount;
            emit UndistributedRewardsRecorded(amount);
            return amount;
        }

        accRewardPerShare += (amount * ACC_PRECISION) / totalStaked;
        emit RewardsSynced(amount);
    }

    function _accrueUser(UserInfo storage user) internal {
        if (user.activeStake > 0) {
            uint256 accumulated = (user.activeStake * accRewardPerShare) / ACC_PRECISION;
            if (accumulated > user.rewardDebt) {
                user.unclaimed += accumulated - user.rewardDebt;
            }
        }
        user.rewardDebt = (user.activeStake * accRewardPerShare) / ACC_PRECISION;
    }
}
