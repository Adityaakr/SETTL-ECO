// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ReceivableRegistryV2.sol";
import "./ReputationV2.sol";

contract DisputeEscrow is Ownable {
    enum DisputeStatus {
        None,
        UnderReview,
        Resolved
    }

    struct DisputeRecord {
        uint256 receivableId;
        address openedBy;
        DisputeStatus status;
        bytes32 reasonHash;
        bytes32 resolutionHash;
        uint64 openedAt;
        uint64 updatedAt;
    }

    ReceivableRegistryV2 public immutable receivableRegistry;
    ReputationV2 public immutable reputation;
    mapping(uint256 => DisputeRecord) private disputes;

    event DisputeOpened(uint256 indexed receivableId, address indexed openedBy, bytes32 reasonHash);
    event DisputeResolved(uint256 indexed receivableId, bytes32 resolutionHash);

    constructor(
        address admin,
        address receivableRegistryAddress,
        address reputationAddress
    ) Ownable(admin) {
        receivableRegistry = ReceivableRegistryV2(receivableRegistryAddress);
        reputation = ReputationV2(reputationAddress);
    }

    function getDispute(uint256 receivableId) external view returns (DisputeRecord memory) {
        return disputes[receivableId];
    }

    function openDispute(uint256 receivableId, bytes32 reasonHash) external {
        ReceivableRegistryV2.Receivable memory receivable = receivableRegistry.getReceivable(receivableId);
        require(
            msg.sender == receivable.buyer || msg.sender == receivable.seller,
            "not party"
        );

        disputes[receivableId] = DisputeRecord({
            receivableId: receivableId,
            openedBy: msg.sender,
            status: DisputeStatus.UnderReview,
            reasonHash: reasonHash,
            resolutionHash: bytes32(0),
            openedAt: uint64(block.timestamp),
            updatedAt: uint64(block.timestamp)
        });

        receivableRegistry.markDisputed(receivableId);
        reputation.recordDispute(receivable.seller, receivable.buyer);
        emit DisputeOpened(receivableId, msg.sender, reasonHash);
    }

    function resolveDispute(
        uint256 receivableId,
        bool restoreToPaid,
        bytes32 resolutionHash
    ) external {
        DisputeRecord storage dispute = disputes[receivableId];
        require(dispute.status == DisputeStatus.UnderReview, "not open");

        ReceivableRegistryV2.Receivable memory receivable = receivableRegistry.getReceivable(receivableId);
        require(
            msg.sender == owner() ||
                msg.sender == dispute.openedBy ||
                msg.sender == receivable.seller ||
                msg.sender == receivable.buyer,
            "not resolver"
        );

        dispute.status = DisputeStatus.Resolved;
        dispute.resolutionHash = resolutionHash;
        dispute.updatedAt = uint64(block.timestamp);

        if (restoreToPaid) {
            receivableRegistry.markPaid(receivableId);
        } else {
            receivableRegistry.restoreFinanceEligible(receivableId);
        }

        emit DisputeResolved(receivableId, resolutionHash);
    }
}
