// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";
import "../src/ValidationRegistry.sol";
import "../src/interfaces/IERC8004Validation.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract ValidationRegistryTest is Test, IERC721Receiver {
    AgentRegistry public agentRegistry;
    ValidationRegistry public validationRegistry;

    /// @notice ERC721 receiver callback
    function onERC721Received(address, address, uint256, bytes calldata)
        external
        pure
        override
        returns (bytes4)
    {
        return IERC721Receiver.onERC721Received.selector;
    }

    address public owner = address(this);
    address public validator1 = address(0x1);
    address public validator2 = address(0x2);
    address public user1 = address(0x3);
    address public agentWallet = address(0x100);

    bytes32 public constant TAG_EXECUTION = keccak256("EXECUTION");
    bytes32 public constant TAG_AUDIT = keccak256("AUDIT");

    uint256 public agentId;

    function setUp() public {
        // Deploy registries
        agentRegistry = new AgentRegistry();
        validationRegistry = new ValidationRegistry(address(agentRegistry));

        // Register an agent for testing
        agentId = agentRegistry.registerAgent(agentWallet, "Test Agent", "DCA", 5, "ipfs://test");
    }

    // ============ Request Tests ============

    function test_ValidationRequest() public {
        bytes32 requestHash = keccak256("request1");

        validationRegistry.validationRequest(validator1, agentId, "ipfs://request", requestHash);

        // Verify request was created
        assertTrue(validationRegistry.requestExists(requestHash));

        (
            address validatorAddress,
            uint256 storedAgentId,
            uint8 response,
            bytes32 tag,
            uint256 lastUpdate
        ) = validationRegistry.getValidationStatus(requestHash);

        assertEq(validatorAddress, validator1);
        assertEq(storedAgentId, agentId);
        assertEq(response, 0);
        assertEq(tag, bytes32(0));
        assertGt(lastUpdate, 0);
    }

    function test_ValidationRequest_EmitsEvent() public {
        bytes32 requestHash = keccak256("request1");

        vm.expectEmit(true, true, false, true);
        emit IERC8004Validation.ValidationRequest(
            validator1, agentId, "ipfs://request", requestHash
        );

        validationRegistry.validationRequest(validator1, agentId, "ipfs://request", requestHash);
    }

    function test_RevertWhen_ValidationRequest_NotOwner() public {
        bytes32 requestHash = keccak256("request1");

        vm.prank(user1); // Not the agent owner
        vm.expectRevert("Not agent owner or operator");
        validationRegistry.validationRequest(validator1, agentId, "ipfs://request", requestHash);
    }

    function test_RevertWhen_ValidationRequest_DuplicateHash() public {
        bytes32 requestHash = keccak256("request1");

        validationRegistry.validationRequest(validator1, agentId, "ipfs://request", requestHash);

        // Try to create another request with same hash
        vm.expectRevert("Request hash already exists");
        validationRegistry.validationRequest(validator2, agentId, "ipfs://request2", requestHash);
    }

    function test_RevertWhen_ValidationRequest_InvalidAgent() public {
        bytes32 requestHash = keccak256("request1");

        vm.expectRevert("Agent does not exist");
        validationRegistry.validationRequest(
            validator1,
            999, // Non-existent agent
            "ipfs://request",
            requestHash
        );
    }

    function test_RevertWhen_ValidationRequest_InvalidValidator() public {
        bytes32 requestHash = keccak256("request1");

        vm.expectRevert("Invalid validator address");
        validationRegistry.validationRequest(
            address(0), // Invalid validator
            agentId,
            "ipfs://request",
            requestHash
        );
    }

    // ============ Response Tests ============

    function test_ValidationResponse() public {
        bytes32 requestHash = keccak256("request1");

        // Create request
        validationRegistry.validationRequest(validator1, agentId, "ipfs://request", requestHash);

        // Validator responds
        vm.prank(validator1);
        validationRegistry.validationResponse(
            requestHash, 85, "ipfs://response", bytes32(uint256(123)), TAG_EXECUTION
        );

        // Verify response
        (address validatorAddress, uint256 storedAgentId, uint8 response, bytes32 tag,) =
            validationRegistry.getValidationStatus(requestHash);

        assertEq(validatorAddress, validator1);
        assertEq(storedAgentId, agentId);
        assertEq(response, 85);
        assertEq(tag, TAG_EXECUTION);
    }

    function test_ValidationResponse_EmitsEvent() public {
        bytes32 requestHash = keccak256("request1");

        validationRegistry.validationRequest(validator1, agentId, "ipfs://request", requestHash);

        vm.prank(validator1);
        vm.expectEmit(true, true, true, true);
        emit IERC8004Validation.ValidationResponse(
            validator1, agentId, requestHash, 85, "ipfs://response", TAG_EXECUTION
        );

        validationRegistry.validationResponse(
            requestHash, 85, "ipfs://response", bytes32(uint256(123)), TAG_EXECUTION
        );
    }

    function test_RevertWhen_ValidationResponse_NotValidator() public {
        bytes32 requestHash = keccak256("request1");

        validationRegistry.validationRequest(validator1, agentId, "ipfs://request", requestHash);

        // Wrong validator tries to respond
        vm.prank(validator2);
        vm.expectRevert("Not assigned validator");
        validationRegistry.validationResponse(
            requestHash, 85, "ipfs://response", bytes32(uint256(123)), TAG_EXECUTION
        );
    }

    function test_RevertWhen_ValidationResponse_InvalidRequest() public {
        vm.prank(validator1);
        vm.expectRevert("Request does not exist");
        validationRegistry.validationResponse(
            bytes32(uint256(999)), // Non-existent request
            85,
            "ipfs://response",
            bytes32(uint256(123)),
            TAG_EXECUTION
        );
    }

    function test_RevertWhen_ValidationResponse_ResponseTooHigh() public {
        bytes32 requestHash = keccak256("request1");

        validationRegistry.validationRequest(validator1, agentId, "ipfs://request", requestHash);

        vm.prank(validator1);
        vm.expectRevert("Response exceeds maximum");
        validationRegistry.validationResponse(
            requestHash,
            101, // Over max
            "ipfs://response",
            bytes32(uint256(123)),
            TAG_EXECUTION
        );
    }

    // ============ Summary Tests ============

    function test_GetSummary() public {
        // Create multiple validation requests
        bytes32 requestHash1 = keccak256("request1");
        bytes32 requestHash2 = keccak256("request2");

        validationRegistry.validationRequest(validator1, agentId, "ipfs://r1", requestHash1);
        validationRegistry.validationRequest(validator2, agentId, "ipfs://r2", requestHash2);

        // Validators respond
        vm.prank(validator1);
        validationRegistry.validationResponse(requestHash1, 80, "", bytes32(0), TAG_EXECUTION);

        vm.prank(validator2);
        validationRegistry.validationResponse(requestHash2, 100, "", bytes32(0), TAG_EXECUTION);

        // Get summary
        address[] memory empty = new address[](0);
        (uint64 count, uint8 avgResponse) =
            validationRegistry.getSummary(agentId, empty, bytes32(0));

        assertEq(count, 2);
        assertEq(avgResponse, 90); // (80 + 100) / 2
    }

    function test_GetSummary_FilterByValidator() public {
        bytes32 requestHash1 = keccak256("request1");
        bytes32 requestHash2 = keccak256("request2");

        validationRegistry.validationRequest(validator1, agentId, "ipfs://r1", requestHash1);
        validationRegistry.validationRequest(validator2, agentId, "ipfs://r2", requestHash2);

        vm.prank(validator1);
        validationRegistry.validationResponse(requestHash1, 80, "", bytes32(0), TAG_EXECUTION);

        vm.prank(validator2);
        validationRegistry.validationResponse(requestHash2, 100, "", bytes32(0), TAG_EXECUTION);

        // Filter by validator1 only
        address[] memory validators = new address[](1);
        validators[0] = validator1;

        (uint64 count, uint8 avgResponse) =
            validationRegistry.getSummary(agentId, validators, bytes32(0));

        assertEq(count, 1);
        assertEq(avgResponse, 80);
    }

    function test_GetSummary_FilterByTag() public {
        bytes32 requestHash1 = keccak256("request1");
        bytes32 requestHash2 = keccak256("request2");

        validationRegistry.validationRequest(validator1, agentId, "ipfs://r1", requestHash1);
        validationRegistry.validationRequest(validator1, agentId, "ipfs://r2", requestHash2);

        vm.startPrank(validator1);
        validationRegistry.validationResponse(requestHash1, 80, "", bytes32(0), TAG_EXECUTION);
        validationRegistry.validationResponse(requestHash2, 60, "", bytes32(0), TAG_AUDIT);
        vm.stopPrank();

        // Filter by EXECUTION tag
        address[] memory empty = new address[](0);
        (uint64 count, uint8 avgResponse) =
            validationRegistry.getSummary(agentId, empty, TAG_EXECUTION);

        assertEq(count, 1);
        assertEq(avgResponse, 80);
    }

    function test_GetSummary_ExcludesPending() public {
        bytes32 requestHash1 = keccak256("request1");
        bytes32 requestHash2 = keccak256("request2");

        validationRegistry.validationRequest(validator1, agentId, "ipfs://r1", requestHash1);
        validationRegistry.validationRequest(validator2, agentId, "ipfs://r2", requestHash2);

        // Only validator1 responds
        vm.prank(validator1);
        validationRegistry.validationResponse(requestHash1, 80, "", bytes32(0), TAG_EXECUTION);

        // Summary should only count responded validation
        address[] memory empty = new address[](0);
        (uint64 count, uint8 avgResponse) =
            validationRegistry.getSummary(agentId, empty, bytes32(0));

        assertEq(count, 1);
        assertEq(avgResponse, 80);
    }

    // ============ Query Tests ============

    function test_GetAgentValidations() public {
        bytes32 requestHash1 = keccak256("request1");
        bytes32 requestHash2 = keccak256("request2");

        validationRegistry.validationRequest(validator1, agentId, "ipfs://r1", requestHash1);
        validationRegistry.validationRequest(validator2, agentId, "ipfs://r2", requestHash2);

        bytes32[] memory hashes = validationRegistry.getAgentValidations(agentId);
        assertEq(hashes.length, 2);
        assertEq(hashes[0], requestHash1);
        assertEq(hashes[1], requestHash2);
    }

    function test_GetValidatorRequests() public {
        bytes32 requestHash1 = keccak256("request1");
        bytes32 requestHash2 = keccak256("request2");

        validationRegistry.validationRequest(validator1, agentId, "ipfs://r1", requestHash1);
        validationRegistry.validationRequest(validator1, agentId, "ipfs://r2", requestHash2);

        bytes32[] memory hashes = validationRegistry.getValidatorRequests(validator1);
        assertEq(hashes.length, 2);
    }

    function test_GetPendingRequests() public {
        bytes32 requestHash1 = keccak256("request1");
        bytes32 requestHash2 = keccak256("request2");

        validationRegistry.validationRequest(validator1, agentId, "ipfs://r1", requestHash1);
        validationRegistry.validationRequest(validator1, agentId, "ipfs://r2", requestHash2);

        // Initially both pending
        bytes32[] memory pending = validationRegistry.getPendingRequests(validator1);
        assertEq(pending.length, 2);

        // Respond to first
        vm.prank(validator1);
        validationRegistry.validationResponse(requestHash1, 80, "", bytes32(0), TAG_EXECUTION);

        // Now only one pending
        pending = validationRegistry.getPendingRequests(validator1);
        assertEq(pending.length, 1);
        assertEq(pending[0], requestHash2);
    }

    function test_GetValidationDetails() public {
        bytes32 requestHash = keccak256("request1");

        validationRegistry.validationRequest(validator1, agentId, "ipfs://request", requestHash);

        vm.prank(validator1);
        validationRegistry.validationResponse(
            requestHash, 85, "ipfs://response", bytes32(uint256(456)), TAG_EXECUTION
        );

        (
            address validatorAddress,
            uint256 storedAgentId,
            address requester,
            string memory requestUri,
            uint8 response,
            string memory responseUri,
            bytes32 tag,
            bool hasResponse
        ) = validationRegistry.getValidationDetails(requestHash);

        assertEq(validatorAddress, validator1);
        assertEq(storedAgentId, agentId);
        assertEq(requester, owner);
        assertEq(requestUri, "ipfs://request");
        assertEq(response, 85);
        assertEq(responseUri, "ipfs://response");
        assertEq(tag, TAG_EXECUTION);
        assertTrue(hasResponse);
    }

    // ============ Identity Registry Tests ============

    function test_GetIdentityRegistry() public view {
        assertEq(validationRegistry.getIdentityRegistry(), address(agentRegistry));
    }

    // ============ Operator Tests ============

    function test_ValidationRequest_ByApprovedOperator() public {
        bytes32 requestHash = keccak256("request1");

        // Approve user1 as operator
        agentRegistry.approve(user1, agentId);

        // Operator can create validation request
        vm.prank(user1);
        validationRegistry.validationRequest(validator1, agentId, "ipfs://request", requestHash);

        assertTrue(validationRegistry.requestExists(requestHash));
    }

    // ============ Fuzz Tests ============

    function testFuzz_ValidationResponse_ValidResponses(uint8 response) public {
        vm.assume(response <= 100);

        bytes32 requestHash = keccak256(abi.encodePacked("request", response));

        validationRegistry.validationRequest(validator1, agentId, "ipfs://request", requestHash);

        vm.prank(validator1);
        validationRegistry.validationResponse(requestHash, response, "", bytes32(0), bytes32(0));

        (,, uint8 storedResponse,,) = validationRegistry.getValidationStatus(requestHash);
        assertEq(storedResponse, response);
    }

    function testFuzz_ValidationRequest_AnyRequestHash(bytes32 requestHash) public {
        vm.assume(requestHash != bytes32(0));

        validationRegistry.validationRequest(validator1, agentId, "ipfs://request", requestHash);

        assertTrue(validationRegistry.requestExists(requestHash));
    }
}
