// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import "../src/AgentRegistry.sol";

/**
 * @title RegisterMockAgentsScript
 * @notice Registers mock agents for demo purposes
 */
contract RegisterMockAgentsScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address registryAddress = vm.envAddress("NEXT_PUBLIC_REGISTRY_ADDRESS");

        AgentRegistry registry = AgentRegistry(registryAddress);

        vm.startBroadcast(deployerPrivateKey);

        // Generate mock wallet addresses
        address wallet1 = address(uint160(uint256(keccak256("agent1"))));
        address wallet2 = address(uint160(uint256(keccak256("agent2"))));
        address wallet3 = address(uint160(uint256(keccak256("agent3"))));
        address wallet4 = address(uint160(uint256(keccak256("agent4"))));
        address wallet5 = address(uint160(uint256(keccak256("agent5"))));

        // Register Agent 1: Alpha DCA Bot
        uint256 agentId1 =
            registry.registerAgent(wallet1, "Alpha DCA Bot", "DCA", 3, "ipfs://QmAlphaDCA");
        console.log("Registered Alpha DCA Bot, ID:", agentId1);

        // Register Agent 2: Arb Master
        uint256 agentId2 =
            registry.registerAgent(wallet2, "Arb Master", "Arbitrage", 6, "ipfs://QmArbMaster");
        console.log("Registered Arb Master, ID:", agentId2);

        // Register Agent 3: Yield Optimizer Pro
        uint256 agentId3 = registry.registerAgent(
            wallet3, "Yield Optimizer Pro", "Yield", 5, "ipfs://QmYieldPro"
        );
        console.log("Registered Yield Optimizer Pro, ID:", agentId3);

        // Register Agent 4: Momentum Trader
        uint256 agentId4 = registry.registerAgent(
            wallet4, "Momentum Trader", "Momentum", 8, "ipfs://QmMomentum"
        );
        console.log("Registered Momentum Trader, ID:", agentId4);

        // Register Agent 5: Grid Bot Alpha
        uint256 agentId5 = registry.registerAgent(
            wallet5, "Grid Bot Alpha", "GridTrading", 4, "ipfs://QmGridBot"
        );
        console.log("Registered Grid Bot Alpha, ID:", agentId5);

        vm.stopBroadcast();

        console.log("\n=== Mock Agents Registered ===");
        console.log("Total agents:", registry.totalAgents());
    }
}
