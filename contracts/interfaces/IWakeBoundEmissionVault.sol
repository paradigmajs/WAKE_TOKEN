// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IWakeBoundEmissionVault {
    function availableToRelease() external view returns (uint256);
    function releaseAvailable() external returns (uint256);
    function controller() external view returns (address);
}
