// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IAgentExecution
 * @author Echelon Team
 * @notice Interface for the Agent Execution logging contract
 */
interface IAgentExecution {
    // ============ Enums ============

    enum ExecutionResult {
        PENDING,
        SUCCESS,
        FAILURE
    }

    // ============ Events ============

    event ExecutionStarted(
        uint256 indexed executionId,
        uint256 indexed agentId,
        address indexed userAddress,
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    );

    event ExecutionCompleted(
        uint256 indexed executionId,
        uint256 indexed agentId,
        address indexed userAddress,
        uint256 amountIn,
        uint256 amountOut,
        int256 profitLoss,
        ExecutionResult result
    );

    event RedelegationCreated(
        uint256 indexed parentAgentId,
        uint256 indexed childAgentId,
        address indexed userAddress,
        uint256 amount,
        uint256 duration
    );

    // ============ Functions ============

    /**
     * @notice Log the start of an execution
     * @param userAddress The user who granted permission
     * @param amountIn The input amount
     * @param tokenIn The input token address
     * @param tokenOut The output token address
     * @return executionId The unique execution identifier
     */
    function logExecutionStart(
        address userAddress,
        uint256 amountIn,
        address tokenIn,
        address tokenOut
    ) external returns (uint256 executionId);

    /**
     * @notice Log the completion of an execution
     * @param executionId The execution ID from logExecutionStart
     * @param userAddress The user who granted permission
     * @param amountIn The input amount
     * @param amountOut The output amount
     * @param result The execution result (SUCCESS or FAILURE)
     */
    function logExecutionComplete(
        uint256 executionId,
        address userAddress,
        uint256 amountIn,
        uint256 amountOut,
        ExecutionResult result
    ) external;

    /**
     * @notice Log when an agent re-delegates to another agent (A2A)
     * @param childAgentId The receiving agent's ID
     * @param userAddress The original user's address
     * @param amount The delegated amount
     * @param duration The delegation duration in seconds
     */
    function logRedelegation(
        uint256 childAgentId,
        address userAddress,
        uint256 amount,
        uint256 duration
    ) external;

    /**
     * @notice Check if an execution is pending
     * @param executionId The execution ID to check
     * @return Whether the execution is pending
     */
    function isExecutionPending(uint256 executionId) external view returns (bool);

    /**
     * @notice Get total execution count
     * @return Total number of executions
     */
    function totalExecutions() external view returns (uint256);

    /**
     * @notice Get the agent address for an execution
     * @param executionId The execution ID
     * @return The agent's wallet address
     */
    function getExecutionAgent(uint256 executionId) external view returns (address);
}
