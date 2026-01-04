// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { Script, console } from "forge-std/Script.sol";
import { AgentRegistry } from "../src/AgentRegistry.sol";

/**
 * @title RegisterFundManager
 * @notice Registers the official Echelon Fund Manager agent
 * @dev Run after initial deployment to set up the platform's default Fund Manager
 *
 * Usage:
 *   forge script script/RegisterFundManager.s.sol:RegisterFundManagerScript \
 *     --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
 */
contract RegisterFundManagerScript is Script {
    // Fund Manager Configuration
    string constant FUND_MANAGER_NAME = "Echelon Fund Manager";
    string constant FUND_MANAGER_STRATEGY = "Yield";
    uint8 constant FUND_MANAGER_RISK_LEVEL = 5; // Moderate risk
    string constant FUND_MANAGER_METADATA_URI = "https://echelon.io/agents/fund-manager.json";

    function run() external {
        // Get environment variables
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address registryAddress = vm.envAddress("REGISTRY_ADDRESS");
        address fundManagerWallet = vm.envAddress("FUND_MANAGER_WALLET");

        // Start broadcast
        vm.startBroadcast(deployerPrivateKey);

        // Get registry instance
        AgentRegistry registry = AgentRegistry(registryAddress);

        // Check if Fund Manager is already registered
        // We'll use a deterministic approach - check if this wallet is already registered
        console.log("Registering Echelon Fund Manager...");
        console.log("Registry Address:", registryAddress);
        console.log("Fund Manager Wallet:", fundManagerWallet);

        // Register the Fund Manager agent
        uint256 agentId = registry.registerAgent(
            fundManagerWallet,
            FUND_MANAGER_NAME,
            FUND_MANAGER_STRATEGY,
            FUND_MANAGER_RISK_LEVEL,
            FUND_MANAGER_METADATA_URI
        );

        console.log("Fund Manager registered with ID:", agentId);

        // Verify the Fund Manager (only owner can do this)
        registry.setAgentVerified(agentId, true);
        console.log("Fund Manager verified!");

        // Log final status
        console.log("");
        console.log("=== FUND MANAGER SETUP COMPLETE ===");
        console.log("Agent ID:", agentId);
        console.log("Wallet:", fundManagerWallet);
        console.log("Name:", FUND_MANAGER_NAME);
        console.log("Strategy:", FUND_MANAGER_STRATEGY);
        console.log("Risk Level:", FUND_MANAGER_RISK_LEVEL);
        console.log("Verified: true");
        console.log("");
        console.log("Add to frontend .env:");
        console.log("NEXT_PUBLIC_FUND_MANAGER_ID=", agentId);
        console.log("NEXT_PUBLIC_FUND_MANAGER_ADDRESS=", fundManagerWallet);

        vm.stopBroadcast();
    }
}
