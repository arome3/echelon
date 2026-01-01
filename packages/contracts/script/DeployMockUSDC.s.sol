// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDC} from "../src/MockUSDC.sol";

/**
 * @title DeployMockUSDC
 * @notice Deploys MockUSDC for testing
 *
 * Usage:
 *   forge script script/DeployMockUSDC.s.sol:DeployMockUSDCScript \
 *     --rpc-url $SEPOLIA_RPC_URL --broadcast --verify
 */
contract DeployMockUSDCScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // Deploy MockUSDC
        MockUSDC usdc = new MockUSDC();

        console.log("=== MOCK USDC DEPLOYED ===");
        console.log("Address:", address(usdc));
        console.log("Name:", usdc.name());
        console.log("Symbol:", usdc.symbol());
        console.log("Decimals:", usdc.decimals());
        console.log("Deployer Balance:", usdc.balanceOf(msg.sender) / 1e6, "USDC");
        console.log("");
        console.log("Add to frontend .env:");
        console.log("NEXT_PUBLIC_USDC_ADDRESS=", address(usdc));
        console.log("");
        console.log("To mint more tokens:");
        console.log("cast send", address(usdc), "faucet(uint256)" "1000" "--rpc-url $SEPOLIA_RPC_URL --private-key $PRIVATE_KEY");

        vm.stopBroadcast();
    }
}
