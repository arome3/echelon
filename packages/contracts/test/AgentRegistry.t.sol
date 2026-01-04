// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";
import "../src/interfaces/IAgentRegistry.sol";
import "../src/interfaces/IERC8004Identity.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract AgentRegistryTest is Test, IERC721Receiver {
    AgentRegistry public registry;

    /// @notice ERC721 receiver callback to accept NFT mints
    function onERC721Received(address, address, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return IERC721Receiver.onERC721Received.selector;
    }

    address public owner = address(this);
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public agentWallet1 = address(0x100);
    address public agentWallet2 = address(0x200);

    function setUp() public {
        registry = new AgentRegistry();
    }

    // ============ ERC-8004 Registration Tests ============

    function test_Register_WithTokenURI() public {
        vm.prank(user1);
        uint256 agentId = registry.register("ipfs://agent-metadata");

        assertEq(agentId, 1);
        assertEq(registry.totalAgents(), 1);
        assertEq(registry.ownerOf(agentId), user1);
        assertEq(registry.tokenURI(agentId), "ipfs://agent-metadata");
    }

    function test_Register_WithMetadata() public {
        IERC8004Identity.MetadataEntry[] memory entries = new IERC8004Identity.MetadataEntry[](2);
        entries[0] = IERC8004Identity.MetadataEntry({ key: "name", value: abi.encode("My Agent") });
        entries[1] =
            IERC8004Identity.MetadataEntry({ key: "strategyType", value: abi.encode("DCA") });

        vm.prank(user1);
        uint256 agentId = registry.register("ipfs://agent", entries);

        assertEq(agentId, 1);

        // Verify metadata was stored
        bytes memory nameData = registry.getMetadata(agentId, "name");
        string memory name = abi.decode(nameData, (string));
        assertEq(name, "My Agent");

        bytes memory strategyData = registry.getMetadata(agentId, "strategyType");
        string memory strategy = abi.decode(strategyData, (string));
        assertEq(strategy, "DCA");
    }

    function test_Register_Empty() public {
        vm.prank(user1);
        uint256 agentId = registry.register();

        assertEq(agentId, 1);
        assertEq(registry.totalAgents(), 1);
        assertEq(registry.ownerOf(agentId), user1);
    }

    function test_Register_EmitsRegisteredEvent() public {
        vm.prank(user1);

        vm.expectEmit(true, true, false, true);
        emit IERC8004Identity.Registered(1, "ipfs://test", user1);

        registry.register("ipfs://test");
    }

    // ============ ERC-8004 Metadata Tests ============

    function test_GetMetadata() public {
        vm.prank(user1);
        uint256 agentId = registry.register("ipfs://test");

        // Set some metadata
        vm.prank(user1);
        registry.setMetadata(agentId, "customKey", abi.encode("customValue"));

        bytes memory data = registry.getMetadata(agentId, "customKey");
        string memory value = abi.decode(data, (string));
        assertEq(value, "customValue");
    }

    function test_SetMetadata() public {
        vm.prank(user1);
        uint256 agentId = registry.register("ipfs://test");

        vm.prank(user1);
        registry.setMetadata(agentId, "riskLevel", abi.encode(uint8(7)));

        bytes memory data = registry.getMetadata(agentId, "riskLevel");
        uint8 riskLevel = abi.decode(data, (uint8));
        assertEq(riskLevel, 7);
    }

    function test_SetMetadata_EmitsMetadataSetEvent() public {
        vm.prank(user1);
        uint256 agentId = registry.register("ipfs://test");

        bytes memory value = abi.encode("TestValue");
        bytes32 indexedKey = keccak256(bytes("testKey"));

        vm.prank(user1);
        vm.expectEmit(true, true, false, true);
        emit IERC8004Identity.MetadataSet(agentId, indexedKey, "testKey", value);

        registry.setMetadata(agentId, "testKey", value);
    }

    function test_SetMetadata_OnlyOwner() public {
        vm.prank(user1);
        uint256 agentId = registry.register("ipfs://test");

        vm.prank(user2);
        vm.expectRevert("Not agent owner");
        registry.setMetadata(agentId, "key", abi.encode("value"));
    }

    function test_GetMetadata_NonExistentAgent() public {
        vm.expectRevert("Agent does not exist");
        registry.getMetadata(999, "key");
    }

    function test_HasMetadata() public {
        vm.prank(user1);
        uint256 agentId = registry.register("ipfs://test");

        assertFalse(registry.hasMetadata(agentId, "customKey"));

        vm.prank(user1);
        registry.setMetadata(agentId, "customKey", abi.encode("value"));

        assertTrue(registry.hasMetadata(agentId, "customKey"));
    }

    // ============ Legacy Registration Tests (Backward Compatibility) ============

    function test_RegisterAgent() public {
        vm.prank(user1);
        uint256 agentId =
            registry.registerAgent(agentWallet1, "Test Agent", "DCA", 5, "ipfs://test");

        assertEq(agentId, 1);
        assertEq(registry.totalAgents(), 1);
        assertTrue(registry.isRegisteredAgent(agentWallet1));
        assertEq(registry.walletToAgentId(agentWallet1), 1);

        // Check NFT ownership
        assertEq(registry.ownerOf(agentId), user1);
    }

    function test_RegisterAgent_StoresAsMetadata() public {
        vm.prank(user1);
        uint256 agentId =
            registry.registerAgent(agentWallet1, "Test Agent", "DCA", 5, "ipfs://test");

        // Verify data is stored as ERC-8004 metadata
        bytes memory walletData = registry.getMetadata(agentId, "walletAddress");
        address wallet = abi.decode(walletData, (address));
        assertEq(wallet, agentWallet1);

        bytes memory nameData = registry.getMetadata(agentId, "name");
        string memory name = abi.decode(nameData, (string));
        assertEq(name, "Test Agent");

        bytes memory strategyData = registry.getMetadata(agentId, "strategyType");
        string memory strategy = abi.decode(strategyData, (string));
        assertEq(strategy, "DCA");

        bytes memory riskData = registry.getMetadata(agentId, "riskLevel");
        uint8 riskLevel = abi.decode(riskData, (uint8));
        assertEq(riskLevel, 5);

        bytes memory activeData = registry.getMetadata(agentId, "isActive");
        bool isActive = abi.decode(activeData, (bool));
        assertTrue(isActive);
    }

    function test_RegisterAgent_EmitsLegacyEvent() public {
        vm.prank(user1);

        vm.expectEmit(true, true, false, true);
        emit IAgentRegistry.AgentRegistered(1, agentWallet1, "Test Agent", "DCA", 5);

        registry.registerAgent(agentWallet1, "Test Agent", "DCA", 5, "ipfs://test");
    }

    function test_RegisterAgent_EmitsERC8004Events() public {
        vm.prank(user1);

        // Should emit both Registered and MetadataSet events
        vm.expectEmit(true, true, false, true);
        emit IERC8004Identity.Registered(1, "ipfs://test", user1);

        registry.registerAgent(agentWallet1, "Test Agent", "DCA", 5, "ipfs://test");
    }

    function test_RevertWhen_RegisterAgent_DuplicateWallet() public {
        registry.registerAgent(agentWallet1, "Agent 1", "DCA", 5, "ipfs://test1");
        vm.expectRevert("Wallet already registered");
        registry.registerAgent(agentWallet1, "Agent 2", "Yield", 3, "ipfs://test2");
    }

    function test_RevertWhen_RegisterAgent_InvalidWallet() public {
        vm.expectRevert("Invalid wallet address");
        registry.registerAgent(address(0), "Test", "DCA", 5, "ipfs://test");
    }

    function test_RevertWhen_RegisterAgent_NameTooShort() public {
        vm.expectRevert("Name too short");
        registry.registerAgent(agentWallet1, "AB", "DCA", 5, "ipfs://test");
    }

    function test_RevertWhen_RegisterAgent_InvalidStrategy() public {
        vm.expectRevert("Invalid strategy type");
        registry.registerAgent(agentWallet1, "Test Agent", "InvalidStrategy", 5, "ipfs://test");
    }

    function test_RevertWhen_RegisterAgent_InvalidRiskLevel() public {
        vm.expectRevert("Risk level must be 1-10");
        registry.registerAgent(agentWallet1, "Test Agent", "DCA", 0, "ipfs://test");
    }

    function test_RevertWhen_RegisterAgent_RiskLevelTooHigh() public {
        vm.expectRevert("Risk level must be 1-10");
        registry.registerAgent(agentWallet1, "Test Agent", "DCA", 11, "ipfs://test");
    }

    // ============ Metadata Update Tests ============

    function test_UpdateAgentMetadata() public {
        vm.startPrank(user1);
        uint256 agentId =
            registry.registerAgent(agentWallet1, "Test Agent", "DCA", 5, "ipfs://original");

        registry.updateAgentMetadata(agentId, "ipfs://updated");
        vm.stopPrank();

        assertEq(registry.tokenURI(agentId), "ipfs://updated");
    }

    function test_RevertWhen_UpdateAgentMetadata_NotOwner() public {
        vm.prank(user1);
        uint256 agentId =
            registry.registerAgent(agentWallet1, "Test Agent", "DCA", 5, "ipfs://test");

        vm.prank(user2);
        vm.expectRevert("Not agent owner");
        registry.updateAgentMetadata(agentId, "ipfs://malicious");
    }

    // ============ Activation Tests ============

    function test_DeactivateAgent() public {
        vm.startPrank(user1);
        uint256 agentId =
            registry.registerAgent(agentWallet1, "Test Agent", "DCA", 5, "ipfs://test");

        registry.deactivateAgent(agentId);
        vm.stopPrank();

        IAgentRegistry.AgentMetadata memory meta = registry.agents(agentId);
        assertFalse(meta.isActive);

        // Also verify via ERC-8004 metadata
        bytes memory activeData = registry.getMetadata(agentId, "isActive");
        bool isActive = abi.decode(activeData, (bool));
        assertFalse(isActive);
    }

    function test_ReactivateAgent() public {
        vm.startPrank(user1);
        uint256 agentId =
            registry.registerAgent(agentWallet1, "Test Agent", "DCA", 5, "ipfs://test");

        registry.deactivateAgent(agentId);
        registry.reactivateAgent(agentId);
        vm.stopPrank();

        IAgentRegistry.AgentMetadata memory meta = registry.agents(agentId);
        assertTrue(meta.isActive);
    }

    function test_RevertWhen_DeactivateAgent_NotOwner() public {
        vm.prank(user1);
        uint256 agentId =
            registry.registerAgent(agentWallet1, "Test Agent", "DCA", 5, "ipfs://test");

        vm.prank(user2);
        vm.expectRevert("Not agent owner");
        registry.deactivateAgent(agentId);
    }

    function test_RevertWhen_DeactivateAgent_AlreadyDeactivated() public {
        vm.startPrank(user1);
        uint256 agentId =
            registry.registerAgent(agentWallet1, "Test Agent", "DCA", 5, "ipfs://test");

        registry.deactivateAgent(agentId);
        vm.expectRevert("Already deactivated");
        registry.deactivateAgent(agentId); // Should fail
        vm.stopPrank();
    }

    function test_RevertWhen_ReactivateAgent_AlreadyActive() public {
        vm.startPrank(user1);
        uint256 agentId =
            registry.registerAgent(agentWallet1, "Test Agent", "DCA", 5, "ipfs://test");

        vm.expectRevert("Already active");
        registry.reactivateAgent(agentId); // Should fail - already active
        vm.stopPrank();
    }

    // ============ Query Tests ============

    function test_GetAgentByWallet() public {
        vm.prank(user1);
        registry.registerAgent(agentWallet1, "Test Agent", "DCA", 5, "ipfs://test");

        (uint256 agentId, IAgentRegistry.AgentMetadata memory meta) =
            registry.getAgentByWallet(agentWallet1);

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

    function test_GetActiveAgents_Pagination() public {
        vm.startPrank(user1);
        // Register 5 agents
        for (uint256 i = 0; i < 5; i++) {
            address wallet = address(uint160(0x100 + i));
            registry.registerAgent(wallet, "Agent", "DCA", 5, "ipfs://test");
        }
        vm.stopPrank();

        // Get first 2
        uint256[] memory first = registry.getActiveAgents(0, 2);
        assertEq(first.length, 2);
        assertEq(first[0], 1);
        assertEq(first[1], 2);

        // Get next 2
        uint256[] memory second = registry.getActiveAgents(2, 2);
        assertEq(second.length, 2);
        assertEq(second[0], 3);
        assertEq(second[1], 4);
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

    function test_RevertWhen_AddStrategyType_NotOwner() public {
        vm.prank(user1);
        vm.expectRevert();
        registry.addStrategyType("NewStrategy");
    }

    function test_RevertWhen_AddStrategyType_AlreadyExists() public {
        vm.expectRevert("Strategy type exists");
        registry.addStrategyType("DCA"); // Already exists
    }

    function test_RevertWhen_RemoveStrategyType_NotFound() public {
        vm.expectRevert("Strategy type not found");
        registry.removeStrategyType("NonExistent");
    }

    // ============ Fuzz Tests ============

    function testFuzz_RegisterAgent_RiskLevel(uint8 riskLevel) public {
        vm.assume(riskLevel >= 1 && riskLevel <= 10);

        uint256 agentId =
            registry.registerAgent(agentWallet1, "Test Agent", "DCA", riskLevel, "ipfs://test");

        IAgentRegistry.AgentMetadata memory meta = registry.agents(agentId);
        assertEq(meta.riskLevel, riskLevel);
    }

    function testFuzz_SetMetadata_AnyValue(bytes32 randomValue) public {
        vm.prank(user1);
        uint256 agentId = registry.register("ipfs://test");

        vm.prank(user1);
        registry.setMetadata(agentId, "randomKey", abi.encode(randomValue));

        bytes memory data = registry.getMetadata(agentId, "randomKey");
        bytes32 retrieved = abi.decode(data, (bytes32));
        assertEq(retrieved, randomValue);
    }

    // ============ Integration Tests ============

    function test_MixedRegistration() public {
        // Test using both ERC-8004 register() and legacy registerAgent()
        vm.startPrank(user1);

        // Use ERC-8004 register
        uint256 agent1 = registry.register("ipfs://agent1");

        // Use legacy registerAgent
        uint256 agent2 = registry.registerAgent(agentWallet1, "Agent 2", "DCA", 5, "ipfs://agent2");

        vm.stopPrank();

        assertEq(agent1, 1);
        assertEq(agent2, 2);
        assertEq(registry.totalAgents(), 2);

        // Both should be owned by user1
        assertEq(registry.ownerOf(agent1), user1);
        assertEq(registry.ownerOf(agent2), user1);
    }
}
