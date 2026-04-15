// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract ReputationV2 is Ownable {
    struct ReputationProfile {
        uint256 totalSettledVolume;
        uint256 totalFinancedVolume;
        uint256 totalSettlements;
        uint256 onTimeSettlements;
        uint256 disputeCount;
        uint256 clearedReceivables;
        uint256 historicalAdvanceCount;
        uint256 counterpartyReliability;
        uint256 recommendedAdvanceBps;
    }

    mapping(address => ReputationProfile) private profiles;
    mapping(address => bool) public operators;

    event OperatorUpdated(address indexed operator, bool approved);
    event FundingRecorded(address indexed seller, address indexed provider, uint256 amount);
    event SettlementRecorded(address indexed seller, address indexed buyer, uint256 amount, bool onTime, bool cleared);
    event DisputeRecorded(address indexed seller, address indexed buyer);

    modifier onlyOperator() {
        require(operators[msg.sender] || msg.sender == owner(), "not operator");
        _;
    }

    constructor(address admin) Ownable(admin) {}

    function setOperator(address operator, bool approved) external onlyOwner {
        operators[operator] = approved;
        emit OperatorUpdated(operator, approved);
    }

    function getProfile(address account) external view returns (ReputationProfile memory) {
        return profiles[account];
    }

    function recordFunding(
        address seller,
        address buyer,
        address provider,
        uint256 amount
    ) external onlyOperator {
        ReputationProfile storage sellerProfile = profiles[seller];
        sellerProfile.totalFinancedVolume += amount;
        sellerProfile.historicalAdvanceCount += 1;
        sellerProfile.recommendedAdvanceBps = _recommendedAdvanceBps(sellerProfile);

        ReputationProfile storage providerProfile = profiles[provider];
        providerProfile.totalFinancedVolume += amount;

        profiles[buyer].counterpartyReliability += 1;

        emit FundingRecorded(seller, provider, amount);
    }

    function recordSettlement(
        address seller,
        address buyer,
        address provider,
        uint256 grossAmount,
        bool onTime,
        bool cleared
    ) external onlyOperator {
        ReputationProfile storage sellerProfile = profiles[seller];
        sellerProfile.totalSettledVolume += grossAmount;
        sellerProfile.totalSettlements += 1;
        if (onTime) {
            sellerProfile.onTimeSettlements += 1;
        }
        if (cleared) {
            sellerProfile.clearedReceivables += 1;
        }
        sellerProfile.recommendedAdvanceBps = _recommendedAdvanceBps(sellerProfile);

        ReputationProfile storage buyerProfile = profiles[buyer];
        buyerProfile.totalSettledVolume += grossAmount;
        buyerProfile.totalSettlements += 1;
        if (onTime) {
            buyerProfile.onTimeSettlements += 1;
        }
        if (cleared) {
            buyerProfile.clearedReceivables += 1;
        }
        buyerProfile.counterpartyReliability += 1;
        buyerProfile.recommendedAdvanceBps = _recommendedAdvanceBps(buyerProfile);

        profiles[provider].totalSettledVolume += grossAmount;

        emit SettlementRecorded(seller, buyer, grossAmount, onTime, cleared);
    }

    function recordDispute(address seller, address buyer) external onlyOperator {
        profiles[seller].disputeCount += 1;
        profiles[seller].recommendedAdvanceBps = _recommendedAdvanceBps(profiles[seller]);

        profiles[buyer].disputeCount += 1;
        profiles[buyer].recommendedAdvanceBps = _recommendedAdvanceBps(profiles[buyer]);

        emit DisputeRecorded(seller, buyer);
    }

    function _recommendedAdvanceBps(
        ReputationProfile memory profile
    ) internal pure returns (uint256) {
        if (profile.totalSettlements == 0) {
            return 6500;
        }

        uint256 onTimeRateBps = (profile.onTimeSettlements * 10_000) / profile.totalSettlements;
        uint256 penaltyBps = profile.disputeCount * 150;

        if (onTimeRateBps >= 9_500 && penaltyBps < 500) {
            return 8_000;
        }

        if (onTimeRateBps >= 8_500 && penaltyBps < 1_000) {
            return 7_300;
        }

        return 6_200;
    }
}
