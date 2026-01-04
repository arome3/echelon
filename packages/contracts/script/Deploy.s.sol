// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";
import "../src/ReputationRegistry.sol";
import "../src/ValidationRegistry.sol";
import "../src/AgentExecution.sol";
import "../src/EnvioReputationOracle.sol";
import "../src/PermissionRegistry.sol";
import "../src/enforcers/ReputationGateEnforcer.sol";

/**
 * @title DeployScript
 * @notice Deployment script for Echelon ERC-8004 compliant contracts
 */
contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy AgentRegistry (Identity Registry)
        AgentRegistry registry = new AgentRegistry();
        console.log("AgentRegistry deployed to:", address(registry));

        // 2. Deploy ReputationRegistry
        ReputationRegistry reputation = new ReputationRegistry(address(registry));
        console.log("ReputationRegistry deployed to:", address(reputation));

        // 3. Deploy ValidationRegistry
        ValidationRegistry validation = new ValidationRegistry(address(registry));
        console.log("ValidationRegistry deployed to:", address(validation));

        // 4. Deploy AgentExecution
        AgentExecution execution = new AgentExecution(address(registry));
        console.log("AgentExecution deployed to:", address(execution));

        // 5. Configure AgentExecution to use ReputationRegistry
        execution.setReputationRegistry(address(reputation));
        console.log("AgentExecution configured with ReputationRegistry");

        // Optionally enable auto-feedback (uncomment to enable)
        // execution.setAutoFeedbackEnabled(true);
        // console.log("Auto-feedback enabled");

        // 6. Deploy EnvioReputationOracle (for ERC-7715 reputation-gated permissions)
        EnvioReputationOracle oracle = new EnvioReputationOracle();
        console.log("EnvioReputationOracle deployed to:", address(oracle));

        // 7. Configure the oracle updater (set to deployer initially - update to sync service
        // later)
        address deployer = vm.addr(deployerPrivateKey);
        oracle.setEnvioUpdater(deployer);
        console.log("EnvioReputationOracle updater set to deployer:", deployer);

        // 8. Deploy ReputationGateEnforcer (custom caveat enforcer for MetaMask permissions)
        ReputationGateEnforcer enforcer = new ReputationGateEnforcer(address(oracle));
        console.log("ReputationGateEnforcer deployed to:", address(enforcer));

        // 9. Deploy PermissionRegistry (on-chain ERC-7715 permission tracking)
        PermissionRegistry permissionRegistry = new PermissionRegistry();
        console.log("PermissionRegistry deployed to:", address(permissionRegistry));

        vm.stopBroadcast();

        // Log deployment summary
        console.log("\n=== ERC-8004 Deployment Summary ===");
        console.log("Network: Sepolia");
        console.log("");
        console.log("Identity Registry (AgentRegistry):", address(registry));
        console.log("Reputation Registry:", address(reputation));
        console.log("Validation Registry:", address(validation));
        console.log("Agent Execution:", address(execution));
        console.log("");
        console.log("=== ERC-7715 Permission Scaling ===");
        console.log("Envio Reputation Oracle:", address(oracle));
        console.log("Reputation Gate Enforcer:", address(enforcer));
        console.log("");
        console.log("=== ERC-7715 Permission Registry ===");
        console.log("Permission Registry:", address(permissionRegistry));
        console.log("");
        console.log("Update your .env file with these addresses:");
        console.log("NEXT_PUBLIC_REGISTRY_ADDRESS=%s", address(registry));
        console.log("NEXT_PUBLIC_REPUTATION_ADDRESS=%s", address(reputation));
        console.log("NEXT_PUBLIC_VALIDATION_ADDRESS=%s", address(validation));
        console.log("NEXT_PUBLIC_EXECUTION_ADDRESS=%s", address(execution));
        console.log("NEXT_PUBLIC_ENVIO_ORACLE_ADDRESS=%s", address(oracle));
        console.log("NEXT_PUBLIC_REPUTATION_ENFORCER_ADDRESS=%s", address(enforcer));
        console.log("NEXT_PUBLIC_PERMISSION_REGISTRY_ADDRESS=%s", address(permissionRegistry));
    }
}
