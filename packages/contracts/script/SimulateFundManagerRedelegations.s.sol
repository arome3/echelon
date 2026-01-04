// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";
import "../src/AgentExecution.sol";

/**
 * @title SimulateFundManagerRedelegations
 * @notice Simulates the Fund Manager redelegating to specialist agents (A2A delegation)
 * @dev Run with: forge script script/SimulateFundManagerRedelegations.s.sol --rpc-url
 * $SEPOLIA_RPC_URL --broadcast
 *
 * This script demonstrates the Fund Manager's role as an orchestrator:
 * 1. Fund Manager receives delegations from users (User -> Fund Manager)
 * 2. Fund Manager then redelegates to specialist agents (Fund Manager -> Specialists)
 *
 * Specialist Agents:
 * - Agent 2 (AlphaYield): Yield strategy - 35% allocation
 * - Agent 3 (ArbitrageKing): Arbitrage strategy - 25% allocation
 * - Agent 4 (DCAWizard): DCA strategy - 25% allocation
 * - Agent 5 (MomentumMaster): Momentum strategy - 15% allocation
 */
contract SimulateFundManagerRedelegations is Script {
    // Will be set from environment
    address public EXECUTION;

    // Demo user address (the user who delegated to Fund Manager)
    address constant DEMO_USER = 0x1972F49278eE59DD4d9Fa20Eedc6e2099ce28253;

    // Specialist agent IDs
    uint256 constant ALPHA_YIELD_ID = 2;
    uint256 constant ARBITRAGE_KING_ID = 3;
    uint256 constant DCA_WIZARD_ID = 4;
    uint256 constant MOMENTUM_MASTER_ID = 5;

    // Total delegated amount (10,000 USDC with 6 decimals)
    uint256 constant TOTAL_DELEGATED = 10_000e6;

    // Delegation duration (7 days in seconds)
    uint256 constant DELEGATION_DURATION = 7 days;

    function run() external {
        // Get execution contract address from environment
        EXECUTION = vm.envAddress("EXECUTION_ADDRESS");

        // Load Fund Manager private key (deployer key)
        uint256 fundManagerKey = vm.envUint("PRIVATE_KEY");

        AgentExecution execution = AgentExecution(EXECUTION);

        console.log("=== Fund Manager Redelegation Simulation ===");
        console.log("Execution Contract:", EXECUTION);
        console.log("Total Amount to Redelegate:", TOTAL_DELEGATED / 1e6, "USDC");
        console.log("Duration:", DELEGATION_DURATION / 1 days, "days");
        console.log("");

        vm.startBroadcast(fundManagerKey);

        // ============================================
        // Redelegation 1: AlphaYield (35% = 3,500 USDC)
        // ============================================
        uint256 alphaAmount = (TOTAL_DELEGATED * 35) / 100;
        console.log("Redelegating to AlphaYield (Agent 2):", alphaAmount / 1e6, "USDC (35%)");
        execution.logRedelegation(ALPHA_YIELD_ID, DEMO_USER, alphaAmount, DELEGATION_DURATION);

        // ============================================
        // Redelegation 2: ArbitrageKing (25% = 2,500 USDC)
        // ============================================
        uint256 arbAmount = (TOTAL_DELEGATED * 25) / 100;
        console.log("Redelegating to ArbitrageKing (Agent 3):", arbAmount / 1e6, "USDC (25%)");
        execution.logRedelegation(ARBITRAGE_KING_ID, DEMO_USER, arbAmount, DELEGATION_DURATION);

        // ============================================
        // Redelegation 3: DCAWizard (25% = 2,500 USDC)
        // ============================================
        uint256 dcaAmount = (TOTAL_DELEGATED * 25) / 100;
        console.log("Redelegating to DCAWizard (Agent 4):", dcaAmount / 1e6, "USDC (25%)");
        execution.logRedelegation(DCA_WIZARD_ID, DEMO_USER, dcaAmount, DELEGATION_DURATION);

        // ============================================
        // Redelegation 4: MomentumMaster (15% = 1,500 USDC)
        // ============================================
        uint256 momentumAmount = (TOTAL_DELEGATED * 15) / 100;
        console.log("Redelegating to MomentumMaster (Agent 5):", momentumAmount / 1e6, "USDC (15%)");
        execution.logRedelegation(
            MOMENTUM_MASTER_ID, DEMO_USER, momentumAmount, DELEGATION_DURATION
        );

        vm.stopBroadcast();

        console.log("");
        console.log("=== Redelegation Summary ===");
        console.log("AlphaYield:      ", alphaAmount / 1e6, "USDC");
        console.log("ArbitrageKing:   ", arbAmount / 1e6, "USDC");
        console.log("DCAWizard:       ", dcaAmount / 1e6, "USDC");
        console.log("MomentumMaster:  ", momentumAmount / 1e6, "USDC");
        console.log(
            "Total:           ",
            (alphaAmount + arbAmount + dcaAmount + momentumAmount) / 1e6,
            "USDC"
        );
        console.log("");
        console.log(
            "Redelegations complete! The Fund Manager has now allocated funds to specialist agents."
        );
    }
}
