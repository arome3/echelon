// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";
import "../src/ReputationRegistry.sol";
import "../src/interfaces/IERC8004Reputation.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract ReputationRegistryTest is Test, IERC721Receiver {
    AgentRegistry public agentRegistry;
    ReputationRegistry public reputationRegistry;

    /// @notice ERC721 receiver callback
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    address public owner = address(this);
    address public client1 = address(0x1);
    address public client2 = address(0x2);
    address public agentWallet = address(0x100);

    bytes32 public constant TAG_EXECUTION = keccak256("EXECUTION");
    bytes32 public constant TAG_DCA = keccak256("DCA");
    bytes32 public constant TAG_YIELD = keccak256("YIELD");

    uint256 public agentId;

    function setUp() public {
        // Deploy registries
        agentRegistry = new AgentRegistry();
        reputationRegistry = new ReputationRegistry(address(agentRegistry));

        // Register an agent for testing
        agentId = agentRegistry.registerAgent(
            agentWallet,
            "Test Agent",
            "DCA",
            5,
            "ipfs://test"
        );
    }

    // ============ Basic Feedback Tests ============

    function test_GiveFeedback() public {
        vm.prank(client1);
        reputationRegistry.giveFeedback(
            agentId,
            85,
            TAG_EXECUTION,
            TAG_DCA,
            "",
            bytes32(0),
            ""
        );

        // Verify feedback was stored
        (uint8 score, bytes32 tag1, bytes32 tag2, bool isRevoked) = reputationRegistry.readFeedback(
            agentId,
            client1,
            0
        );

        assertEq(score, 85);
        assertEq(tag1, TAG_EXECUTION);
        assertEq(tag2, TAG_DCA);
        assertFalse(isRevoked);
    }

    function test_GiveFeedback_EmitsEvent() public {
        vm.prank(client1);

        vm.expectEmit(true, true, true, true);
        emit IERC8004Reputation.NewFeedback(
            agentId,
            client1,
            85,
            TAG_EXECUTION,
            TAG_DCA,
            "ipfs://feedback",
            bytes32(uint256(123))
        );

        reputationRegistry.giveFeedback(
            agentId,
            85,
            TAG_EXECUTION,
            TAG_DCA,
            "ipfs://feedback",
            bytes32(uint256(123)),
            ""
        );
    }

    function test_GiveFeedback_MultipleFeedbacks() public {
        vm.startPrank(client1);

        // Give multiple feedbacks
        reputationRegistry.giveFeedback(agentId, 80, TAG_EXECUTION, TAG_DCA, "", bytes32(0), "");
        reputationRegistry.giveFeedback(agentId, 90, TAG_EXECUTION, TAG_DCA, "", bytes32(0), "");
        reputationRegistry.giveFeedback(agentId, 70, TAG_EXECUTION, TAG_DCA, "", bytes32(0), "");

        vm.stopPrank();

        // Verify count
        uint256 count = reputationRegistry.getFeedbackCount(agentId, client1);
        assertEq(count, 3);

        // Verify last index
        uint64 lastIndex = reputationRegistry.getLastIndex(agentId, client1);
        assertEq(lastIndex, 2);
    }

    function test_RevertWhen_GiveFeedback_InvalidAgent() public {
        vm.prank(client1);
        vm.expectRevert("Agent does not exist");
        reputationRegistry.giveFeedback(
            999, // Non-existent agent
            85,
            TAG_EXECUTION,
            TAG_DCA,
            "",
            bytes32(0),
            ""
        );
    }

    function test_RevertWhen_GiveFeedback_ScoreTooHigh() public {
        vm.prank(client1);
        vm.expectRevert("Score exceeds maximum");
        reputationRegistry.giveFeedback(
            agentId,
            101, // Over max
            TAG_EXECUTION,
            TAG_DCA,
            "",
            bytes32(0),
            ""
        );
    }

    // ============ Revocation Tests ============

    function test_RevokeFeedback() public {
        vm.startPrank(client1);

        // Give feedback
        reputationRegistry.giveFeedback(agentId, 85, TAG_EXECUTION, TAG_DCA, "", bytes32(0), "");

        // Revoke it
        reputationRegistry.revokeFeedback(agentId, 0);

        vm.stopPrank();

        // Verify it's revoked
        (,, , bool isRevoked) = reputationRegistry.readFeedback(agentId, client1, 0);
        assertTrue(isRevoked);
    }

    function test_RevokeFeedback_EmitsEvent() public {
        vm.startPrank(client1);

        reputationRegistry.giveFeedback(agentId, 85, TAG_EXECUTION, TAG_DCA, "", bytes32(0), "");

        vm.expectEmit(true, true, true, true);
        emit IERC8004Reputation.FeedbackRevoked(agentId, client1, 0);

        reputationRegistry.revokeFeedback(agentId, 0);

        vm.stopPrank();
    }

    function test_RevertWhen_RevokeFeedback_InvalidIndex() public {
        vm.prank(client1);
        vm.expectRevert("Invalid feedback index");
        reputationRegistry.revokeFeedback(agentId, 0); // No feedback exists
    }

    function test_RevertWhen_RevokeFeedback_AlreadyRevoked() public {
        vm.startPrank(client1);

        reputationRegistry.giveFeedback(agentId, 85, TAG_EXECUTION, TAG_DCA, "", bytes32(0), "");
        reputationRegistry.revokeFeedback(agentId, 0);
        vm.expectRevert("Already revoked");
        reputationRegistry.revokeFeedback(agentId, 0); // Should fail

        vm.stopPrank();
    }

    // ============ Response Tests ============

    function test_AppendResponse() public {
        vm.prank(client1);
        reputationRegistry.giveFeedback(agentId, 85, TAG_EXECUTION, TAG_DCA, "", bytes32(0), "");

        // Agent owner responds
        reputationRegistry.appendResponse(
            agentId,
            client1,
            0,
            "ipfs://response",
            bytes32(uint256(456))
        );

        // Verify response count
        address[] memory empty = new address[](0);
        uint64 count = reputationRegistry.getResponseCount(agentId, client1, 0, empty);
        assertEq(count, 1);
    }

    function test_AppendResponse_EmitsEvent() public {
        vm.prank(client1);
        reputationRegistry.giveFeedback(agentId, 85, TAG_EXECUTION, TAG_DCA, "", bytes32(0), "");

        vm.expectEmit(true, true, false, true);
        emit IERC8004Reputation.ResponseAppended(
            agentId,
            client1,
            0,
            owner,
            "ipfs://response"
        );

        reputationRegistry.appendResponse(
            agentId,
            client1,
            0,
            "ipfs://response",
            bytes32(uint256(456))
        );
    }

    // ============ Summary Tests ============

    function test_GetSummary() public {
        // Multiple clients give feedback
        vm.prank(client1);
        reputationRegistry.giveFeedback(agentId, 80, TAG_EXECUTION, TAG_DCA, "", bytes32(0), "");

        vm.prank(client2);
        reputationRegistry.giveFeedback(agentId, 100, TAG_EXECUTION, TAG_DCA, "", bytes32(0), "");

        // Get summary
        address[] memory empty = new address[](0);
        (uint64 count, uint8 avgScore) = reputationRegistry.getSummary(
            agentId,
            empty,
            bytes32(0),
            bytes32(0)
        );

        assertEq(count, 2);
        assertEq(avgScore, 90); // (80 + 100) / 2
    }

    function test_GetSummary_ExcludesRevoked() public {
        vm.startPrank(client1);
        reputationRegistry.giveFeedback(agentId, 80, TAG_EXECUTION, TAG_DCA, "", bytes32(0), "");
        reputationRegistry.giveFeedback(agentId, 100, TAG_EXECUTION, TAG_DCA, "", bytes32(0), "");

        // Revoke first feedback
        reputationRegistry.revokeFeedback(agentId, 0);
        vm.stopPrank();

        // Get summary - should only count the non-revoked feedback
        address[] memory empty = new address[](0);
        (uint64 count, uint8 avgScore) = reputationRegistry.getSummary(
            agentId,
            empty,
            bytes32(0),
            bytes32(0)
        );

        assertEq(count, 1);
        assertEq(avgScore, 100);
    }

    function test_GetSummary_FilterByTag() public {
        vm.startPrank(client1);
        reputationRegistry.giveFeedback(agentId, 80, TAG_EXECUTION, TAG_DCA, "", bytes32(0), "");
        reputationRegistry.giveFeedback(agentId, 60, TAG_EXECUTION, TAG_YIELD, "", bytes32(0), "");
        vm.stopPrank();

        // Get summary filtered by DCA tag
        address[] memory empty = new address[](0);
        (uint64 count, uint8 avgScore) = reputationRegistry.getSummary(
            agentId,
            empty,
            bytes32(0),
            TAG_DCA
        );

        assertEq(count, 1);
        assertEq(avgScore, 80);
    }

    function test_GetSummary_FilterByClient() public {
        vm.prank(client1);
        reputationRegistry.giveFeedback(agentId, 80, TAG_EXECUTION, TAG_DCA, "", bytes32(0), "");

        vm.prank(client2);
        reputationRegistry.giveFeedback(agentId, 100, TAG_EXECUTION, TAG_DCA, "", bytes32(0), "");

        // Get summary only for client1
        address[] memory clients = new address[](1);
        clients[0] = client1;

        (uint64 count, uint8 avgScore) = reputationRegistry.getSummary(
            agentId,
            clients,
            bytes32(0),
            bytes32(0)
        );

        assertEq(count, 1);
        assertEq(avgScore, 80);
    }

    // ============ Query Tests ============

    function test_GetClients() public {
        vm.prank(client1);
        reputationRegistry.giveFeedback(agentId, 80, TAG_EXECUTION, TAG_DCA, "", bytes32(0), "");

        vm.prank(client2);
        reputationRegistry.giveFeedback(agentId, 90, TAG_EXECUTION, TAG_DCA, "", bytes32(0), "");

        address[] memory clients = reputationRegistry.getClients(agentId);
        assertEq(clients.length, 2);
        assertEq(clients[0], client1);
        assertEq(clients[1], client2);
    }

    function test_GetDetailedFeedback() public {
        vm.prank(client1);
        reputationRegistry.giveFeedback(
            agentId,
            85,
            TAG_EXECUTION,
            TAG_DCA,
            "ipfs://details",
            bytes32(uint256(789)),
            ""
        );

        (
            uint8 score,
            bytes32 tag1,
            bytes32 tag2,
            string memory fileuri,
            bytes32 filehash,
            bool isRevoked,
            uint256 timestamp
        ) = reputationRegistry.getDetailedFeedback(agentId, client1, 0);

        assertEq(score, 85);
        assertEq(tag1, TAG_EXECUTION);
        assertEq(tag2, TAG_DCA);
        assertEq(fileuri, "ipfs://details");
        assertEq(filehash, bytes32(uint256(789)));
        assertFalse(isRevoked);
        assertGt(timestamp, 0);
    }

    function test_ReadAllFeedback() public {
        vm.startPrank(client1);
        reputationRegistry.giveFeedback(agentId, 80, TAG_EXECUTION, TAG_DCA, "", bytes32(0), "");
        reputationRegistry.giveFeedback(agentId, 90, TAG_EXECUTION, TAG_YIELD, "", bytes32(0), "");
        vm.stopPrank();

        address[] memory empty = new address[](0);
        (
            address[] memory clientAddrs,
            uint8[] memory scores,
            bytes32[] memory tag1s,
            bytes32[] memory tag2s,
            bool[] memory revokedStatuses
        ) = reputationRegistry.readAllFeedback(
            agentId,
            empty,
            bytes32(0),
            bytes32(0),
            true
        );

        assertEq(clientAddrs.length, 2);
        assertEq(scores[0], 80);
        assertEq(scores[1], 90);
        assertEq(tag2s[0], TAG_DCA);
        assertEq(tag2s[1], TAG_YIELD);
    }

    // ============ Identity Registry Tests ============

    function test_GetIdentityRegistry() public view {
        assertEq(reputationRegistry.getIdentityRegistry(), address(agentRegistry));
    }

    // ============ Fuzz Tests ============

    function testFuzz_GiveFeedback_ValidScores(uint8 score) public {
        vm.assume(score <= 100);

        vm.prank(client1);
        reputationRegistry.giveFeedback(
            agentId,
            score,
            TAG_EXECUTION,
            TAG_DCA,
            "",
            bytes32(0),
            ""
        );

        (uint8 storedScore,,,) = reputationRegistry.readFeedback(agentId, client1, 0);
        assertEq(storedScore, score);
    }

    function testFuzz_GiveFeedback_AnyTags(bytes32 tag1, bytes32 tag2) public {
        vm.prank(client1);
        reputationRegistry.giveFeedback(agentId, 85, tag1, tag2, "", bytes32(0), "");

        (, bytes32 storedTag1, bytes32 storedTag2,) = reputationRegistry.readFeedback(
            agentId,
            client1,
            0
        );
        assertEq(storedTag1, tag1);
        assertEq(storedTag2, tag2);
    }
}
