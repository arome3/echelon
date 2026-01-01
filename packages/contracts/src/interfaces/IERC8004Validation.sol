// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IERC8004Validation
 * @notice ERC-8004 Validation Registry interface for agent work verification
 * @dev Manages validation requests and responses from authorized validators
 */
interface IERC8004Validation {
    // ============ Events ============

    /**
     * @notice Emitted when a validation request is created
     * @param validatorAddress The validator being requested to validate
     * @param agentId The agent requesting validation
     * @param requestUri URI to the validation request details
     * @param requestHash Unique hash identifying this validation request
     */
    event ValidationRequest(
        address indexed validatorAddress,
        uint256 indexed agentId,
        string requestUri,
        bytes32 indexed requestHash
    );

    /**
     * @notice Emitted when a validator responds to a request
     * @param validatorAddress The validator providing the response
     * @param agentId The agent being validated
     * @param requestHash The request being responded to
     * @param response Validation response score (0-100)
     * @param responseUri URI to detailed response content
     * @param tag Categorization tag for the validation
     */
    event ValidationResponse(
        address indexed validatorAddress,
        uint256 indexed agentId,
        bytes32 indexed requestHash,
        uint8 response,
        string responseUri,
        bytes32 tag
    );

    // ============ Core Functions ============

    /**
     * @notice Get the address of the associated Identity Registry
     * @return identityRegistry The Identity Registry contract address
     */
    function getIdentityRegistry() external view returns (address identityRegistry);

    /**
     * @notice Create a validation request for an agent
     * @dev Only callable by the agent's owner or operator
     * @param validatorAddress The address of the validator to request
     * @param agentId The agent requesting validation
     * @param requestUri URI pointing to validation request details
     * @param requestHash Unique hash identifying this request
     */
    function validationRequest(
        address validatorAddress,
        uint256 agentId,
        string calldata requestUri,
        bytes32 requestHash
    ) external;

    /**
     * @notice Submit a validation response
     * @dev Only callable by the validator specified in the request
     * @param requestHash The request hash to respond to
     * @param response Validation response score (0-100, where 100 is fully validated)
     * @param responseUri URI to detailed response content
     * @param responseHash Hash of the response content for verification
     * @param tag Categorization tag for this validation
     */
    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseUri,
        bytes32 responseHash,
        bytes32 tag
    ) external;

    // ============ View Functions ============

    /**
     * @notice Get the current status of a validation request
     * @param requestHash The request hash to query
     * @return validatorAddress The validator assigned to this request
     * @return agentId The agent being validated
     * @return response The current response score (0 if not yet responded)
     * @return tag The categorization tag
     * @return lastUpdate Timestamp of the last update
     */
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
        );

    /**
     * @notice Get aggregated validation summary for an agent
     * @param agentId The agent to get summary for
     * @param validatorAddresses Filter by specific validators (empty array for all)
     * @param tag Filter by tag (bytes32(0) for all)
     * @return count Total number of validation responses
     * @return avgResponse Average response score
     */
    function getSummary(
        uint256 agentId,
        address[] calldata validatorAddresses,
        bytes32 tag
    ) external view returns (uint64 count, uint8 avgResponse);

    /**
     * @notice Get all validation request hashes for an agent
     * @param agentId The agent to query
     * @return requestHashes Array of validation request hashes
     */
    function getAgentValidations(
        uint256 agentId
    ) external view returns (bytes32[] memory requestHashes);

    /**
     * @notice Get all validation requests assigned to a validator
     * @param validatorAddress The validator to query
     * @return requestHashes Array of validation request hashes
     */
    function getValidatorRequests(
        address validatorAddress
    ) external view returns (bytes32[] memory requestHashes);
}
