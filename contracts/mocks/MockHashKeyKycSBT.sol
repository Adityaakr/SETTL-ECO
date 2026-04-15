// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IHashKeyKycSBT.sol";

contract MockHashKeyKycSBT is IHashKeyKycSBT {
    struct MockProfile {
        string ensName;
        KycLevel level;
        KycStatus status;
        uint256 createTime;
    }

    uint256 private immutable totalFee;
    mapping(address => MockProfile) private profiles;

    constructor(uint256 totalFee_) {
        totalFee = totalFee_;
    }

    function setProfile(address account, string calldata ensName, KycLevel level, KycStatus status) external {
        profiles[account] = MockProfile({
            ensName: ensName,
            level: level,
            status: status,
            createTime: block.timestamp
        });
    }

    function requestKyc(string calldata ensName) external payable override {
        require(msg.value >= totalFee, "fee required");
        profiles[msg.sender] = MockProfile({
            ensName: ensName,
            level: KycLevel.BASIC,
            status: KycStatus.NONE,
            createTime: block.timestamp
        });
    }

    function getTotalFee() external view override returns (uint256) {
        return totalFee;
    }

    function isHuman(address account) external view override returns (bool, uint8) {
        MockProfile memory profile = profiles[account];
        bool valid = profile.status == KycStatus.APPROVED && profile.level != KycLevel.NONE;
        return (valid, uint8(profile.level));
    }

    function getKycInfo(
        address account
    ) external view override returns (string memory ensName, KycLevel level, KycStatus status, uint256 createTime) {
        MockProfile memory profile = profiles[account];
        return (profile.ensName, profile.level, profile.status, profile.createTime);
    }

    function isEnsNameApproved(address user, string calldata ensName) external view override returns (bool) {
        MockProfile memory profile = profiles[user];
        return profile.status == KycStatus.APPROVED && keccak256(bytes(profile.ensName)) == keccak256(bytes(ensName));
    }
}
