// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IComplianceGate.sol";

contract FundingPoolV2 is Ownable {
    IERC20 public immutable asset;
    IComplianceGate public immutable complianceGate;
    mapping(address => uint256) public balances;
    uint256 public totalLiquidity;

    event LiquidityDeposited(address indexed provider, uint256 amount);
    event LiquidityWithdrawn(address indexed provider, uint256 amount);

    constructor(address admin, address complianceGateAddress, address assetAddress) Ownable(admin) {
        asset = IERC20(assetAddress);
        complianceGate = IComplianceGate(complianceGateAddress);
    }

    function deposit(uint256 amount) external {
        require(complianceGate.isApproved(msg.sender), "lp not approved");
        require(amount > 0, "amount required");
        require(asset.transferFrom(msg.sender, address(this), amount), "transfer failed");

        balances[msg.sender] += amount;
        totalLiquidity += amount;

        emit LiquidityDeposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "amount required");
        require(balances[msg.sender] >= amount, "insufficient balance");

        balances[msg.sender] -= amount;
        totalLiquidity -= amount;

        require(asset.transfer(msg.sender, amount), "transfer failed");
        emit LiquidityWithdrawn(msg.sender, amount);
    }
}
