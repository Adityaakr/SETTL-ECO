// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IComplianceGate.sol";
import "./ReceivableRegistryV2.sol";
import "./ReputationV2.sol";

contract AdvanceEngineV2 is Ownable {
    struct FundingPosition {
        address provider;
        uint256 advanceAmount;
        uint256 expectedRepaymentAmount;
        uint64 fundedAt;
        uint16 yieldBps;
        bool repaid;
    }

    IERC20 public immutable asset;
    IComplianceGate public immutable complianceGate;
    ReceivableRegistryV2 public immutable receivableRegistry;
    ReputationV2 public immutable reputation;
    uint16 public immutable defaultYieldBps;

    mapping(uint256 => FundingPosition) private positions;
    mapping(address => bool) public operators;

    event OperatorUpdated(address indexed operator, bool approved);
    event ReceivableFunded(
        uint256 indexed receivableId,
        address indexed provider,
        uint256 advanceAmount,
        uint256 expectedRepaymentAmount
    );
    event FundingPositionRepaid(uint256 indexed receivableId, address indexed provider);

    modifier onlyOperator() {
        require(operators[msg.sender] || msg.sender == owner(), "not operator");
        _;
    }

    constructor(
        address admin,
        address assetAddress,
        address complianceGateAddress,
        address receivableRegistryAddress,
        address reputationAddress,
        uint16 defaultYieldBps_
    ) Ownable(admin) {
        asset = IERC20(assetAddress);
        complianceGate = IComplianceGate(complianceGateAddress);
        receivableRegistry = ReceivableRegistryV2(receivableRegistryAddress);
        reputation = ReputationV2(reputationAddress);
        defaultYieldBps = defaultYieldBps_;
    }

    function setOperator(address operator, bool approved) external onlyOwner {
        operators[operator] = approved;
        emit OperatorUpdated(operator, approved);
    }

    function getFundingPosition(uint256 receivableId) external view returns (FundingPosition memory) {
        return positions[receivableId];
    }

    function getExpectedRepayment(uint256 receivableId) public view returns (uint256) {
        FundingPosition memory position = positions[receivableId];
        return position.expectedRepaymentAmount;
    }

    function fundReceivable(uint256 receivableId) external {
        require(complianceGate.isApproved(msg.sender), "lp not approved");

        ReceivableRegistryV2.Receivable memory receivable = receivableRegistry.getReceivable(receivableId);
        require(
            receivable.status == ReceivableRegistryV2.ReceivableStatus.FinanceEligible,
            "not finance eligible"
        );
        require(positions[receivableId].provider == address(0), "already funded");
        require(receivable.requestedAdvance > 0, "advance unavailable");

        uint256 expectedRepaymentAmount = receivable.requestedAdvance +
            ((receivable.requestedAdvance * defaultYieldBps) / 10_000);

        positions[receivableId] = FundingPosition({
            provider: msg.sender,
            advanceAmount: receivable.requestedAdvance,
            expectedRepaymentAmount: expectedRepaymentAmount,
            fundedAt: uint64(block.timestamp),
            yieldBps: defaultYieldBps,
            repaid: false
        });

        require(
            asset.transferFrom(msg.sender, receivable.seller, receivable.requestedAdvance),
            "transfer failed"
        );

        receivableRegistry.markFunded(receivableId);
        reputation.recordFunding(receivable.seller, receivable.buyer, msg.sender, receivable.requestedAdvance);

        emit ReceivableFunded(
            receivableId,
            msg.sender,
            receivable.requestedAdvance,
            expectedRepaymentAmount
        );
    }

    function markRepaid(uint256 receivableId) external onlyOperator {
        FundingPosition storage position = positions[receivableId];
        require(position.provider != address(0), "position missing");
        position.repaid = true;

        emit FundingPositionRepaid(receivableId, position.provider);
    }
}
