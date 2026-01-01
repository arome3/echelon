// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/PermissionRegistry.sol";

/**
 * @title DeployPermissionRegistry
 * @notice Deployment script for PermissionRegistry contract only
 */
contract DeployPermissionRegistry is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy PermissionRegistry
        PermissionRegistry permissionRegistry = new PermissionRegistry();
        console.log("PermissionRegistry deployed to:", address(permissionRegistry));

        vm.stopBroadcast();

        // Log deployment info
        console.log("\n=== PermissionRegistry Deployment ===");
        console.log("Network: Sepolia");
        console.log("Address:", address(permissionRegistry));
        console.log("");
        console.log("Add to your .env:");
        console.log("NEXT_PUBLIC_PERMISSION_REGISTRY_ADDRESS=%s", address(permissionRegistry));
    }
}
