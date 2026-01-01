// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./IERC8004Identity.sol";

/**
 * @title IAgentRegistry
 * @author Echelon Team
 * @notice Interface for the ERC-8004 compliant AI Agent Registry
 * @dev Extends IERC8004Identity with domain-specific agent functionality
 */
interface IAgentRegistry is IERC8004Identity {
    // ============ Structs ============

    /**
     * @notice Legacy struct for backward compatibility with existing integrations
     * @dev Data is stored as ERC-8004 metadata internally but decoded to this struct for convenience
     */
    struct AgentMetadata {
        address walletAddress;
        string name;
        string strategyType;
        uint8 riskLevel;
        uint256 registeredAt;
        bool isActive;
    }

    // ============ Legacy Events ============

    /**
     * @notice Emitted when an agent is registered via registerAgent()
     * @dev Kept for backward compatibility with existing indexers
     */
    event AgentRegistered(
        uint256 indexed agentId,
        address indexed walletAddress,
        string name,
        string strategyType,
        uint8 riskLevel
    );

    /**
     * @notice Emitted when agent token URI is updated
     */
    event AgentUpdated(uint256 indexed agentId, string metadataUri);

    /**
     * @notice Emitted when an agent is deactivated
     */
    event AgentDeactivated(uint256 indexed agentId);

    /**
     * @notice Emitted when an agent is reactivated
     */
    event AgentReactivated(uint256 indexed agentId);

    // ============ Legacy Registration Function ============

    /**
     * @notice Register a new agent with full metadata (convenience wrapper)
     * @dev Internally uses ERC-8004 register() and setMetadata()
     * @param walletAddress The wallet address the agent will use for executions
     * @param name Human-readable name for the agent (3-50 characters)
     * @param strategyType Type of strategy (must be in validStrategyTypes)
     * @param riskLevel Risk level from 1 (conservative) to 10 (aggressive)
     * @param metadataUri URI pointing to full agent metadata (IPFS or HTTPS)
     * @return agentId The unique identifier for the registered agent
     */
    function registerAgent(
        address walletAddress,
        string calldata name,
        string calldata strategyType,
        uint8 riskLevel,
        string calldata metadataUri
    ) external returns (uint256 agentId);

    // ============ Agent Management Functions ============

    /**
     * @notice Update agent metadata URI (token URI)
     * @param agentId The agent's ID
     * @param metadataUri New metadata URI
     */
    function updateAgentMetadata(uint256 agentId, string calldata metadataUri) external;

    /**
     * @notice Deactivate an agent (sets isActive to false)
     * @param agentId The agent's ID
     */
    function deactivateAgent(uint256 agentId) external;

    /**
     * @notice Reactivate a deactivated agent
     * @param agentId The agent's ID
     */
    function reactivateAgent(uint256 agentId) external;

    // ============ View Functions ============

    /**
     * @notice Get agent details by wallet address
     * @param walletAddress The agent's wallet address
     * @return agentId The agent's ID
     * @return metadata The agent's metadata (decoded from ERC-8004 format)
     */
    function getAgentByWallet(address walletAddress)
        external
        view
        returns (uint256 agentId, AgentMetadata memory metadata);

    /**
     * @notice Check if an address is a registered agent
     * @param walletAddress The address to check
     * @return Whether the address is a registered agent
     */
    function isRegisteredAgent(address walletAddress) external view returns (bool);

    /**
     * @notice Get total number of registered agents
     * @return Total agent count
     */
    function totalAgents() external view returns (uint256);

    /**
     * @notice Get agent metadata by ID (decoded from ERC-8004 format)
     * @param agentId The agent's ID
     * @return The agent's metadata
     */
    function agents(uint256 agentId) external view returns (AgentMetadata memory);

    /**
     * @notice Get agent ID by wallet address
     * @param wallet The wallet address
     * @return The agent's ID (0 if not registered)
     */
    function walletToAgentId(address wallet) external view returns (uint256);
}
