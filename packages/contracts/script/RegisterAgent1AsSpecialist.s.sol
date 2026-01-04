// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";

/**
 * @title RegisterAgent1AsSpecialist
 * @notice Registers AGENT_1 wallet as a specialist (GridGuru) since it was
 *         incorrectly used as Fund Manager in the original script.
 *         The deployer wallet should be Fund Manager, and AGENT_1-4 should be specialists.
 */
contract RegisterAgent1AsSpecialist is Script {
    address constant REGISTRY = 0xCCf3E485bc5339C651f4fbb8F3c37881c0D0e704;

    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        uint256 agent1Key = vm.envUint("AGENT_1_PRIVATE_KEY");

        address agent1Wallet = vm.addr(agent1Key);

        console.log("=== Registering AGENT_1 as GridGuru (4th Specialist) ===");
        console.log("AGENT_1 Wallet:", agent1Wallet);

        AgentRegistry registry = AgentRegistry(REGISTRY);

        vm.startBroadcast(deployerKey);

        // Register AGENT_1 as GridGuru - Grid Trading specialist
        uint256 agentId = registry.registerAgent(
            agent1Wallet,
            "GridGuru",
            "GridTrading",
            4,  // Medium-low risk - range-based trading
            "ipfs://QmGridGuru"
        );
        console.log("Registered GridGuru (ID:", agentId, ")");

        vm.stopBroadcast();

        console.log("");
        console.log("Now you have 5 agents: Fund Manager + 4 Specialists");
        console.log("(AlphaYield, ArbitrageKing, DCAWizard, GridGuru)");
    }
}
