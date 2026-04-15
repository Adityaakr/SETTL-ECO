// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract HspSettlementAdapter is Ownable {
    enum AdapterMode {
        Mock,
        Live
    }

    struct SettlementRequest {
        uint256 receivableId;
        uint256 amount;
        bytes32 settlementReference;
        AdapterMode mode;
        bool completed;
        uint64 requestedAt;
        uint64 completedAt;
    }

    mapping(uint256 => SettlementRequest) public requests;
    mapping(address => bool) public operators;

    event SettlementRequested(
        uint256 indexed receivableId,
        uint256 amount,
        bytes32 settlementReference,
        AdapterMode mode
    );
    event SettlementCompleted(uint256 indexed receivableId, bytes32 settlementReference);
    event OperatorUpdated(address indexed operator, bool approved);

    modifier onlyOperator() {
        require(operators[msg.sender] || msg.sender == owner(), "not operator");
        _;
    }

    constructor(address admin) Ownable(admin) {}

    function setOperator(address operator, bool approved) external onlyOwner {
        operators[operator] = approved;
        emit OperatorUpdated(operator, approved);
    }

    function requestSettlement(
        uint256 receivableId,
        uint256 amount,
        bytes32 settlementReference,
        AdapterMode mode
    ) external onlyOperator {
        requests[receivableId] = SettlementRequest({
            receivableId: receivableId,
            amount: amount,
            settlementReference: settlementReference,
            mode: mode,
            completed: false,
            requestedAt: uint64(block.timestamp),
            completedAt: 0
        });

        emit SettlementRequested(receivableId, amount, settlementReference, mode);
    }

    function completeSettlement(uint256 receivableId) external onlyOperator {
        SettlementRequest storage request = requests[receivableId];
        request.completed = true;
        request.completedAt = uint64(block.timestamp);
        emit SettlementCompleted(receivableId, request.settlementReference);
    }
}
