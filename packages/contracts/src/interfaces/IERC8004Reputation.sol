// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IERC8004Reputation
 * @notice ERC-8004 Reputation Registry interface for agent feedback and scoring
 * @dev Manages client feedback, revocations, and reputation aggregation
 */
interface IERC8004Reputation {
    // ============ Events ============

    /**
     * @notice Emitted when new feedback is submitted for an agent
     * @param agentId The agent receiving feedback
     * @param clientAddress The address of the client providing feedback
     * @param score Feedback score (0-100)
     * @param tag1 Primary categorization tag
     * @param tag2 Secondary categorization tag
     * @param fileuri URI to detailed feedback file (optional)
     * @param filehash Hash of the feedback file for verification (optional)
     */
    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint8 score,
        bytes32 indexed tag1,
        bytes32 tag2,
        string fileuri,
        bytes32 filehash
    );

    /**
     * @notice Emitted when feedback is revoked by the client
     * @param agentId The agent whose feedback was revoked
     * @param clientAddress The client who revoked their feedback
     * @param feedbackIndex The index of the revoked feedback
     */
    event FeedbackRevoked(
        uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex
    );

    /**
     * @notice Emitted when a response is appended to feedback
     * @param agentId The agent responding to feedback
     * @param clientAddress The client who provided the original feedback
     * @param feedbackIndex The index of the feedback being responded to
     * @param responder The address appending the response
     * @param responseUri URI to the response content
     */
    event ResponseAppended(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        address indexed responder,
        string responseUri
    );

    // ============ Core Functions ============

    /**
     * @notice Get the address of the associated Identity Registry
     * @return identityRegistry The Identity Registry contract address
     */
    function getIdentityRegistry() external view returns (address identityRegistry);

    /**
     * @notice Submit feedback for an agent
     * @param agentId The agent to provide feedback for
     * @param score Feedback score (0-100, where 100 is best)
     * @param tag1 Primary categorization tag (e.g., keccak256("EXECUTION"))
     * @param tag2 Secondary categorization tag (e.g., keccak256("DCA"))
     * @param fileuri URI to detailed feedback file (can be empty)
     * @param filehash Hash of the feedback file (can be bytes32(0))
     * @param feedbackAuth EIP-191/ERC-1271 signature authorizing the feedback
     */
    function giveFeedback(
        uint256 agentId,
        uint8 score,
        bytes32 tag1,
        bytes32 tag2,
        string calldata fileuri,
        bytes32 filehash,
        bytes calldata feedbackAuth
    ) external;

    /**
     * @notice Revoke previously submitted feedback
     * @dev Only callable by the original feedback provider
     * @param agentId The agent whose feedback to revoke
     * @param feedbackIndex The index of the feedback to revoke
     */
    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external;

    /**
     * @notice Append a response to existing feedback
     * @param agentId The agent associated with the feedback
     * @param clientAddress The client who provided the original feedback
     * @param feedbackIndex The index of the feedback to respond to
     * @param responseUri URI to the response content
     * @param responseHash Hash of the response content for verification
     */
    function appendResponse(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        string calldata responseUri,
        bytes32 responseHash
    ) external;

    // ============ View Functions ============

    /**
     * @notice Get aggregated feedback summary for an agent
     * @param agentId The agent to get summary for
     * @param clientAddresses Filter by specific clients (empty array for all)
     * @param tag1 Filter by primary tag (bytes32(0) for all)
     * @param tag2 Filter by secondary tag (bytes32(0) for all)
     * @return count Total number of matching feedback entries
     * @return averageScore Average score across matching entries
     */
    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        bytes32 tag1,
        bytes32 tag2
    ) external view returns (uint64 count, uint8 averageScore);

    /**
     * @notice Read a specific feedback entry
     * @param agentId The agent to read feedback for
     * @param clientAddress The client who provided the feedback
     * @param index The feedback index
     * @return score The feedback score
     * @return tag1 Primary categorization tag
     * @return tag2 Secondary categorization tag
     * @return isRevoked Whether the feedback has been revoked
     */
    function readFeedback(uint256 agentId, address clientAddress, uint64 index)
        external
        view
        returns (uint8 score, bytes32 tag1, bytes32 tag2, bool isRevoked);

    /**
     * @notice Read all feedback for an agent with filtering
     * @param agentId The agent to read feedback for
     * @param clientAddresses Filter by specific clients (empty array for all)
     * @param tag1 Filter by primary tag (bytes32(0) for all)
     * @param tag2 Filter by secondary tag (bytes32(0) for all)
     * @param includeRevoked Whether to include revoked feedback
     * @return clientAddrs Array of client addresses
     * @return scores Array of feedback scores
     * @return tag1s Array of primary tags
     * @return tag2s Array of secondary tags
     * @return revokedStatuses Array of revocation statuses
     */
    function readAllFeedback(
        uint256 agentId,
        address[] calldata clientAddresses,
        bytes32 tag1,
        bytes32 tag2,
        bool includeRevoked
    )
        external
        view
        returns (
            address[] memory clientAddrs,
            uint8[] memory scores,
            bytes32[] memory tag1s,
            bytes32[] memory tag2s,
            bool[] memory revokedStatuses
        );

    /**
     * @notice Get the number of responses for a specific feedback entry
     * @param agentId The agent associated with the feedback
     * @param clientAddress The client who provided the feedback
     * @param feedbackIndex The feedback index
     * @param responders Filter by specific responders (empty array for all)
     * @return count Number of responses
     */
    function getResponseCount(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        address[] calldata responders
    ) external view returns (uint64 count);

    /**
     * @notice Get all clients who have provided feedback for an agent
     * @param agentId The agent to get clients for
     * @return clients Array of client addresses
     */
    function getClients(uint256 agentId) external view returns (address[] memory clients);

    /**
     * @notice Get the last feedback index for a client-agent pair
     * @param agentId The agent
     * @param clientAddress The client
     * @return index The last feedback index (0 if no feedback)
     */
    function getLastIndex(uint256 agentId, address clientAddress)
        external
        view
        returns (uint64 index);
}
