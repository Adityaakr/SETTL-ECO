// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title DemoUSDC
 * @notice Demo USDC faucet token for SETTL platform testing
 * @dev Anyone can mint on the configured test chain for product walkthroughs.
 */
contract DemoUSDC is ERC20, Ownable {
    uint8 private constant DECIMALS = 6;
    uint256 public immutable allowedChainId;

    constructor(address initialOwner, uint256 chainId_) ERC20("USDC", "USDC") Ownable(initialOwner) {
        allowedChainId = chainId_;
    }

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    function mint(address to, uint256 amount) external {
        require(
            block.chainid == allowedChainId || block.chainid == 31337,
            "DemoUSDC: Unsupported chain"
        );
        _mint(to, amount);
    }

    function batchMint(address[] calldata recipients, uint256[] calldata amounts) external {
        require(
            block.chainid == allowedChainId || block.chainid == 31337,
            "DemoUSDC: Unsupported chain"
        );
        require(recipients.length == amounts.length, "DemoUSDC: Length mismatch");

        for (uint256 i = 0; i < recipients.length; i++) {
            _mint(recipients[i], amounts[i]);
        }
    }
}
