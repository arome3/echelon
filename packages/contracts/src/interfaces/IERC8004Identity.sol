// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IERC8004Identity
 * @notice ERC-8004 Identity Registry interface for agent registration and metadata management
 * @dev Extends ERC-721 with key-value metadata storage and standardized registration
 */
interface IERC8004Identity {
    // ============ Structs ============

    /**
     * @notice Metadata entry for batch registration
     * @param key The metadata key (e.g., "name", "strategyType")
     * @param value The ABI-encoded metadata value
     */
    struct MetadataEntry {
        string key;
        bytes value;
    }

    // ============ Events ============

    /**
     * @notice Emitted when a new agent is registered
     * @param agentId The unique identifier for the agent (also the NFT token ID)
     * @param tokenURI The URI pointing to the agent's registration file
     * @param owner The address that owns the agent NFT
     */
    event Registered(uint256 indexed agentId, string tokenURI, address indexed owner);

    /**
     * @notice Emitted when agent metadata is updated
     * @param agentId The agent's unique identifier
     * @param indexedKey Keccak256 hash of the key for efficient filtering
     * @param key The human-readable metadata key
     * @param value The ABI-encoded metadata value
     */
    event MetadataSet(uint256 indexed agentId, bytes32 indexed indexedKey, string key, bytes value);

    // ============ Registration Functions ============

    /**
     * @notice Register a new agent with metadata entries
     * @param tokenURI URI pointing to the agent's registration file (IPFS or HTTPS)
     * @param metadata Array of key-value metadata entries to set during registration
     * @return agentId The unique identifier assigned to the new agent
     */
    function register(string calldata tokenURI, MetadataEntry[] calldata metadata)
        external
        returns (uint256 agentId);

    /**
     * @notice Register a new agent with only a token URI
     * @param tokenURI URI pointing to the agent's registration file
     * @return agentId The unique identifier assigned to the new agent
     */
    function register(string calldata tokenURI) external returns (uint256 agentId);

    /**
     * @notice Register a new agent with no initial metadata
     * @return agentId The unique identifier assigned to the new agent
     */
    function register() external returns (uint256 agentId);

    // ============ Metadata Functions ============

    /**
     * @notice Get a metadata value for an agent
     * @param agentId The agent's unique identifier
     * @param key The metadata key to retrieve
     * @return value The ABI-encoded metadata value (empty bytes if not set)
     */
    function getMetadata(uint256 agentId, string calldata key)
        external
        view
        returns (bytes memory value);

    /**
     * @notice Set a metadata value for an agent
     * @dev Only callable by the agent's NFT owner
     * @param agentId The agent's unique identifier
     * @param key The metadata key to set
     * @param value The ABI-encoded metadata value
     */
    function setMetadata(uint256 agentId, string calldata key, bytes calldata value) external;
}
