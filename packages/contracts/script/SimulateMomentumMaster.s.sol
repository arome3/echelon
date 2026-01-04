// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentExecution.sol";
import "../src/interfaces/IAgentExecution.sol";

/**
 * @title SimulateMomentumMaster
 * @notice Simulates remaining trades for MomentumMaster only
 * @dev Run with: forge script script/SimulateMomentumMaster.s.sol --rpc-url <RPC_URL> --broadcast
 */
contract SimulateMomentumMaster is Script {
    address public EXECUTION;

    address constant USDC = 0x2BfBc55F4A360352Dc89e599D04898F150472cA6;
    address constant WETH = 0x7b79995e5f793A07Bc00c21412e50Ecae098E7f9;
    address constant DEMO_USER = 0x000000000000000000000000000000000000dEaD;

    function run() external {
        EXECUTION = vm.envAddress("EXECUTION_ADDRESS");
        uint256 agent4Key = vm.envUint("AGENT_4_PRIVATE_KEY");

        AgentExecution execution = AgentExecution(EXECUTION);

        console.log("=== Simulating MomentumMaster Remaining Trades ===");
        console.log("Execution Contract:", EXECUTION);
        console.log("");

        vm.startBroadcast(agent4Key);

        // Complete the remaining 5 trades for MomentumMaster
        // Original had 10 trades, 5 already completed
        // Remaining: trades 6-10 (3 wins, 2 losses to maintain 70% overall)
        _simulateTrade(execution, DEMO_USER, 800e6, 700e6, false); // -12.5%
        _simulateTrade(execution, DEMO_USER, 800e6, 900e6, true); // +12.5%
        _simulateTrade(execution, DEMO_USER, 800e6, 680e6, false); // -15%
        _simulateTrade(execution, DEMO_USER, 800e6, 1000e6, true); // +25%
        _simulateTrade(execution, DEMO_USER, 800e6, 870e6, true); // +8.75%

        vm.stopBroadcast();

        console.log("  Completed 5 additional trades (3 wins, 2 losses)");
        console.log("");
        console.log("=== MomentumMaster Simulation Complete ===");
        console.log("MomentumMaster should now have 10 total trades");
    }

    function _simulateTrade(
        AgentExecution execution,
        address user,
        uint256 amountIn,
        uint256 amountOut,
        bool success
    ) internal {
        uint256 executionId = execution.logExecutionStart(user, amountIn, USDC, WETH);
        execution.logExecutionComplete(
            executionId,
            user,
            amountIn,
            amountOut,
            success
                ? IAgentExecution.ExecutionResult.SUCCESS
                : IAgentExecution.ExecutionResult.FAILURE
        );
    }
}
