// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IComplianceGate.sol";
import "./AdvanceEngineV2.sol";
import "./HspSettlementAdapter.sol";
import "./ReceivableRegistryV2.sol";
import "./ReputationV2.sol";

contract SettlementRouterV2 is Ownable {
    struct SettlementRecord {
        uint256 receivableId;
        uint256 grossAmount;
        uint256 feeAmount;
        uint256 holdbackAmount;
        uint256 fundingRepaymentAmount;
        uint256 sellerNetAmount;
        bytes32 settlementReference;
        uint64 settledAt;
        bool completed;
        bool holdbackReleased;
    }

    IERC20 public immutable asset;
    IComplianceGate public immutable complianceGate;
    ReceivableRegistryV2 public immutable receivableRegistry;
    AdvanceEngineV2 public immutable advanceEngine;
    HspSettlementAdapter public immutable hspSettlementAdapter;
    ReputationV2 public immutable reputation;
    address public treasury;
    uint16 public protocolFeeBps;

    mapping(uint256 => SettlementRecord) private settlements;

    event ReceivableSettled(
        uint256 indexed receivableId,
        uint256 grossAmount,
        uint256 feeAmount,
        uint256 holdbackAmount,
        uint256 fundingRepaymentAmount,
        uint256 sellerNetAmount
    );
    event HoldbackReleased(uint256 indexed receivableId, uint256 amount);
    event TreasuryUpdated(address indexed treasury);

    constructor(
        address admin,
        address assetAddress,
        address complianceGateAddress,
        address receivableRegistryAddress,
        address advanceEngineAddress,
        address hspSettlementAdapterAddress,
        address reputationAddress,
        address treasuryAddress,
        uint16 protocolFeeBps_
    ) Ownable(admin) {
        asset = IERC20(assetAddress);
        complianceGate = IComplianceGate(complianceGateAddress);
        receivableRegistry = ReceivableRegistryV2(receivableRegistryAddress);
        advanceEngine = AdvanceEngineV2(advanceEngineAddress);
        hspSettlementAdapter = HspSettlementAdapter(hspSettlementAdapterAddress);
        reputation = ReputationV2(reputationAddress);
        treasury = treasuryAddress;
        protocolFeeBps = protocolFeeBps_;
    }

    function getSettlement(uint256 receivableId) external view returns (SettlementRecord memory) {
        return settlements[receivableId];
    }

    function setTreasury(address treasuryAddress) external onlyOwner {
        treasury = treasuryAddress;
        emit TreasuryUpdated(treasuryAddress);
    }

    function settleReceivable(
        uint256 receivableId,
        bytes32 settlementReference,
        HspSettlementAdapter.AdapterMode mode
    ) external {
        ReceivableRegistryV2.Receivable memory receivable = receivableRegistry.getReceivable(receivableId);
        require(msg.sender == receivable.buyer || msg.sender == owner(), "only buyer");
        require(complianceGate.isApproved(msg.sender), "buyer not approved");
        require(
            receivable.status == ReceivableRegistryV2.ReceivableStatus.Funded ||
                receivable.status == ReceivableRegistryV2.ReceivableStatus.FinanceEligible ||
                receivable.status == ReceivableRegistryV2.ReceivableStatus.Overdue,
            "invalid state"
        );
        require(settlements[receivableId].settledAt == 0, "already settled");

        uint256 feeAmount = (receivable.amount * protocolFeeBps) / 10_000;
        uint256 holdbackAmount = (receivable.amount * receivable.holdbackBps) / 10_000;

        AdvanceEngineV2.FundingPosition memory position = advanceEngine.getFundingPosition(receivableId);
        uint256 fundingRepaymentAmount = position.provider == address(0)
            ? 0
            : advanceEngine.getExpectedRepayment(receivableId);

        if (fundingRepaymentAmount > receivable.amount - feeAmount - holdbackAmount) {
            fundingRepaymentAmount = receivable.amount - feeAmount - holdbackAmount;
        }

        uint256 sellerNetAmount = receivable.amount -
            feeAmount -
            holdbackAmount -
            fundingRepaymentAmount;

        require(asset.transferFrom(msg.sender, address(this), receivable.amount), "transfer failed");

        if (feeAmount > 0) {
            require(asset.transfer(treasury, feeAmount), "fee transfer failed");
        }
        if (fundingRepaymentAmount > 0) {
            require(asset.transfer(position.provider, fundingRepaymentAmount), "repayment failed");
            advanceEngine.markRepaid(receivableId);
        }
        if (sellerNetAmount > 0) {
            require(asset.transfer(receivable.seller, sellerNetAmount), "seller transfer failed");
        }

        settlements[receivableId] = SettlementRecord({
            receivableId: receivableId,
            grossAmount: receivable.amount,
            feeAmount: feeAmount,
            holdbackAmount: holdbackAmount,
            fundingRepaymentAmount: fundingRepaymentAmount,
            sellerNetAmount: sellerNetAmount,
            settlementReference: settlementReference,
            settledAt: uint64(block.timestamp),
            completed: true,
            holdbackReleased: holdbackAmount == 0
        });

        hspSettlementAdapter.requestSettlement(receivableId, receivable.amount, settlementReference, mode);
        hspSettlementAdapter.completeSettlement(receivableId);

        bool onTime = block.timestamp <= receivable.dueDate;
        bool cleared = holdbackAmount == 0;

        reputation.recordSettlement(
            receivable.seller,
            receivable.buyer,
            position.provider,
            receivable.amount,
            onTime,
            cleared
        );

        receivableRegistry.markPaid(receivableId);
        if (cleared) {
            receivableRegistry.markCleared(receivableId);
        }

        emit ReceivableSettled(
            receivableId,
            receivable.amount,
            feeAmount,
            holdbackAmount,
            fundingRepaymentAmount,
            sellerNetAmount
        );
    }

    function releaseHoldback(uint256 receivableId) external {
        SettlementRecord storage record = settlements[receivableId];
        require(record.completed, "settlement missing");
        require(!record.holdbackReleased, "already released");

        ReceivableRegistryV2.Receivable memory receivable = receivableRegistry.getReceivable(receivableId);
        require(msg.sender == receivable.seller || msg.sender == owner(), "only seller");

        record.holdbackReleased = true;
        require(asset.transfer(receivable.seller, record.holdbackAmount), "holdback transfer failed");
        receivableRegistry.markCleared(receivableId);

        emit HoldbackReleased(receivableId, record.holdbackAmount);
    }

    function markOverdue(uint256 receivableId) external {
        receivableRegistry.markOverdue(receivableId);
    }
}
