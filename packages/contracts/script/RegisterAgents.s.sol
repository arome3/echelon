// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";

/**
 * @title RegisterAgents
 * @notice Registers demo agents for hackathon demonstration
 * @dev Run with: forge script script/RegisterAgents.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast
 *
 * Agent Structure:
 * - Deployer wallet (PRIVATE_KEY) = Fund Manager (pure orchestrator, no trades)
 * - AGENT_1 = AlphaYield (Yield specialist, VERIFIED)
 * - AGENT_2 = ArbitrageKing (Arbitrage specialist)
 * - AGENT_3 = DCAWizard (DCA specialist)
 * - AGENT_4 = MomentumMaster (Momentum specialist)
 */
contract RegisterAgents is Script {
    // Will be set after deployment
    address public REGISTRY;

    function run() external {
        // Get registry address from environment (set after Deploy.s.sol)
        REGISTRY = vm.envAddress("REGISTRY_ADDRESS");

        // Load private keys from environment
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        uint256 agent1Key = vm.envUint("AGENT_1_PRIVATE_KEY");
        uint256 agent2Key = vm.envUint("AGENT_2_PRIVATE_KEY");
        uint256 agent3Key = vm.envUint("AGENT_3_PRIVATE_KEY");
        uint256 agent4Key = vm.envUint("AGENT_4_PRIVATE_KEY");

        // Derive wallet addresses from private keys
        address deployerWallet = vm.addr(deployerKey);
        address agent1Wallet = vm.addr(agent1Key);
        address agent2Wallet = vm.addr(agent2Key);
        address agent3Wallet = vm.addr(agent3Key);
        address agent4Wallet = vm.addr(agent4Key);

        console.log("=== Echelon Demo Agent Registration ===");
        console.log("");
        console.log("Registry:", REGISTRY);
        console.log("");
        console.log("Fund Manager Wallet (Deployer):", deployerWallet);
        console.log("Agent 1 Wallet (AlphaYield):", agent1Wallet);
        console.log("Agent 2 Wallet (ArbitrageKing):", agent2Wallet);
        console.log("Agent 3 Wallet (DCAWizard):", agent3Wallet);
        console.log("Agent 4 Wallet (MomentumMaster):", agent4Wallet);
        console.log("");

        AgentRegistry registry = AgentRegistry(REGISTRY);

        vm.startBroadcast(deployerKey);

        // ============================================
        // Fund Manager: Echelon Fund Manager (Pure Orchestrator)
        // Uses DEPLOYER wallet - orchestrates specialists, does NOT trade directly
        // ============================================
        uint256 fundManagerId = registry.registerAgent(
            deployerWallet,
            "Echelon Fund Manager",
            "MeanReversion", // Strategy type for orchestrator
            5, // Medium risk - balanced portfolio allocation
            "ipfs://QmFundManager"
        );
        console.log("Registered Fund Manager (ID:", fundManagerId, ") - Pure Orchestrator");

        // ============================================
        // Agent 1: AlphaYield (Yield Specialist)
        // ============================================
        uint256 agent1Id = registry.registerAgent(
            agent1Wallet,
            "AlphaYield",
            "Yield",
            7, // Higher risk - aggressive yield farming
            "ipfs://QmAlphaYield"
        );
        console.log("Registered AlphaYield (ID:", agent1Id, ")");

        // ============================================
        // Agent 2: ArbitrageKing (Arbitrage Specialist)
        // ============================================
        uint256 agent2Id = registry.registerAgent(
            agent2Wallet,
            "ArbitrageKing",
            "Arbitrage",
            8, // High risk - fast-paced arbitrage
            "ipfs://QmArbitrageKing"
        );
        console.log("Registered ArbitrageKing (ID:", agent2Id, ")");

        // ============================================
        // Agent 3: DCAWizard (DCA Specialist)
        // ============================================
        uint256 agent3Id = registry.registerAgent(
            agent3Wallet,
            "DCAWizard",
            "DCA",
            3, // Low risk - steady accumulation
            "ipfs://QmDCAWizard"
        );
        console.log("Registered DCAWizard (ID:", agent3Id, ")");

        // ============================================
        // Agent 4: MomentumMaster (Momentum Specialist)
        // ============================================
        uint256 agent4Id = registry.registerAgent(
            agent4Wallet,
            "MomentumMaster",
            "Momentum",
            6, // Medium-high risk - trend following
            "ipfs://QmMomentumMaster"
        );
        console.log("Registered MomentumMaster (ID:", agent4Id, ")");

        // Set Fund Manager as orchestrator (orchestration badge)
        registry.setAgentOrchestrator(fundManagerId, true);
        console.log("");
        console.log("Fund Manager set as orchestrator (orchestration badge)");

        // Verify AlphaYield as platform-verified specialist
        registry.setAgentVerified(agent1Id, true);
        console.log("AlphaYield verified as platform-verified specialist");

        vm.stopBroadcast();

        console.log("");
        console.log("=== Registration Complete ===");
        console.log("Total agents registered: 5 (1 Fund Manager + 4 Specialists)");
        console.log("Fund Manager: Orchestrator badge (no trades)");
        console.log("AlphaYield: Verified badge (trading specialist)");
        console.log("");
        console.log("Agent IDs:");
        console.log("  Fund Manager: ID", fundManagerId);
        console.log("  AlphaYield:   ID", agent1Id);
        console.log("  ArbitrageKing: ID", agent2Id);
        console.log("  DCAWizard:    ID", agent3Id);
        console.log("  MomentumMaster: ID", agent4Id);
    }
}
