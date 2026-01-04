// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";

/**
 * @title RegisterAgent5
 * @notice Registers the 5th specialist agent (MomentumMaster)
 * @dev Run with: forge script script/RegisterAgent5.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast
 */
contract RegisterAgent5 is Script {
    // Deployed AgentRegistry address on Sepolia
    address constant REGISTRY = 0xCCf3E485bc5339C651f4fbb8F3c37881c0D0e704;

    function run() external {
        // Load private keys from environment
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        uint256 agent5Key = vm.envUint("AGENT_5_PRIVATE_KEY");

        // Derive wallet address from private key
        address agent5Wallet = vm.addr(agent5Key);

        console.log("=== Registering Agent 5: MomentumMaster ===");
        console.log("");
        console.log("Agent 5 Wallet:", agent5Wallet);
        console.log("");

        AgentRegistry registry = AgentRegistry(REGISTRY);

        vm.startBroadcast(deployerKey);

        // ============================================
        // Agent 5: MomentumMaster (Momentum Specialist)
        // ============================================
        // Specialist for trend-following momentum strategies
        uint256 agent5Id = registry.registerAgent(
            agent5Wallet,
            "MomentumMaster",
            "Momentum",
            6,  // Medium-high risk - trend following
            "ipfs://QmMomentumMaster"
        );
        console.log("Registered Agent 5: MomentumMaster (ID:", agent5Id, ")");

        vm.stopBroadcast();

        console.log("");
        console.log("=== Registration Complete ===");
        console.log("MomentumMaster is now available in the leaderboard");
    }
}
