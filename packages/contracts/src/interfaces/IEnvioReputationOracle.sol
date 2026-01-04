// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title IEnvioReputationOracle
 * @author Echelon Team
 * @notice Interface for the Envio Reputation Oracle that stores agent reputation scores on-chain
 * @dev Reputation scores are pushed by an off-chain service that reads from Envio's indexer
 */
interface IEnvioReputationOracle {
    // ============ Events ============

    /// @notice Emitted when an agent's reputation score is updated
    event ReputationUpdated(address indexed agent, uint8 score, uint256 timestamp);

    /// @notice Emitted when the Envio updater address is changed
    event UpdaterChanged(address indexed oldUpdater, address indexed newUpdater);

    // ============ View Functions ============

    /**
     * @notice Get the reputation score for an agent
     * @param agent The agent's wallet address
     * @return score The reputation score (0-100)
     * @return lastUpdated Timestamp of the last update (0 if never updated)
     */
    function getAgentReputation(address agent)
        external
        view
        returns (uint8 score, uint256 lastUpdated);

    /**
     * @notice Get the default neutral score for new agents
     * @return The default score (typically 50)
     */
    function DEFAULT_NEUTRAL_SCORE() external view returns (uint256);

    /**
     * @notice Get the address authorized to push reputation updates
     * @return The Envio updater address
     */
    function envioUpdater() external view returns (address);

    // ============ Mutating Functions ============

    /**
     * @notice Update the reputation score for a single agent
     * @dev Only callable by the Envio updater or contract owner
     * @param agent The agent's wallet address
     * @param score The new reputation score (0-100)
     */
    function updateReputation(address agent, uint8 score) external;

    /**
     * @notice Batch update reputation scores for multiple agents
     * @dev Only callable by the Envio updater or contract owner
     * @dev More gas-efficient than multiple single updates
     * @param agents Array of agent wallet addresses
     * @param scores Array of corresponding reputation scores (0-100)
     */
    function batchUpdateReputation(address[] calldata agents, uint8[] calldata scores) external;

    /**
     * @notice Set the address authorized to push reputation updates
     * @dev Only callable by contract owner
     * @param updater The new Envio updater address
     */
    function setEnvioUpdater(address updater) external;
}
