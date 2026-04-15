// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IHashKeyKycSBT {
    enum KycLevel {
        NONE,
        BASIC,
        ADVANCED,
        PREMIUM,
        ULTIMATE
    }

    enum KycStatus {
        NONE,
        APPROVED,
        REVOKED
    }

    function requestKyc(string calldata ensName) external payable;

    function getTotalFee() external view returns (uint256);

    function isHuman(address account) external view returns (bool, uint8);

    function getKycInfo(
        address account
    ) external view returns (string memory ensName, KycLevel level, KycStatus status, uint256 createTime);

    function isEnsNameApproved(address user, string calldata ensName) external view returns (bool);
}
