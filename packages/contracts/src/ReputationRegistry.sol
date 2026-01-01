// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/IERC8004Reputation.sol";

/**
 * @title ReputationRegistry
 * @author Echelon Team
 * @notice ERC-8004 compliant Reputation Registry for agent feedback and scoring
 * @dev Manages client feedback with signature verification, revocation, and aggregation
 */
contract ReputationRegistry is IERC8004Reputation {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // ============ Structs ============

    struct Feedback {
        uint8 score;
        bytes32 tag1;
        bytes32 tag2;
        string fileuri;
        bytes32 filehash;
        bool isRevoked;
        uint256 timestamp;
    }

    struct Response {
        address responder;
        string responseUri;
        bytes32 responseHash;
        uint256 timestamp;
    }

    // ============ State Variables ============

    /// @notice Reference to the Identity Registry
    address public immutable identityRegistry;

    /// @notice Feedback storage: agentId => clientAddress => feedbacks
    mapping(uint256 => mapping(address => Feedback[])) private _feedbacks;

    /// @notice List of clients who provided feedback: agentId => clients
    mapping(uint256 => address[]) private _clients;

    /// @notice Track if client has given feedback: agentId => client => hasFeedback
    mapping(uint256 => mapping(address => bool)) private _hasGivenFeedback;

    /// @notice Responses to feedback: agentId => clientAddress => feedbackIndex => responses
    mapping(uint256 => mapping(address => mapping(uint64 => Response[]))) private _responses;

    /// @notice Nonces for signature replay protection: signer => nonce
    mapping(address => uint256) public nonces;

    // ============ Constants ============

    /// @notice Maximum score value
    uint8 public constant MAX_SCORE = 100;

    /// @notice EIP-712 type hash for feedback authorization
    bytes32 public constant FEEDBACK_TYPEHASH = keccak256(
        "FeedbackAuth(uint256 agentId,address clientAddress,uint256 nonce,uint256 expiry,uint256 chainId,address identityRegistry)"
    );

    // ============ Constructor ============

    /**
     * @notice Initialize the Reputation Registry
     * @param _identityRegistry Address of the Identity Registry contract
     */
    constructor(address _identityRegistry) {
        require(_identityRegistry != address(0), "Invalid identity registry");
        identityRegistry = _identityRegistry;
    }

    // ============ External Functions ============

    /// @inheritdoc IERC8004Reputation
    function getIdentityRegistry() external view returns (address) {
        return identityRegistry;
    }

    /// @inheritdoc IERC8004Reputation
    function giveFeedback(
        uint256 agentId,
        uint8 score,
        bytes32 tag1,
        bytes32 tag2,
        string calldata fileuri,
        bytes32 filehash,
        bytes calldata feedbackAuth
    ) external {
        // Validate score
        require(score <= MAX_SCORE, "Score exceeds maximum");

        // Validate agent exists
        require(_agentExists(agentId), "Agent does not exist");

        // Verify authorization if provided
        if (feedbackAuth.length > 0) {
            _verifyFeedbackAuth(agentId, msg.sender, feedbackAuth);
        }

        // Track new client
        if (!_hasGivenFeedback[agentId][msg.sender]) {
            _clients[agentId].push(msg.sender);
            _hasGivenFeedback[agentId][msg.sender] = true;
        }

        // Store feedback
        _feedbacks[agentId][msg.sender].push(Feedback({
            score: score,
            tag1: tag1,
            tag2: tag2,
            fileuri: fileuri,
            filehash: filehash,
            isRevoked: false,
            timestamp: block.timestamp
        }));

        emit NewFeedback(agentId, msg.sender, score, tag1, tag2, fileuri, filehash);
    }

    /// @inheritdoc IERC8004Reputation
    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external {
        require(feedbackIndex < _feedbacks[agentId][msg.sender].length, "Invalid feedback index");
        require(!_feedbacks[agentId][msg.sender][feedbackIndex].isRevoked, "Already revoked");

        _feedbacks[agentId][msg.sender][feedbackIndex].isRevoked = true;

        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    /// @inheritdoc IERC8004Reputation
    function appendResponse(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        string calldata responseUri,
        bytes32 responseHash
    ) external {
        // Verify caller is the agent owner or approved operator
        require(
            _isAgentOwnerOrApproved(agentId, msg.sender),
            "Only agent owner can respond"
        );
        require(feedbackIndex < _feedbacks[agentId][clientAddress].length, "Invalid feedback index");

        _responses[agentId][clientAddress][feedbackIndex].push(Response({
            responder: msg.sender,
            responseUri: responseUri,
            responseHash: responseHash,
            timestamp: block.timestamp
        }));

        emit ResponseAppended(agentId, clientAddress, feedbackIndex, msg.sender, responseUri);
    }

    // ============ View Functions ============

    /// @inheritdoc IERC8004Reputation
    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        bytes32 tag1,
        bytes32 tag2
    ) external view returns (uint64 count, uint8 averageScore) {
        uint256 totalScore = 0;
        uint64 validCount = 0;

        // Use provided clients or get all clients for this agent
        uint256 clientCount = clientAddresses.length > 0
            ? clientAddresses.length
            : _clients[agentId].length;

        for (uint256 i = 0; i < clientCount; i++) {
            address client = clientAddresses.length > 0
                ? clientAddresses[i]
                : _clients[agentId][i];

            Feedback[] storage feedbacks = _feedbacks[agentId][client];

            for (uint256 j = 0; j < feedbacks.length; j++) {
                Feedback storage fb = feedbacks[j];

                // Skip revoked feedback
                if (fb.isRevoked) continue;

                // Filter by tags if specified
                if (tag1 != bytes32(0) && fb.tag1 != tag1) continue;
                if (tag2 != bytes32(0) && fb.tag2 != tag2) continue;

                totalScore += fb.score;
                validCount++;
            }
        }

        count = validCount;
        averageScore = validCount > 0 ? uint8(totalScore / validCount) : 0;
    }

    /// @inheritdoc IERC8004Reputation
    function readFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 index
    ) external view returns (uint8 score, bytes32 tag1, bytes32 tag2, bool isRevoked) {
        require(index < _feedbacks[agentId][clientAddress].length, "Invalid index");

        Feedback storage fb = _feedbacks[agentId][clientAddress][index];
        return (fb.score, fb.tag1, fb.tag2, fb.isRevoked);
    }

    /// @inheritdoc IERC8004Reputation
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
        )
    {
        // Determine client count
        uint256 clientCount = clientAddresses.length > 0
            ? clientAddresses.length
            : _clients[agentId].length;

        // First pass: count matching feedback
        uint256 totalCount = 0;
        for (uint256 i = 0; i < clientCount; i++) {
            address client = clientAddresses.length > 0
                ? clientAddresses[i]
                : _clients[agentId][i];

            Feedback[] storage feedbacks = _feedbacks[agentId][client];
            for (uint256 j = 0; j < feedbacks.length; j++) {
                if (_matchesFeedbackFilter(feedbacks[j], tag1, tag2, includeRevoked)) {
                    totalCount++;
                }
            }
        }

        // Allocate arrays
        clientAddrs = new address[](totalCount);
        scores = new uint8[](totalCount);
        tag1s = new bytes32[](totalCount);
        tag2s = new bytes32[](totalCount);
        revokedStatuses = new bool[](totalCount);

        // Second pass: populate arrays
        uint256 index = 0;
        for (uint256 i = 0; i < clientCount; i++) {
            address client = clientAddresses.length > 0
                ? clientAddresses[i]
                : _clients[agentId][i];

            Feedback[] storage feedbacks = _feedbacks[agentId][client];
            for (uint256 j = 0; j < feedbacks.length; j++) {
                if (_matchesFeedbackFilter(feedbacks[j], tag1, tag2, includeRevoked)) {
                    clientAddrs[index] = client;
                    scores[index] = feedbacks[j].score;
                    tag1s[index] = feedbacks[j].tag1;
                    tag2s[index] = feedbacks[j].tag2;
                    revokedStatuses[index] = feedbacks[j].isRevoked;
                    index++;
                }
            }
        }
    }

    /// @inheritdoc IERC8004Reputation
    function getResponseCount(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        address[] calldata responders
    ) external view returns (uint64 count) {
        Response[] storage responses = _responses[agentId][clientAddress][feedbackIndex];

        if (responders.length == 0) {
            return uint64(responses.length);
        }

        // Filter by responders
        for (uint256 i = 0; i < responses.length; i++) {
            for (uint256 j = 0; j < responders.length; j++) {
                if (responses[i].responder == responders[j]) {
                    count++;
                    break;
                }
            }
        }
    }

    /// @inheritdoc IERC8004Reputation
    function getClients(uint256 agentId) external view returns (address[] memory clients) {
        return _clients[agentId];
    }

    /// @inheritdoc IERC8004Reputation
    function getLastIndex(
        uint256 agentId,
        address clientAddress
    ) external view returns (uint64 index) {
        uint256 length = _feedbacks[agentId][clientAddress].length;
        return length > 0 ? uint64(length - 1) : 0;
    }

    /**
     * @notice Get detailed feedback information including file URI and hash
     * @param agentId The agent ID
     * @param clientAddress The client who provided feedback
     * @param index The feedback index
     * @return score The feedback score
     * @return tag1 Primary tag
     * @return tag2 Secondary tag
     * @return fileuri URI to detailed feedback
     * @return filehash Hash of feedback file
     * @return isRevoked Revocation status
     * @return timestamp When feedback was submitted
     */
    function getDetailedFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 index
    )
        external
        view
        returns (
            uint8 score,
            bytes32 tag1,
            bytes32 tag2,
            string memory fileuri,
            bytes32 filehash,
            bool isRevoked,
            uint256 timestamp
        )
    {
        require(index < _feedbacks[agentId][clientAddress].length, "Invalid index");

        Feedback storage fb = _feedbacks[agentId][clientAddress][index];
        return (fb.score, fb.tag1, fb.tag2, fb.fileuri, fb.filehash, fb.isRevoked, fb.timestamp);
    }

    /**
     * @notice Get feedback count for a specific client
     * @param agentId The agent ID
     * @param clientAddress The client address
     * @return count Number of feedback entries
     */
    function getFeedbackCount(
        uint256 agentId,
        address clientAddress
    ) external view returns (uint256 count) {
        return _feedbacks[agentId][clientAddress].length;
    }

    // ============ Internal Functions ============

    /**
     * @notice Check if an agent exists in the Identity Registry
     * @param agentId The agent ID to check
     * @return exists Whether the agent exists
     */
    function _agentExists(uint256 agentId) internal view returns (bool exists) {
        try IERC721(identityRegistry).ownerOf(agentId) returns (address owner) {
            return owner != address(0);
        } catch {
            return false;
        }
    }

    /**
     * @notice Check if an address is the agent owner or approved operator
     * @param agentId The agent ID to check
     * @param account The address to verify
     * @return True if the account is owner or approved
     */
    function _isAgentOwnerOrApproved(uint256 agentId, address account) internal view returns (bool) {
        IERC721 registry = IERC721(identityRegistry);
        try registry.ownerOf(agentId) returns (address owner) {
            if (account == owner) return true;
            // Check if approved for this specific token
            try registry.getApproved(agentId) returns (address approved) {
                if (account == approved) return true;
            } catch {}
            // Check if approved for all tokens
            try registry.isApprovedForAll(owner, account) returns (bool isApproved) {
                return isApproved;
            } catch {}
            return false;
        } catch {
            return false;
        }
    }

    /**
     * @notice Verify feedback authorization signature
     * @param agentId The agent receiving feedback
     * @param clientAddress The client providing feedback
     * @param feedbackAuth The authorization signature
     */
    function _verifyFeedbackAuth(
        uint256 agentId,
        address clientAddress,
        bytes calldata feedbackAuth
    ) internal {
        // Decode the signature components
        require(feedbackAuth.length >= 65, "Invalid signature length");

        // Extract expiry from the first 32 bytes (if included) or use current nonce
        uint256 expiry;
        bytes memory signature;

        if (feedbackAuth.length > 65) {
            // Extended format: expiry (32 bytes) + signature (65 bytes)
            expiry = abi.decode(feedbackAuth[:32], (uint256));
            signature = feedbackAuth[32:];
        } else {
            // Simple format: just signature, no expiry check
            expiry = block.timestamp + 1; // Always valid
            signature = feedbackAuth;
        }

        require(block.timestamp <= expiry, "Signature expired");

        // Build message hash
        bytes32 structHash = keccak256(abi.encode(
            FEEDBACK_TYPEHASH,
            agentId,
            clientAddress,
            nonces[clientAddress],
            expiry,
            block.chainid,
            identityRegistry
        ));

        bytes32 digest = structHash.toEthSignedMessageHash();

        // Verify signature
        address signer = digest.recover(signature);

        // Signer must be the client or the agent owner
        address agentOwner = IERC721(identityRegistry).ownerOf(agentId);
        require(
            signer == clientAddress || signer == agentOwner,
            "Invalid signature"
        );

        // Increment nonce to prevent replay
        nonces[clientAddress]++;
    }

    /**
     * @notice Check if feedback matches filter criteria
     * @param fb The feedback to check
     * @param tag1 Tag1 filter (bytes32(0) for any)
     * @param tag2 Tag2 filter (bytes32(0) for any)
     * @param includeRevoked Whether to include revoked feedback
     * @return matches Whether the feedback matches
     */
    function _matchesFeedbackFilter(
        Feedback storage fb,
        bytes32 tag1,
        bytes32 tag2,
        bool includeRevoked
    ) internal view returns (bool matches) {
        if (!includeRevoked && fb.isRevoked) return false;
        if (tag1 != bytes32(0) && fb.tag1 != tag1) return false;
        if (tag2 != bytes32(0) && fb.tag2 != tag2) return false;
        return true;
    }
}
