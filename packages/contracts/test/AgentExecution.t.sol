// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentRegistry.sol";
import "../src/AgentExecution.sol";
import "../src/interfaces/IAgentExecution.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract AgentExecutionTest is Test, IERC721Receiver {
    AgentRegistry public registry;
    AgentExecution public execution;

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
    address public agentWallet1 = address(0x100);
    address public agentWallet2 = address(0x200);
    address public tokenIn = address(0xA);
    address public tokenOut = address(0xB);

    uint256 public agentId1;
    uint256 public agentId2;

    function setUp() public {
        registry = new AgentRegistry();
        execution = new AgentExecution(address(registry));

        // Register agents
        agentId1 = registry.registerAgent(agentWallet1, "Test Agent 1", "DCA", 5, "ipfs://test1");

        agentId2 =
            registry.registerAgent(agentWallet2, "Test Agent 2", "Arbitrage", 7, "ipfs://test2");
    }

    // ============ Execution Start Tests ============

    function test_LogExecutionStart() public {
        vm.prank(agentWallet1);
        uint256 executionId = execution.logExecutionStart(user1, 1000, tokenIn, tokenOut);

        assertEq(executionId, 1);
        assertTrue(execution.isExecutionPending(executionId));
        assertEq(execution.getExecutionAgent(executionId), agentWallet1);
        assertEq(execution.totalExecutions(), 1);
    }

    function test_LogExecutionStart_EmitsEvent() public {
        vm.prank(agentWallet1);

        vm.expectEmit(true, true, true, true);
        emit IAgentExecution.ExecutionStarted(1, agentId1, user1, 1000, tokenIn, tokenOut);

        execution.logExecutionStart(user1, 1000, tokenIn, tokenOut);
    }

    function test_RevertWhen_LogExecutionStart_NotRegisteredAgent() public {
        vm.prank(address(0x999));
        vm.expectRevert("Not a registered agent");
        execution.logExecutionStart(user1, 1000, tokenIn, tokenOut);
    }

    function test_RevertWhen_LogExecutionStart_InvalidUser() public {
        vm.prank(agentWallet1);
        vm.expectRevert("Invalid user address");
        execution.logExecutionStart(address(0), 1000, tokenIn, tokenOut);
    }

    function test_RevertWhen_LogExecutionStart_ZeroAmount() public {
        vm.prank(agentWallet1);
        vm.expectRevert("Amount must be positive");
        execution.logExecutionStart(user1, 0, tokenIn, tokenOut);
    }

    // ============ Execution Complete Tests ============

    function test_LogExecutionComplete_Success() public {
        vm.startPrank(agentWallet1);

        uint256 executionId = execution.logExecutionStart(user1, 1000, tokenIn, tokenOut);

        execution.logExecutionComplete(
            executionId, user1, 1000, 1100, IAgentExecution.ExecutionResult.SUCCESS
        );

        vm.stopPrank();

        assertFalse(execution.isExecutionPending(executionId));
    }

    function test_LogExecutionComplete_Failure() public {
        vm.startPrank(agentWallet1);

        uint256 executionId = execution.logExecutionStart(user1, 1000, tokenIn, tokenOut);

        execution.logExecutionComplete(
            executionId, user1, 1000, 900, IAgentExecution.ExecutionResult.FAILURE
        );

        vm.stopPrank();

        assertFalse(execution.isExecutionPending(executionId));
    }

    function test_LogExecutionComplete_EmitsEvent() public {
        vm.startPrank(agentWallet1);

        uint256 executionId = execution.logExecutionStart(user1, 1000, tokenIn, tokenOut);

        vm.expectEmit(true, true, true, true);
        emit IAgentExecution.ExecutionCompleted(
            executionId,
            agentId1,
            user1,
            1000,
            1100,
            100, // profit
            IAgentExecution.ExecutionResult.SUCCESS
        );

        execution.logExecutionComplete(
            executionId, user1, 1000, 1100, IAgentExecution.ExecutionResult.SUCCESS
        );

        vm.stopPrank();
    }

    function test_RevertWhen_LogExecutionComplete_NotExecutionOwner() public {
        vm.prank(agentWallet1);
        uint256 executionId = execution.logExecutionStart(user1, 1000, tokenIn, tokenOut);

        vm.prank(agentWallet2);
        vm.expectRevert("Not execution owner");
        execution.logExecutionComplete(
            executionId, user1, 1000, 1100, IAgentExecution.ExecutionResult.SUCCESS
        );
    }

    function test_RevertWhen_LogExecutionComplete_NotPending() public {
        vm.startPrank(agentWallet1);

        uint256 executionId = execution.logExecutionStart(user1, 1000, tokenIn, tokenOut);

        // Complete once
        execution.logExecutionComplete(
            executionId, user1, 1000, 1100, IAgentExecution.ExecutionResult.SUCCESS
        );

        // Try to complete again
        vm.expectRevert("Execution not pending");
        execution.logExecutionComplete(
            executionId, user1, 1000, 1100, IAgentExecution.ExecutionResult.SUCCESS
        );

        vm.stopPrank();
    }

    // ============ Redelegation Tests ============

    function test_LogRedelegation() public {
        vm.prank(agentWallet1);
        execution.logRedelegation(agentId2, user1, 500, 3600);
        // Just checking it doesn't revert
    }

    function test_LogRedelegation_EmitsEvent() public {
        vm.prank(agentWallet1);

        vm.expectEmit(true, true, true, true);
        emit IAgentExecution.RedelegationCreated(agentId1, agentId2, user1, 500, 3600);

        execution.logRedelegation(agentId2, user1, 500, 3600);
    }

    function test_RevertWhen_LogRedelegation_NotRegisteredAgent() public {
        vm.prank(address(0x999));
        vm.expectRevert("Not a registered agent");
        execution.logRedelegation(agentId2, user1, 500, 3600);
    }

    function test_RevertWhen_LogRedelegation_SelfDelegation() public {
        vm.prank(agentWallet1);
        vm.expectRevert("Cannot delegate to self");
        execution.logRedelegation(agentId1, user1, 500, 3600);
    }

    function test_RevertWhen_LogRedelegation_ZeroAmount() public {
        vm.prank(agentWallet1);
        vm.expectRevert("Amount must be positive");
        execution.logRedelegation(agentId2, user1, 0, 3600);
    }

    function test_RevertWhen_LogRedelegation_ZeroDuration() public {
        vm.prank(agentWallet1);
        vm.expectRevert("Duration must be positive");
        execution.logRedelegation(agentId2, user1, 500, 0);
    }

    // ============ View Function Tests ============

    function test_TotalExecutions() public {
        vm.startPrank(agentWallet1);
        execution.logExecutionStart(user1, 1000, tokenIn, tokenOut);
        execution.logExecutionStart(user1, 2000, tokenIn, tokenOut);
        vm.stopPrank();

        assertEq(execution.totalExecutions(), 2);
    }

    // ============ Fuzz Tests ============

    function testFuzz_LogExecutionComplete_ProfitLoss(uint256 amountIn, uint256 amountOut) public {
        vm.assume(amountIn > 0 && amountIn < type(uint128).max);
        vm.assume(amountOut < type(uint128).max);

        vm.startPrank(agentWallet1);

        uint256 executionId = execution.logExecutionStart(user1, amountIn, tokenIn, tokenOut);

        execution.logExecutionComplete(
            executionId,
            user1,
            amountIn,
            amountOut,
            amountOut >= amountIn
                ? IAgentExecution.ExecutionResult.SUCCESS
                : IAgentExecution.ExecutionResult.FAILURE
        );

        vm.stopPrank();

        assertFalse(execution.isExecutionPending(executionId));
    }
}
