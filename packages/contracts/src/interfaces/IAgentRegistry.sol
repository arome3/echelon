// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IAgentRegistry
 * @author Echelon Team
 * @notice Interface for the ERC-8004 compliant AI Agent Registry
 */
interface IAgentRegistry {
    // ============ Structs ============

    struct AgentMetadata {
        address walletAddress;
        string name;
        string strategyType;
        uint8 riskLevel;
        uint256 registeredAt;
        bool isActive;
    }

    // ============ Events ============

    event AgentRegistered(
        uint256 indexed agentId,
        address indexed walletAddress,
        string name,
        string strategyType,
        uint8 riskLevel
    );

    event AgentUpdated(uint256 indexed agentId, string metadataUri);

    event AgentDeactivated(uint256 indexed agentId);

    event AgentReactivated(uint256 indexed agentId);

    // ============ Functions ============

    /**
     * @notice Register a new agent
     * @param walletAddress The wallet address the agent will use for executions
     * @param name Human-readable name for the agent
     * @param strategyType Type of strategy (DCA, Arbitrage, Yield, etc.)
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

    /**
     * @notice Update agent metadata URI
     * @param agentId The agent's ID
     * @param metadataUri New metadata URI
     */
    function updateAgentMetadata(uint256 agentId, string calldata metadataUri) external;

    /**
     * @notice Deactivate an agent (stops appearing in rankings)
     * @param agentId The agent's ID
     */
    function deactivateAgent(uint256 agentId) external;

    /**
     * @notice Reactivate a deactivated agent
     * @param agentId The agent's ID
     */
    function reactivateAgent(uint256 agentId) external;

    /**
     * @notice Get agent details by wallet address
     * @param walletAddress The agent's wallet address
     * @return agentId The agent's ID
     * @return metadata The agent's metadata
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
     * @notice Get agent metadata by ID
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
