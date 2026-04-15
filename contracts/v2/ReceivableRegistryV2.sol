// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IComplianceGate.sol";

contract ReceivableRegistryV2 is Ownable {
    enum ReceivableStatus {
        Draft,
        Issued,
        BuyerAcknowledged,
        FinanceEligible,
        Funded,
        Paid,
        Cleared,
        Overdue,
        Disputed,
        Rejected
    }

    struct Receivable {
        address seller;
        address buyer;
        uint256 amount;
        uint256 requestedAdvance;
        uint256 holdbackBps;
        uint64 issueDate;
        uint64 dueDate;
        bytes32 metadataHash;
        string referenceCode;
        ReceivableStatus status;
        bool buyerAcknowledged;
    }

    IComplianceGate public immutable complianceGate;
    uint256 public receivableCount;
    mapping(uint256 => Receivable) private receivables;
    mapping(address => bool) public operators;

    event ReceivableCreated(uint256 indexed receivableId, address indexed seller, address indexed buyer);
    event ReceivableStatusChanged(uint256 indexed receivableId, ReceivableStatus status);
    event OperatorUpdated(address indexed operator, bool approved);

    modifier onlyOperator() {
        require(operators[msg.sender] || msg.sender == owner(), "not operator");
        _;
    }

    constructor(address admin, address complianceGateAddress) Ownable(admin) {
        complianceGate = IComplianceGate(complianceGateAddress);
    }

    function setOperator(address operator, bool approved) external onlyOwner {
        operators[operator] = approved;
        emit OperatorUpdated(operator, approved);
    }

    function getReceivable(uint256 receivableId) external view returns (Receivable memory) {
        return receivables[receivableId];
    }

    function createReceivable(
        address buyer,
        uint256 amount,
        uint256 requestedAdvance,
        uint256 holdbackBps,
        uint64 issueDate,
        uint64 dueDate,
        bytes32 metadataHash,
        string calldata referenceCode
    ) external returns (uint256 receivableId) {
        require(complianceGate.isApproved(msg.sender), "seller not approved");
        require(buyer != address(0), "buyer required");
        require(amount > 0, "amount required");
        require(requestedAdvance <= amount, "advance exceeds amount");
        require(issueDate <= dueDate, "invalid dates");
        require(holdbackBps <= 2_500, "holdback too high");

        receivableId = ++receivableCount;
        receivables[receivableId] = Receivable({
            seller: msg.sender,
            buyer: buyer,
            amount: amount,
            requestedAdvance: requestedAdvance,
            holdbackBps: holdbackBps,
            issueDate: issueDate,
            dueDate: dueDate,
            metadataHash: metadataHash,
            referenceCode: referenceCode,
            status: ReceivableStatus.Issued,
            buyerAcknowledged: false
        });

        emit ReceivableCreated(receivableId, msg.sender, buyer);
        emit ReceivableStatusChanged(receivableId, ReceivableStatus.Issued);
    }

    function acknowledgeReceivable(uint256 receivableId, bool approved) external {
        Receivable storage receivable = receivables[receivableId];
        require(msg.sender == receivable.buyer, "only buyer");
        require(complianceGate.isApproved(msg.sender), "buyer not approved");
        require(receivable.status == ReceivableStatus.Issued, "invalid state");

        if (!approved) {
            receivable.status = ReceivableStatus.Rejected;
            emit ReceivableStatusChanged(receivableId, ReceivableStatus.Rejected);
            return;
        }

        receivable.buyerAcknowledged = true;
        receivable.status = ReceivableStatus.BuyerAcknowledged;
        emit ReceivableStatusChanged(receivableId, ReceivableStatus.BuyerAcknowledged);

        if (complianceGate.isApproved(receivable.seller)) {
            receivable.status = ReceivableStatus.FinanceEligible;
            emit ReceivableStatusChanged(receivableId, ReceivableStatus.FinanceEligible);
        }
    }

    function markFunded(uint256 receivableId) external onlyOperator {
        require(
            receivables[receivableId].status == ReceivableStatus.FinanceEligible,
            "not eligible"
        );
        receivables[receivableId].status = ReceivableStatus.Funded;
        emit ReceivableStatusChanged(receivableId, ReceivableStatus.Funded);
    }

    function markPaid(uint256 receivableId) external onlyOperator {
        Receivable storage receivable = receivables[receivableId];
        require(
            receivable.status == ReceivableStatus.Funded ||
                receivable.status == ReceivableStatus.FinanceEligible ||
                receivable.status == ReceivableStatus.Overdue ||
                receivable.status == ReceivableStatus.Disputed,
            "invalid state"
        );
        receivable.status = ReceivableStatus.Paid;
        emit ReceivableStatusChanged(receivableId, ReceivableStatus.Paid);
    }

    function markCleared(uint256 receivableId) external onlyOperator {
        require(receivables[receivableId].status == ReceivableStatus.Paid, "not paid");
        receivables[receivableId].status = ReceivableStatus.Cleared;
        emit ReceivableStatusChanged(receivableId, ReceivableStatus.Cleared);
    }

    function markDisputed(uint256 receivableId) external onlyOperator {
        Receivable storage receivable = receivables[receivableId];
        require(
            receivable.status != ReceivableStatus.Cleared &&
                receivable.status != ReceivableStatus.Rejected,
            "terminal state"
        );
        receivable.status = ReceivableStatus.Disputed;
        emit ReceivableStatusChanged(receivableId, ReceivableStatus.Disputed);
    }

    function restoreFinanceEligible(uint256 receivableId) external onlyOperator {
        Receivable storage receivable = receivables[receivableId];
        require(receivable.buyerAcknowledged, "buyer ack missing");
        receivable.status = ReceivableStatus.FinanceEligible;
        emit ReceivableStatusChanged(receivableId, ReceivableStatus.FinanceEligible);
    }

    function markOverdue(uint256 receivableId) external {
        Receivable storage receivable = receivables[receivableId];
        require(block.timestamp > receivable.dueDate, "not overdue");
        require(
            receivable.status == ReceivableStatus.Funded ||
                receivable.status == ReceivableStatus.FinanceEligible,
            "invalid state"
        );
        receivable.status = ReceivableStatus.Overdue;
        emit ReceivableStatusChanged(receivableId, ReceivableStatus.Overdue);
    }

    function setStatus(uint256 receivableId, ReceivableStatus status) external onlyOwner {
        receivables[receivableId].status = status;
        emit ReceivableStatusChanged(receivableId, status);
    }
}
