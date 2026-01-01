// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IAgentRegistry.sol";
import "./interfaces/IAgentExecution.sol";
import "./interfaces/IERC8004Reputation.sol";

/**
 * @title AgentExecution
 * @author Echelon Team
 * @notice Logs agent execution events for Envio indexing and reputation tracking
 * @dev Integrates with ERC-8004 ReputationRegistry for automatic feedback submission
 */
contract AgentExecution is IAgentExecution, ReentrancyGuard, Ownable {
    // ============ State Variables ============

    /// @notice Reference to the agent registry
    IAgentRegistry public immutable registry;

    /// @notice Reference to the reputation registry
    IERC8004Reputation public reputationRegistry;

    /// @notice Counter for execution IDs
    uint256 private _executionCount;

    /// @notice Mapping to track pending executions
    mapping(uint256 => bool) private _pendingExecutions;

    /// @notice Mapping to track execution ownership
    mapping(uint256 => address) private _executionAgent;

    /// @notice Mapping to track execution amounts for score calculation
    mapping(uint256 => uint256) private _executionAmountIn;

    /// @notice Whether automatic feedback is enabled
    bool public autoFeedbackEnabled;

    // ============ Tags ============

    /// @notice Tag for execution-based feedback
    bytes32 public constant TAG_EXECUTION = keccak256("EXECUTION");

    /// @notice Tag for successful executions
    bytes32 public constant TAG_SUCCESS = keccak256("SUCCESS");

    /// @notice Tag for failed executions
    bytes32 public constant TAG_FAILURE = keccak256("FAILURE");

    // ============ Events ============

    /// @notice Emitted when reputation registry is updated
    event ReputationRegistryUpdated(address indexed oldRegistry, address indexed newRegistry);

    /// @notice Emitted when auto feedback is toggled
    event AutoFeedbackToggled(bool enabled);

    /// @notice Emitted when feedback is automatically submitted
    event AutoFeedbackSubmitted(
        uint256 indexed executionId,
        uint256 indexed agentId,
        address indexed userAddress,
        uint8 score
    );

    /// @notice Emitted when automatic feedback submission fails
    event AutoFeedbackFailed(
        uint256 indexed executionId,
        uint256 indexed agentId,
        string reason
    );

    // ============ Constructor ============

    constructor(address _registry) Ownable(msg.sender) {
        require(_registry != address(0), "Invalid registry address");
        registry = IAgentRegistry(_registry);
        autoFeedbackEnabled = false; // Disabled by default until reputation registry is set
    }

    // ============ Admin Functions ============

    /**
     * @notice Set the reputation registry address
     * @param _reputationRegistry Address of the ReputationRegistry contract
     */
    function setReputationRegistry(address _reputationRegistry) external onlyOwner {
        address oldRegistry = address(reputationRegistry);
        reputationRegistry = IERC8004Reputation(_reputationRegistry);
        emit ReputationRegistryUpdated(oldRegistry, _reputationRegistry);
    }

    /**
     * @notice Enable or disable automatic feedback submission
     * @param enabled Whether to enable auto feedback
     */
    function setAutoFeedbackEnabled(bool enabled) external onlyOwner {
        require(
            !enabled || address(reputationRegistry) != address(0),
            "Reputation registry not set"
        );
        autoFeedbackEnabled = enabled;
        emit AutoFeedbackToggled(enabled);
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
        _executionAmountIn[executionId] = amountIn;

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

        // Submit automatic feedback if enabled
        if (autoFeedbackEnabled && address(reputationRegistry) != address(0)) {
            _submitAutoFeedback(executionId, agentId, userAddress, amountIn, amountOut, result);
        }
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

    /**
     * @notice Calculate the reputation score from execution results
     * @param amountIn Input amount
     * @param amountOut Output amount
     * @param result Execution result
     * @return score Reputation score (0-100)
     */
    function calculateScore(
        uint256 amountIn,
        uint256 amountOut,
        ExecutionResult result
    ) public pure returns (uint8 score) {
        if (result == ExecutionResult.FAILURE) {
            // Failed executions get lower scores based on loss percentage
            if (amountOut >= amountIn) {
                return 40; // Failure but no loss
            }
            uint256 lossPercent = ((amountIn - amountOut) * 100) / amountIn;
            if (lossPercent >= 50) return 0;
            return uint8(40 - (lossPercent * 40) / 50); // 0-40 based on loss
        }

        // Successful executions
        if (amountOut <= amountIn) {
            return 50; // Success but no profit
        }

        // Calculate profit percentage (capped at 100% for scoring)
        uint256 profitPercent = ((amountOut - amountIn) * 100) / amountIn;
        if (profitPercent >= 100) return 100;

        // Score 50-100 based on profit percentage
        return uint8(50 + (profitPercent * 50) / 100);
    }

    // ============ Internal Functions ============

    /**
     * @notice Submit automatic feedback to the reputation registry
     * @param executionId The execution ID
     * @param agentId The agent ID
     * @param userAddress The user who executed
     * @param amountIn Input amount
     * @param amountOut Output amount
     * @param result Execution result
     */
    function _submitAutoFeedback(
        uint256 executionId,
        uint256 agentId,
        address userAddress,
        uint256 amountIn,
        uint256 amountOut,
        ExecutionResult result
    ) internal {
        // Calculate score
        uint8 score = calculateScore(amountIn, amountOut, result);

        // Determine secondary tag based on result
        bytes32 tag2 = result == ExecutionResult.SUCCESS ? TAG_SUCCESS : TAG_FAILURE;

        // Submit feedback (userAddress is the client)
        // Note: This call is made FROM this contract, not FROM the user
        // The feedback will show as coming from this contract's address
        try reputationRegistry.giveFeedback(
            agentId,
            score,
            TAG_EXECUTION,
            tag2,
            "",
            bytes32(executionId),
            ""
        ) {
            emit AutoFeedbackSubmitted(executionId, agentId, userAddress, score);
        } catch Error(string memory reason) {
            // Emit failure event with reason for debugging
            emit AutoFeedbackFailed(executionId, agentId, reason);
        } catch {
            // Generic failure without reason
            emit AutoFeedbackFailed(executionId, agentId, "Unknown error");
        }
    }
}
