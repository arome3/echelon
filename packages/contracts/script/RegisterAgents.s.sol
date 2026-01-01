// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";

/**
 * @title RegisterAgents
 * @notice Registers demo agents for hackathon demonstration
 * @dev Run with: forge script script/RegisterAgents.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast
 */
contract RegisterAgents is Script {
    // Deployed AgentRegistry address on Sepolia
    address constant REGISTRY = 0xCCf3E485bc5339C651f4fbb8F3c37881c0D0e704;

    function run() external {
        // Load private keys from environment
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        uint256 agent1Key = vm.envUint("AGENT_1_PRIVATE_KEY");
        uint256 agent2Key = vm.envUint("AGENT_2_PRIVATE_KEY");
        uint256 agent3Key = vm.envUint("AGENT_3_PRIVATE_KEY");
        uint256 agent4Key = vm.envUint("AGENT_4_PRIVATE_KEY");

        // Derive wallet addresses from private keys
        address agent1Wallet = vm.addr(agent1Key);
        address agent2Wallet = vm.addr(agent2Key);
        address agent3Wallet = vm.addr(agent3Key);
        address agent4Wallet = vm.addr(agent4Key);

        console.log("=== Echelon Demo Agent Registration ===");
        console.log("");
        console.log("Agent 1 Wallet:", agent1Wallet);
        console.log("Agent 2 Wallet:", agent2Wallet);
        console.log("Agent 3 Wallet:", agent3Wallet);
        console.log("Agent 4 Wallet:", agent4Wallet);
        console.log("");

        AgentRegistry registry = AgentRegistry(REGISTRY);

        vm.startBroadcast(deployerKey);

        // ============================================
        // Agent 1: Echelon Fund Manager (A2A Manager)
        // ============================================
        // This is the main Fund Manager that users delegate to
        // It then re-delegates to specialist agents (A2A flow)
        uint256 agent1Id = registry.registerAgent(
            agent1Wallet,
            "Echelon Fund Manager",
            "Yield",
            5,  // Medium risk - balanced portfolio
            "ipfs://QmFundManager"
        );
        console.log("Registered Agent 1: Echelon Fund Manager (ID:", agent1Id, ")");

        // ============================================
        // Agent 2: AlphaYield (Yield Specialist)
        // ============================================
        // Specialist agent that Fund Manager delegates yield strategies to
        uint256 agent2Id = registry.registerAgent(
            agent2Wallet,
            "AlphaYield",
            "Yield",
            7,  // Higher risk - aggressive yield farming
            "ipfs://QmAlphaYield"
        );
        console.log("Registered Agent 2: AlphaYield (ID:", agent2Id, ")");

        // ============================================
        // Agent 3: ArbitrageKing (Arbitrage Specialist)
        // ============================================
        // Specialist for cross-DEX arbitrage opportunities
        uint256 agent3Id = registry.registerAgent(
            agent3Wallet,
            "ArbitrageKing",
            "Arbitrage",
            8,  // High risk - fast-paced arbitrage
            "ipfs://QmArbitrageKing"
        );
        console.log("Registered Agent 3: ArbitrageKing (ID:", agent3Id, ")");

        // ============================================
        // Agent 4: DCAWizard (DCA Specialist)
        // ============================================
        // Specialist for dollar-cost averaging strategies
        uint256 agent4Id = registry.registerAgent(
            agent4Wallet,
            "DCAWizard",
            "DCA",
            3,  // Low risk - steady accumulation
            "ipfs://QmDCAWizard"
        );
        console.log("Registered Agent 4: DCAWizard (ID:", agent4Id, ")");

        // Verify Fund Manager for trust badge
        registry.setAgentVerified(agent1Id, true);
        console.log("");
        console.log("Fund Manager verified with trust badge");

        vm.stopBroadcast();

        console.log("");
        console.log("=== Registration Complete ===");
        console.log("Total agents registered: 4");
        console.log("");
        console.log("Next steps:");
        console.log("1. Run SimulateExecutions.s.sol to create execution history");
        console.log("2. Start Envio indexer to index events");
        console.log("3. Verify leaderboard shows agents with reputation scores");
    }
}
