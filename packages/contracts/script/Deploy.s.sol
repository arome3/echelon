// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";
import "../src/AgentExecution.sol";

/**
 * @title DeployScript
 * @notice Deployment script for Echelon contracts
 */
contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy AgentRegistry
        AgentRegistry registry = new AgentRegistry();
        console.log("AgentRegistry deployed to:", address(registry));

        // Deploy AgentExecution
        AgentExecution execution = new AgentExecution(address(registry));
        console.log("AgentExecution deployed to:", address(execution));

        vm.stopBroadcast();

        // Log deployment summary
        console.log("\n=== Deployment Summary ===");
        console.log("Network: Sepolia");
        console.log("AgentRegistry:", address(registry));
        console.log("AgentExecution:", address(execution));
        console.log("\nUpdate your .env file with these addresses:");
        console.log("NEXT_PUBLIC_REGISTRY_ADDRESS=%s", address(registry));
        console.log("NEXT_PUBLIC_EXECUTION_ADDRESS=%s", address(execution));
    }
}
