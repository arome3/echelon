// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDC
 * @notice Mock USDC token for testing - anyone can mint
 * @dev 6 decimals like real USDC
 */
contract MockUSDC is ERC20 {
    uint8 private constant DECIMALS = 6;

    constructor() ERC20("Mock USDC", "USDC") {
        // Mint 1M USDC to deployer for initial distribution
        _mint(msg.sender, 1_000_000 * 10 ** DECIMALS);
    }

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /**
     * @notice Mint tokens to any address - for testing only
     * @param to Address to mint to
     * @param amount Amount to mint (in smallest units, 6 decimals)
     */
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    /**
     * @notice Mint tokens to caller - convenience function
     * @param amount Amount to mint (in whole USDC, will be converted to 6 decimals)
     */
    function faucet(uint256 amount) external {
        _mint(msg.sender, amount * 10 ** DECIMALS);
    }
}
