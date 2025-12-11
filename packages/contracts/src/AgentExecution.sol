// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IAgentRegistry.sol";
import "./interfaces/IAgentExecution.sol";

/**
 * @title AgentExecution
 * @author Echelon Team
 * @notice Logs agent execution events for Envio indexing and reputation tracking
 */
contract AgentExecution is IAgentExecution, ReentrancyGuard {
    // ============ State Variables ============

    /// @notice Reference to the agent registry
    IAgentRegistry public immutable registry;

    /// @notice Counter for execution IDs
    uint256 private _executionCount;

    /// @notice Mapping to track pending executions
    mapping(uint256 => bool) private _pendingExecutions;

    /// @notice Mapping to track execution ownership
    mapping(uint256 => address) private _executionAgent;

    // ============ Constructor ============

    constructor(address _registry) {
        require(_registry != address(0), "Invalid registry address");
        registry = IAgentRegistry(_registry);
    }

    // ============ External Functions ============

    /// @inheritdoc IAgentExecution
    function logExecutionStart(
        address userAddress,
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) external nonReentrant returns (uint256 executionId) {
        // Verify caller is a registered agent
        require(registry.isRegisteredAgent(msg.sender), "Not a registered agent");
        require(userAddress != address(0), "Invalid user address");
        require(amountIn > 0, "Amount must be positive");
        require(tokenIn != address(0), "Invalid input token");
        require(tokenOut != address(0), "Invalid output token");

        // Get agent ID
        (uint256 agentId, ) = registry.getAgentByWallet(msg.sender);

        // Generate execution ID
        executionId = ++_executionCount;

        // Track pending execution
        _pendingExecutions[executionId] = true;
        _executionAgent[executionId] = msg.sender;

        emit ExecutionStarted(executionId, agentId, userAddress, amountIn, tokenIn, tokenOut);
    }

    /// @inheritdoc IAgentExecution
    function logExecutionComplete(
        uint256 executionId,
        address userAddress,
        uint256 amountIn,
        uint256 amountOut,
        ExecutionResult result
    ) external nonReentrant {
        // Verify caller is the same agent that started the execution
        require(_executionAgent[executionId] == msg.sender, "Not execution owner");
        require(_pendingExecutions[executionId], "Execution not pending");
        require(userAddress != address(0), "Invalid user address");
        require(result != ExecutionResult.PENDING, "Invalid result");

        // Get agent ID
        (uint256 agentId, ) = registry.getAgentByWallet(msg.sender);

        // Calculate profit/loss
        int256 profitLoss = int256(amountOut) - int256(amountIn);

        // Mark execution as complete
        _pendingExecutions[executionId] = false;

        emit ExecutionCompleted(
            executionId,
            agentId,
            userAddress,
            amountIn,
            amountOut,
            profitLoss,
            result
        );
    }

    /// @inheritdoc IAgentExecution
    function logRedelegation(
        uint256 childAgentId,
        address userAddress,
        uint256 amount,
        uint256 duration
    ) external nonReentrant {
        // Verify caller is a registered agent
        require(registry.isRegisteredAgent(msg.sender), "Not a registered agent");
        require(userAddress != address(0), "Invalid user address");
        require(amount > 0, "Amount must be positive");
        require(duration > 0, "Duration must be positive");

        // Verify child agent exists and is active
        IAgentRegistry.AgentMetadata memory childAgent = registry.agents(childAgentId);
        require(childAgent.walletAddress != address(0), "Child agent not found");
        require(childAgent.isActive, "Child agent not active");

        // Get parent agent ID
        (uint256 parentAgentId, ) = registry.getAgentByWallet(msg.sender);

        // Ensure not self-delegation
        require(parentAgentId != childAgentId, "Cannot delegate to self");

        emit RedelegationCreated(parentAgentId, childAgentId, userAddress, amount, duration);
    }

    // ============ View Functions ============

    /// @inheritdoc IAgentExecution
    function isExecutionPending(uint256 executionId) external view returns (bool) {
        return _pendingExecutions[executionId];
    }

    /// @inheritdoc IAgentExecution
    function totalExecutions() external view returns (uint256) {
        return _executionCount;
    }

    /// @inheritdoc IAgentExecution
    function getExecutionAgent(uint256 executionId) external view returns (address) {
        return _executionAgent[executionId];
    }
}
