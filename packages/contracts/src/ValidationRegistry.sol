// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./interfaces/IERC8004Validation.sol";

/**
 * @title ValidationRegistry
 * @author Echelon Team
 * @notice ERC-8004 compliant Validation Registry for agent work verification
 * @dev Manages validation requests and responses from authorized validators
 */
contract ValidationRegistry is IERC8004Validation {
    // ============ Structs ============

    struct ValidationRecord {
        address validatorAddress;
        uint256 agentId;
        address requester;
        string requestUri;
        uint8 response;
        string responseUri;
        bytes32 responseHash;
        bytes32 tag;
        uint256 requestTimestamp;
        uint256 lastUpdate;
        bool hasResponse;
    }

    // ============ State Variables ============

    /// @notice Reference to the Identity Registry
    address public immutable identityRegistry;

    /// @notice Validation records: requestHash => record
    mapping(bytes32 => ValidationRecord) private _validations;

    /// @notice Agent's validation requests: agentId => requestHashes
    mapping(uint256 => bytes32[]) private _agentValidations;

    /// @notice Validator's assigned requests: validator => requestHashes
    mapping(address => bytes32[]) private _validatorRequests;

    /// @notice Track if request hash exists
    mapping(bytes32 => bool) private _requestExists;

    // ============ Constants ============

    /// @notice Maximum response value
    uint8 public constant MAX_RESPONSE = 100;

    // ============ Constructor ============

    /**
     * @notice Initialize the Validation Registry
     * @param _identityRegistry Address of the Identity Registry contract
     */
    constructor(address _identityRegistry) {
        require(_identityRegistry != address(0), "Invalid identity registry");
        identityRegistry = _identityRegistry;
    }

    // ============ External Functions ============

    /// @inheritdoc IERC8004Validation
    function getIdentityRegistry() external view returns (address) {
        return identityRegistry;
    }

    /// @inheritdoc IERC8004Validation
    function validationRequest(
        address validatorAddress,
        uint256 agentId,
        string calldata requestUri,
        bytes32 requestHash
    ) external {
        // Validate inputs
        require(validatorAddress != address(0), "Invalid validator address");
        require(requestHash != bytes32(0), "Invalid request hash");
        require(!_requestExists[requestHash], "Request hash already exists");

        // Verify agent exists and caller is owner/operator
        require(_agentExists(agentId), "Agent does not exist");
        require(_isAgentOwnerOrOperator(agentId, msg.sender), "Not agent owner or operator");

        // Store validation request
        _validations[requestHash] = ValidationRecord({
            validatorAddress: validatorAddress,
            agentId: agentId,
            requester: msg.sender,
            requestUri: requestUri,
            response: 0,
            responseUri: "",
            responseHash: bytes32(0),
            tag: bytes32(0),
            requestTimestamp: block.timestamp,
            lastUpdate: block.timestamp,
            hasResponse: false
        });

        // Track request
        _requestExists[requestHash] = true;
        _agentValidations[agentId].push(requestHash);
        _validatorRequests[validatorAddress].push(requestHash);

        emit ValidationRequest(validatorAddress, agentId, requestUri, requestHash);
    }

    /// @inheritdoc IERC8004Validation
    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseUri,
        bytes32 responseHash,
        bytes32 tag
    ) external {
        // Validate request exists
        require(_requestExists[requestHash], "Request does not exist");

        // Get validation record
        ValidationRecord storage record = _validations[requestHash];

        // Only assigned validator can respond
        require(msg.sender == record.validatorAddress, "Not assigned validator");

        // Validate response value
        require(response <= MAX_RESPONSE, "Response exceeds maximum");

        // Update record
        record.response = response;
        record.responseUri = responseUri;
        record.responseHash = responseHash;
        record.tag = tag;
        record.lastUpdate = block.timestamp;
        record.hasResponse = true;

        emit ValidationResponse(
            msg.sender,
            record.agentId,
            requestHash,
            response,
            responseUri,
            tag
        );
    }

    // ============ View Functions ============

    /// @inheritdoc IERC8004Validation
    function getValidationStatus(
        bytes32 requestHash
    )
        external
        view
        returns (
            address validatorAddress,
            uint256 agentId,
            uint8 response,
            bytes32 tag,
            uint256 lastUpdate
        )
    {
        require(_requestExists[requestHash], "Request does not exist");

        ValidationRecord storage record = _validations[requestHash];
        return (
            record.validatorAddress,
            record.agentId,
            record.response,
            record.tag,
            record.lastUpdate
        );
    }

    /// @inheritdoc IERC8004Validation
    function getSummary(
        uint256 agentId,
        address[] calldata validatorAddresses,
        bytes32 tag
    ) external view returns (uint64 count, uint8 avgResponse) {
        bytes32[] storage requestHashes = _agentValidations[agentId];

        uint256 totalResponse = 0;
        uint64 validCount = 0;

        for (uint256 i = 0; i < requestHashes.length; i++) {
            ValidationRecord storage record = _validations[requestHashes[i]];

            // Skip if no response yet
            if (!record.hasResponse) continue;

            // Filter by validators if specified
            if (validatorAddresses.length > 0) {
                bool matchesValidator = false;
                for (uint256 j = 0; j < validatorAddresses.length; j++) {
                    if (record.validatorAddress == validatorAddresses[j]) {
                        matchesValidator = true;
                        break;
                    }
                }
                if (!matchesValidator) continue;
            }

            // Filter by tag if specified
            if (tag != bytes32(0) && record.tag != tag) continue;

            totalResponse += record.response;
            validCount++;
        }

        count = validCount;
        avgResponse = validCount > 0 ? uint8(totalResponse / validCount) : 0;
    }

    /// @inheritdoc IERC8004Validation
    function getAgentValidations(
        uint256 agentId
    ) external view returns (bytes32[] memory requestHashes) {
        return _agentValidations[agentId];
    }

    /// @inheritdoc IERC8004Validation
    function getValidatorRequests(
        address validatorAddress
    ) external view returns (bytes32[] memory requestHashes) {
        return _validatorRequests[validatorAddress];
    }

    /**
     * @notice Get detailed validation record
     * @param requestHash The request hash
     * @return validatorAddress The assigned validator
     * @return agentId The agent being validated
     * @return requester Who created the request
     * @return requestUri URI to request details
     * @return response The validation response (0-100)
     * @return responseUri URI to response details
     * @return tag Categorization tag
     * @return hasResponse Whether a response has been submitted
     */
    function getValidationDetails(
        bytes32 requestHash
    )
        external
        view
        returns (
            address validatorAddress,
            uint256 agentId,
            address requester,
            string memory requestUri,
            uint8 response,
            string memory responseUri,
            bytes32 tag,
            bool hasResponse
        )
    {
        require(_requestExists[requestHash], "Request does not exist");

        ValidationRecord storage record = _validations[requestHash];
        return (
            record.validatorAddress,
            record.agentId,
            record.requester,
            record.requestUri,
            record.response,
            record.responseUri,
            record.tag,
            record.hasResponse
        );
    }

    /**
     * @notice Check if a request hash exists
     * @param requestHash The request hash to check
     * @return exists Whether the request exists
     */
    function requestExists(bytes32 requestHash) external view returns (bool exists) {
        return _requestExists[requestHash];
    }

    /**
     * @notice Get pending validation requests for a validator (no response yet)
     * @param validatorAddress The validator address
     * @return pendingHashes Array of pending request hashes
     */
    function getPendingRequests(
        address validatorAddress
    ) external view returns (bytes32[] memory pendingHashes) {
        bytes32[] storage allRequests = _validatorRequests[validatorAddress];

        // Count pending
        uint256 pendingCount = 0;
        for (uint256 i = 0; i < allRequests.length; i++) {
            if (!_validations[allRequests[i]].hasResponse) {
                pendingCount++;
            }
        }

        // Allocate and populate
        pendingHashes = new bytes32[](pendingCount);
        uint256 index = 0;
        for (uint256 i = 0; i < allRequests.length; i++) {
            if (!_validations[allRequests[i]].hasResponse) {
                pendingHashes[index] = allRequests[i];
                index++;
            }
        }
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
     * @notice Check if an address is the owner or approved operator of an agent
     * @param agentId The agent ID
     * @param account The address to check
     * @return isOwnerOrOperator Whether the address is owner or operator
     */
    function _isAgentOwnerOrOperator(
        uint256 agentId,
        address account
    ) internal view returns (bool isOwnerOrOperator) {
        IERC721 registry = IERC721(identityRegistry);

        // Check if owner
        address owner = registry.ownerOf(agentId);
        if (account == owner) return true;

        // Check if approved for this token
        address approved = registry.getApproved(agentId);
        if (account == approved) return true;

        // Check if approved for all
        return registry.isApprovedForAll(owner, account);
    }
}
