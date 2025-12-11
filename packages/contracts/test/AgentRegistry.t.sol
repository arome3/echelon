// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";

contract AgentRegistryTest is Test {
    AgentRegistry public registry;

    address public owner = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public agentWallet1 = address(0x100);
    address public agentWallet2 = address(0x200);

    function setUp() public {
        registry = new AgentRegistry();
    }

    // ============ Registration Tests ============

    function test_RegisterAgent() public {
        vm.prank(user1);
        uint256 agentId = registry.registerAgent(
            agentWallet1,
            "Test Agent",
            "DCA",
            5,
            "ipfs://test"
        );

        assertEq(agentId, 1);
        assertEq(registry.totalAgents(), 1);
        assertTrue(registry.isRegisteredAgent(agentWallet1));
        assertEq(registry.walletToAgentId(agentWallet1), 1);

        // Check NFT ownership
        assertEq(registry.ownerOf(agentId), user1);
    }

    function test_RegisterAgent_EmitsEvent() public {
        vm.prank(user1);

        vm.expectEmit(true, true, false, true);
        emit AgentRegistry.AgentRegistered(1, agentWallet1, "Test Agent", "DCA", 5);

        registry.registerAgent(agentWallet1, "Test Agent", "DCA", 5, "ipfs://test");
    }

    function testFail_RegisterAgent_DuplicateWallet() public {
        registry.registerAgent(agentWallet1, "Agent 1", "DCA", 5, "ipfs://test1");
        registry.registerAgent(agentWallet1, "Agent 2", "Yield", 3, "ipfs://test2");
    }

    function testFail_RegisterAgent_InvalidWallet() public {
        registry.registerAgent(address(0), "Test", "DCA", 5, "ipfs://test");
    }

    function testFail_RegisterAgent_NameTooShort() public {
        registry.registerAgent(agentWallet1, "AB", "DCA", 5, "ipfs://test");
    }

    function testFail_RegisterAgent_InvalidStrategy() public {
        registry.registerAgent(agentWallet1, "Test Agent", "InvalidStrategy", 5, "ipfs://test");
    }

    function testFail_RegisterAgent_InvalidRiskLevel() public {
        registry.registerAgent(agentWallet1, "Test Agent", "DCA", 0, "ipfs://test");
    }

    function testFail_RegisterAgent_RiskLevelTooHigh() public {
        registry.registerAgent(agentWallet1, "Test Agent", "DCA", 11, "ipfs://test");
    }

    // ============ Metadata Tests ============

    function test_UpdateAgentMetadata() public {
        vm.startPrank(user1);
        uint256 agentId = registry.registerAgent(
            agentWallet1,
            "Test Agent",
            "DCA",
            5,
            "ipfs://original"
        );

        registry.updateAgentMetadata(agentId, "ipfs://updated");
        vm.stopPrank();

        assertEq(registry.tokenURI(agentId), "ipfs://updated");
    }

    function testFail_UpdateAgentMetadata_NotOwner() public {
        vm.prank(user1);
        uint256 agentId = registry.registerAgent(
            agentWallet1,
            "Test Agent",
            "DCA",
            5,
            "ipfs://test"
        );

        vm.prank(user2);
        registry.updateAgentMetadata(agentId, "ipfs://malicious");
    }

    // ============ Activation Tests ============

    function test_DeactivateAgent() public {
        vm.startPrank(user1);
        uint256 agentId = registry.registerAgent(
            agentWallet1,
            "Test Agent",
            "DCA",
            5,
            "ipfs://test"
        );

        registry.deactivateAgent(agentId);
        vm.stopPrank();

        IAgentRegistry.AgentMetadata memory meta = registry.agents(agentId);
        assertFalse(meta.isActive);
    }

    function test_ReactivateAgent() public {
        vm.startPrank(user1);
        uint256 agentId = registry.registerAgent(
            agentWallet1,
            "Test Agent",
            "DCA",
            5,
            "ipfs://test"
        );

        registry.deactivateAgent(agentId);
        registry.reactivateAgent(agentId);
        vm.stopPrank();

        IAgentRegistry.AgentMetadata memory meta = registry.agents(agentId);
        assertTrue(meta.isActive);
    }

    function testFail_DeactivateAgent_NotOwner() public {
        vm.prank(user1);
        uint256 agentId = registry.registerAgent(
            agentWallet1,
            "Test Agent",
            "DCA",
            5,
            "ipfs://test"
        );

        vm.prank(user2);
        registry.deactivateAgent(agentId);
    }

    // ============ Query Tests ============

    function test_GetAgentByWallet() public {
        vm.prank(user1);
        registry.registerAgent(agentWallet1, "Test Agent", "DCA", 5, "ipfs://test");

        (uint256 agentId, IAgentRegistry.AgentMetadata memory meta) = registry.getAgentByWallet(
            agentWallet1
        );

        assertEq(agentId, 1);
        assertEq(meta.walletAddress, agentWallet1);
        assertEq(meta.name, "Test Agent");
        assertEq(meta.strategyType, "DCA");
        assertEq(meta.riskLevel, 5);
        assertTrue(meta.isActive);
    }

    function test_GetAgentsByOwner() public {
        vm.startPrank(user1);
        registry.registerAgent(agentWallet1, "Agent 1", "DCA", 5, "ipfs://test1");
        registry.registerAgent(agentWallet2, "Agent 2", "Yield", 3, "ipfs://test2");
        vm.stopPrank();

        uint256[] memory agentIds = registry.getAgentsByOwner(user1);
        assertEq(agentIds.length, 2);
        assertEq(agentIds[0], 1);
        assertEq(agentIds[1], 2);
    }

    function test_GetActiveAgents() public {
        vm.startPrank(user1);
        registry.registerAgent(agentWallet1, "Agent 1", "DCA", 5, "ipfs://test1");
        registry.registerAgent(agentWallet2, "Agent 2", "Yield", 3, "ipfs://test2");
        registry.deactivateAgent(1);
        vm.stopPrank();

        uint256[] memory activeAgents = registry.getActiveAgents(0, 10);
        assertEq(activeAgents.length, 1);
        assertEq(activeAgents[0], 2);
    }

    // ============ Admin Tests ============

    function test_AddStrategyType() public {
        registry.addStrategyType("NewStrategy");
        assertTrue(registry.validStrategyTypes("NewStrategy"));
    }

    function test_RemoveStrategyType() public {
        registry.removeStrategyType("DCA");
        assertFalse(registry.validStrategyTypes("DCA"));
    }

    function testFail_AddStrategyType_NotOwner() public {
        vm.prank(user1);
        registry.addStrategyType("NewStrategy");
    }

    // ============ Fuzz Tests ============

    function testFuzz_RegisterAgent_RiskLevel(uint8 riskLevel) public {
        vm.assume(riskLevel >= 1 && riskLevel <= 10);

        uint256 agentId = registry.registerAgent(
            agentWallet1,
            "Test Agent",
            "DCA",
            riskLevel,
            "ipfs://test"
        );

        IAgentRegistry.AgentMetadata memory meta = registry.agents(agentId);
        assertEq(meta.riskLevel, riskLevel);
    }
}
