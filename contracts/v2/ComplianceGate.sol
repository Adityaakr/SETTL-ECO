// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IComplianceGate.sol";
import "../interfaces/IHashKeyKycSBT.sol";

contract ComplianceGate is Ownable, IComplianceGate {
    enum ComplianceLevel {
        Standard,
        Enhanced,
        Institutional
    }

    struct ComplianceProfile {
        ComplianceStatus status;
        ComplianceLevel level;
        uint64 reviewedAt;
        uint64 expiresAt;
        bytes32 metadataHash;
    }

    bool public immutable selfServeEnabled;
    IHashKeyKycSBT public immutable hashKeyKycSbt;
    mapping(address => ComplianceProfile) private profiles;

    event ComplianceUpdated(
        address indexed account,
        ComplianceStatus status,
        ComplianceLevel level,
        uint64 expiresAt,
        bytes32 metadataHash
    );
    event HashKeyKycSynced(
        address indexed account,
        bool isHuman,
        uint8 kycLevel,
        uint8 kycStatus
    );

    constructor(address admin, bool selfServeEnabled_, address hashKeyKycSbtAddress) Ownable(admin) {
        selfServeEnabled = selfServeEnabled_;
        hashKeyKycSbt = IHashKeyKycSBT(hashKeyKycSbtAddress);
    }

    function setProfile(
        address account,
        ComplianceStatus status,
        ComplianceLevel level,
        uint64 expiresAt,
        bytes32 metadataHash
    ) external onlyOwner {
        _setProfile(account, status, level, expiresAt, metadataHash);
    }

    function selfApprove(ComplianceLevel level, bytes32 metadataHash) external {
        require(address(hashKeyKycSbt) == address(0) || selfServeEnabled, "official hashkey kyc required");
        require(selfServeEnabled, "self-serve disabled");
        _setProfile(
            msg.sender,
            ComplianceStatus.Approved,
            level,
            type(uint64).max,
            metadataHash
        );
    }

    function requestReview(ComplianceLevel level, bytes32 metadataHash) external {
        require(address(hashKeyKycSbt) == address(0) || selfServeEnabled, "official hashkey kyc required");
        require(selfServeEnabled, "self-serve disabled");
        _setProfile(
            msg.sender,
            ComplianceStatus.PendingReview,
            level,
            uint64(block.timestamp + 30 days),
            metadataHash
        );
    }

    function syncFromHashKeyKyc(address account) public returns (ComplianceStatus) {
        require(address(hashKeyKycSbt) != address(0), "hashkey kyc not configured");

        (ComplianceStatus status, ComplianceLevel level, bool human, uint8 kycLevel, uint8 kycStatus) =
            _deriveHashKeyKycStatus(account);

        _setProfile(
            account,
            status,
            level,
            status == ComplianceStatus.Approved ? type(uint64).max : uint64(block.timestamp + 30 days),
            keccak256(abi.encodePacked("hashkey-kyc", account, kycLevel, kycStatus))
        );

        emit HashKeyKycSynced(account, human, kycLevel, kycStatus);
        return status;
    }

    function syncMyHashKeyKyc() external returns (ComplianceStatus) {
        return syncFromHashKeyKyc(msg.sender);
    }

    function getProfile(address account) external view returns (ComplianceProfile memory) {
        ComplianceProfile memory profile = profiles[account];
        (bool configured, ComplianceStatus status, ComplianceLevel level) = _previewHashKeyKyc(account);
        if (configured) {
            profile.status = status;
            profile.level = level;
        } else {
            profile.status = _status(account);
        }
        return profile;
    }

    function getStatus(address account) external view override returns (ComplianceStatus) {
        (bool configured, ComplianceStatus status,) = _previewHashKeyKyc(account);
        if (configured && !selfServeEnabled) {
            return status;
        }
        if (configured && status != ComplianceStatus.None) {
            return status;
        }
        return _status(account);
    }

    function isApproved(address account) external view override returns (bool) {
        (bool configured, ComplianceStatus status,) = _previewHashKeyKyc(account);
        if (configured && !selfServeEnabled) {
            return status == ComplianceStatus.Approved;
        }
        if (configured && status == ComplianceStatus.Approved) {
            return true;
        }
        return _status(account) == ComplianceStatus.Approved;
    }

    function _status(address account) internal view returns (ComplianceStatus) {
        ComplianceProfile memory profile = profiles[account];

        if (
            profile.status == ComplianceStatus.Approved &&
            profile.expiresAt != 0 &&
            profile.expiresAt < block.timestamp
        ) {
            return ComplianceStatus.Expired;
        }

        return profile.status;
    }

    function _previewHashKeyKyc(
        address account
    ) internal view returns (bool configured, ComplianceStatus status, ComplianceLevel level) {
        if (address(hashKeyKycSbt) == address(0)) {
            return (false, ComplianceStatus.None, ComplianceLevel.Standard);
        }

        (status, level,,,) = _deriveHashKeyKycStatus(account);
        return (true, status, level);
    }

    function _deriveHashKeyKycStatus(
        address account
    )
        internal
        view
        returns (ComplianceStatus status, ComplianceLevel level, bool human, uint8 kycLevel, uint8 kycStatus)
    {
        (human, kycLevel) = hashKeyKycSbt.isHuman(account);
        (, IHashKeyKycSBT.KycLevel rawLevel, IHashKeyKycSBT.KycStatus rawStatus,) = hashKeyKycSbt.getKycInfo(account);

        kycLevel = uint8(rawLevel);
        kycStatus = uint8(rawStatus);
        level = _mapKycLevel(rawLevel);

        if (rawStatus == IHashKeyKycSBT.KycStatus.REVOKED) {
            return (ComplianceStatus.Restricted, level, human, kycLevel, kycStatus);
        }

        if (rawStatus == IHashKeyKycSBT.KycStatus.APPROVED && human && rawLevel != IHashKeyKycSBT.KycLevel.NONE) {
            return (ComplianceStatus.Approved, level, human, kycLevel, kycStatus);
        }

        if (rawStatus == IHashKeyKycSBT.KycStatus.APPROVED && !human) {
            return (ComplianceStatus.PendingReview, level, human, kycLevel, kycStatus);
        }

        return (ComplianceStatus.None, level, human, kycLevel, kycStatus);
    }

    function _mapKycLevel(IHashKeyKycSBT.KycLevel rawLevel) internal pure returns (ComplianceLevel) {
        if (rawLevel == IHashKeyKycSBT.KycLevel.ULTIMATE) {
            return ComplianceLevel.Institutional;
        }

        if (
            rawLevel == IHashKeyKycSBT.KycLevel.ADVANCED ||
            rawLevel == IHashKeyKycSBT.KycLevel.PREMIUM
        ) {
            return ComplianceLevel.Enhanced;
        }

        return ComplianceLevel.Standard;
    }

    function _setProfile(
        address account,
        ComplianceStatus status,
        ComplianceLevel level,
        uint64 expiresAt,
        bytes32 metadataHash
    ) internal {
        profiles[account] = ComplianceProfile({
            status: status,
            level: level,
            reviewedAt: uint64(block.timestamp),
            expiresAt: expiresAt,
            metadataHash: metadataHash
        });

        emit ComplianceUpdated(account, status, level, expiresAt, metadataHash);
    }
}
