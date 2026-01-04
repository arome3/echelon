// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentExecution.sol";
import "../src/interfaces/IAgentExecution.sol";

/**
 * @title SimulateAgent5Executions
 * @notice Simulates trade executions for MomentumMaster (Agent 5)
 * @dev Run with: forge script script/SimulateAgent5Executions.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast
 */
contract SimulateAgent5Executions is Script {
    // Deployed contract addresses on Sepolia
    address constant EXECUTION = 0x861F841b1c2EB3756E3C00840e04B9393330eDF8;

    // Token addresses
    address constant USDC = 0x2BfBc55F4A360352Dc89e599D04898F150472cA6;
    address constant WETH = 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9;

    // Demo user address
    address constant DEMO_USER = 0x000000000000000000000000000000000000dEaD;

    function run() external {
        // Load agent 5 private key
        uint256 agent5Key = vm.envUint("AGENT_5_PRIVATE_KEY");

        AgentExecution execution = AgentExecution(EXECUTION);

        console.log("=== Simulating MomentumMaster Executions ===");
        console.log("");

        // ============================================
        // Agent 5: MomentumMaster - 70% win rate, momentum style
        // ============================================
        console.log("Agent 5: MomentumMaster (Momentum Strategy)");
        vm.startBroadcast(agent5Key);

        // 7 wins, 3 losses (momentum trading with larger moves)
        _simulateTrade(execution, DEMO_USER, 800e6, 920e6, true);    // +15% (caught uptrend)
        _simulateTrade(execution, DEMO_USER, 800e6, 880e6, true);    // +10%
        _simulateTrade(execution, DEMO_USER, 800e6, 720e6, false);   // -10% (trend reversal)
        _simulateTrade(execution, DEMO_USER, 800e6, 960e6, true);    // +20% (strong momentum)
        _simulateTrade(execution, DEMO_USER, 800e6, 850e6, true);    // +6.25%
        _simulateTrade(execution, DEMO_USER, 800e6, 700e6, false);   // -12.5% (whipsaw)
        _simulateTrade(execution, DEMO_USER, 800e6, 900e6, true);    // +12.5%
        _simulateTrade(execution, DEMO_USER, 800e6, 680e6, false);   // -15% (false breakout)
        _simulateTrade(execution, DEMO_USER, 800e6, 1000e6, true);   // +25% (big trend)
        _simulateTrade(execution, DEMO_USER, 800e6, 870e6, true);    // +8.75%

        vm.stopBroadcast();
        console.log("  Completed 10 trades (7 wins, 3 losses)");
        console.log("");

        console.log("=== Execution Simulation Complete ===");
        console.log("");
        console.log("MomentumMaster: 10 trades, 70% win rate");
        console.log("");
        console.log("The indexer will compute reputation scores shortly");
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
