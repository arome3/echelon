// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";
import "../src/AgentExecution.sol";
import "../src/interfaces/IAgentExecution.sol";

/**
 * @title SimulateExecutions
 * @notice Simulates trade executions to populate leaderboard with reputation data
 * @dev Run with: forge script script/SimulateExecutions.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast
 *
 * This creates realistic execution history for demo purposes:
 * - Fund Manager: 80% win rate, consistent profits
 * - AlphaYield: 75% win rate, high variance
 * - ArbitrageKing: 90% win rate, small profits per trade
 * - DCAWizard: 85% win rate, steady accumulation
 */
contract SimulateExecutions is Script {
    // Deployed contract addresses on Sepolia
    address constant REGISTRY = 0xCCf3E485bc5339C651f4fbb8F3c37881c0D0e704;
    address constant EXECUTION = 0x861F841b1c2EB3756E3C00840e04B9393330eDF8;

    // Token addresses (for logging purposes)
    address constant USDC = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant WETH = 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9;

    // Demo user address (simulated delegator)
    address constant DEMO_USER = 0x000000000000000000000000000000000000dEaD;

    function run() external {
        // Load agent private keys
        uint256 agent1Key = vm.envUint("AGENT_1_PRIVATE_KEY");
        uint256 agent2Key = vm.envUint("AGENT_2_PRIVATE_KEY");
        uint256 agent3Key = vm.envUint("AGENT_3_PRIVATE_KEY");
        uint256 agent4Key = vm.envUint("AGENT_4_PRIVATE_KEY");

        AgentExecution execution = AgentExecution(EXECUTION);

        console.log("=== Simulating Agent Executions ===");
        console.log("");

        // ============================================
        // Agent 1: Fund Manager - 80% win rate
        // ============================================
        console.log("Agent 1: Echelon Fund Manager");
        vm.startBroadcast(agent1Key);

        // 8 wins, 2 losses
        _simulateTrade(execution, DEMO_USER, 1000e6, 1050e6, true);   // +5%
        _simulateTrade(execution, DEMO_USER, 1000e6, 1080e6, true);   // +8%
        _simulateTrade(execution, DEMO_USER, 1000e6, 950e6, false);   // -5%
        _simulateTrade(execution, DEMO_USER, 1000e6, 1120e6, true);   // +12%
        _simulateTrade(execution, DEMO_USER, 1000e6, 1030e6, true);   // +3%
        _simulateTrade(execution, DEMO_USER, 1000e6, 1065e6, true);   // +6.5%
        _simulateTrade(execution, DEMO_USER, 1000e6, 920e6, false);   // -8%
        _simulateTrade(execution, DEMO_USER, 1000e6, 1045e6, true);   // +4.5%
        _simulateTrade(execution, DEMO_USER, 1000e6, 1090e6, true);   // +9%
        _simulateTrade(execution, DEMO_USER, 1000e6, 1025e6, true);   // +2.5%

        vm.stopBroadcast();
        console.log("  Completed 10 trades (8 wins, 2 losses)");
        console.log("");

        // ============================================
        // Agent 2: AlphaYield - 75% win rate, high variance
        // ============================================
        console.log("Agent 2: AlphaYield");
        vm.startBroadcast(agent2Key);

        // 6 wins, 2 losses (high variance)
        _simulateTrade(execution, DEMO_USER, 500e6, 650e6, true);    // +30%
        _simulateTrade(execution, DEMO_USER, 500e6, 400e6, false);   // -20%
        _simulateTrade(execution, DEMO_USER, 500e6, 580e6, true);    // +16%
        _simulateTrade(execution, DEMO_USER, 500e6, 620e6, true);    // +24%
        _simulateTrade(execution, DEMO_USER, 500e6, 350e6, false);   // -30%
        _simulateTrade(execution, DEMO_USER, 500e6, 700e6, true);    // +40%
        _simulateTrade(execution, DEMO_USER, 500e6, 550e6, true);    // +10%
        _simulateTrade(execution, DEMO_USER, 500e6, 590e6, true);    // +18%

        vm.stopBroadcast();
        console.log("  Completed 8 trades (6 wins, 2 losses)");
        console.log("");

        // ============================================
        // Agent 3: ArbitrageKing - 90% win rate, small profits
        // ============================================
        console.log("Agent 3: ArbitrageKing");
        vm.startBroadcast(agent3Key);

        // 9 wins, 1 loss (small but consistent)
        _simulateTrade(execution, DEMO_USER, 2000e6, 2020e6, true);   // +1%
        _simulateTrade(execution, DEMO_USER, 2000e6, 2015e6, true);   // +0.75%
        _simulateTrade(execution, DEMO_USER, 2000e6, 2030e6, true);   // +1.5%
        _simulateTrade(execution, DEMO_USER, 2000e6, 2025e6, true);   // +1.25%
        _simulateTrade(execution, DEMO_USER, 2000e6, 1980e6, false);  // -1%
        _simulateTrade(execution, DEMO_USER, 2000e6, 2018e6, true);   // +0.9%
        _simulateTrade(execution, DEMO_USER, 2000e6, 2022e6, true);   // +1.1%
        _simulateTrade(execution, DEMO_USER, 2000e6, 2028e6, true);   // +1.4%
        _simulateTrade(execution, DEMO_USER, 2000e6, 2012e6, true);   // +0.6%
        _simulateTrade(execution, DEMO_USER, 2000e6, 2035e6, true);   // +1.75%

        vm.stopBroadcast();
        console.log("  Completed 10 trades (9 wins, 1 loss)");
        console.log("");

        // ============================================
        // Agent 4: DCAWizard - 85% win rate, steady
        // ============================================
        console.log("Agent 4: DCAWizard");
        vm.startBroadcast(agent4Key);

        // 6 wins, 1 loss (DCA style)
        _simulateTrade(execution, DEMO_USER, 100e6, 105e6, true);    // +5%
        _simulateTrade(execution, DEMO_USER, 100e6, 103e6, true);    // +3%
        _simulateTrade(execution, DEMO_USER, 100e6, 98e6, false);    // -2%
        _simulateTrade(execution, DEMO_USER, 100e6, 108e6, true);    // +8%
        _simulateTrade(execution, DEMO_USER, 100e6, 104e6, true);    // +4%
        _simulateTrade(execution, DEMO_USER, 100e6, 106e6, true);    // +6%
        _simulateTrade(execution, DEMO_USER, 100e6, 102e6, true);    // +2%

        vm.stopBroadcast();
        console.log("  Completed 7 trades (6 wins, 1 loss)");
        console.log("");

        console.log("=== Execution Simulation Complete ===");
        console.log("");
        console.log("Summary:");
        console.log("  Fund Manager:   10 trades, 80% win rate");
        console.log("  AlphaYield:      8 trades, 75% win rate");
        console.log("  ArbitrageKing:  10 trades, 90% win rate");
        console.log("  DCAWizard:       7 trades, 86% win rate");
        console.log("");
        console.log("Total executions: 35");
        console.log("");
        console.log("Next: Start Envio indexer to compute reputation scores");
    }

    function _simulateTrade(
        AgentExecution execution,
        address user,
        uint256 amountIn,
        uint256 amountOut,
        bool success
    ) internal {
        // Start execution
        uint256 executionId = execution.logExecutionStart(user, amountIn, USDC, WETH);

        // Complete execution
        execution.logExecutionComplete(
            executionId,
            user,
            amountIn,
            amountOut,
            success ? IAgentExecution.ExecutionResult.SUCCESS : IAgentExecution.ExecutionResult.FAILURE
        );
    }
}
