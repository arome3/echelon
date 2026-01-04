// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IEnvioReputationOracle.sol";

/**
 * @title EnvioReputationOracle
 * @author Echelon Team
 * @notice On-chain oracle for agent reputation scores, updated by Envio sync service
 * @dev This oracle stores reputation scores that are pushed from an off-chain service
 *      that reads from Envio's indexer. Scores are used by the ReputationGateEnforcer
 *      to dynamically adjust permission limits based on agent performance.
 *
 * Architecture:
 *   Envio Indexer → Off-chain Sync Service → This Oracle → ReputationGateEnforcer
 */
contract EnvioReputationOracle is IEnvioReputationOracle, Ownable {
    // ============ State Variables ============

    /// @notice Mapping from agent address to their reputation score (0-100)
    mapping(address => uint8) private _agentScores;

    /// @notice Mapping from agent address to timestamp of last score update
    mapping(address => uint256) private _lastUpdated;

    /// @notice Address authorized to push reputation updates (the sync service)
    address public envioUpdater;

    /// @notice Default score for agents that haven't been rated yet
    uint256 public constant DEFAULT_NEUTRAL_SCORE = 50;

    /// @notice Maximum allowed score value
    uint8 public constant MAX_SCORE = 100;

    // ============ Errors ============

    /// @notice Thrown when caller is not authorized to update reputations
    error Unauthorized();

    /// @notice Thrown when score exceeds maximum allowed value
    error ScoreExceedsMaximum(uint8 score, uint8 maximum);

    /// @notice Thrown when batch update arrays have mismatched lengths
    error ArrayLengthMismatch(uint256 agentsLength, uint256 scoresLength);

    /// @notice Thrown when trying to set zero address as updater
    error ZeroAddressNotAllowed();

    // ============ Constructor ============

    /**
     * @notice Initialize the oracle with the deployer as owner
     */
    constructor() Ownable(msg.sender) { }

    // ============ Modifiers ============

    /**
     * @notice Restrict function access to Envio updater or owner
     */
    modifier onlyEnvioUpdater() {
        if (msg.sender != envioUpdater && msg.sender != owner()) {
            revert Unauthorized();
        }
        _;
    }

    // ============ Admin Functions ============

    /**
     * @notice Set the address authorized to push reputation updates
     * @param _updater The new Envio updater address
     */
    function setEnvioUpdater(address _updater) external onlyOwner {
        if (_updater == address(0)) {
            revert ZeroAddressNotAllowed();
        }
        address oldUpdater = envioUpdater;
        envioUpdater = _updater;
        emit UpdaterChanged(oldUpdater, _updater);
    }

    // ============ Update Functions ============

    /**
     * @notice Update the reputation score for a single agent
     * @param agent The agent's wallet address
     * @param score The new reputation score (0-100)
     */
    function updateReputation(address agent, uint8 score) external onlyEnvioUpdater {
        if (score > MAX_SCORE) {
            revert ScoreExceedsMaximum(score, MAX_SCORE);
        }

        _agentScores[agent] = score;
        _lastUpdated[agent] = block.timestamp;

        emit ReputationUpdated(agent, score, block.timestamp);
    }

    /**
     * @notice Batch update reputation scores for multiple agents
     * @dev More gas-efficient than multiple single updates for the sync service
     * @param agents Array of agent wallet addresses
     * @param scores Array of corresponding reputation scores (0-100)
     */
    function batchUpdateReputation(address[] calldata agents, uint8[] calldata scores)
        external
        onlyEnvioUpdater
    {
        if (agents.length != scores.length) {
            revert ArrayLengthMismatch(agents.length, scores.length);
        }

        uint256 timestamp = block.timestamp;

        for (uint256 i = 0; i < agents.length; i++) {
            if (scores[i] > MAX_SCORE) {
                revert ScoreExceedsMaximum(scores[i], MAX_SCORE);
            }

            _agentScores[agents[i]] = scores[i];
            _lastUpdated[agents[i]] = timestamp;

            emit ReputationUpdated(agents[i], scores[i], timestamp);
        }
    }

    // ============ View Functions ============

    /**
     * @notice Get the reputation score for an agent
     * @param agent The agent's wallet address
     * @return score The reputation score (0-100). Returns DEFAULT_NEUTRAL_SCORE if never updated.
     * @return lastUpdated Timestamp of the last update. Returns 0 if never updated.
     */
    function getAgentReputation(address agent)
        external
        view
        returns (uint8 score, uint256 lastUpdated)
    {
        lastUpdated = _lastUpdated[agent];

        if (lastUpdated == 0) {
            // Agent has never been rated, return neutral score
            return (uint8(DEFAULT_NEUTRAL_SCORE), 0);
        }

        return (_agentScores[agent], lastUpdated);
    }

    /**
     * @notice Check if an agent has been rated
     * @param agent The agent's wallet address
     * @return True if the agent has received at least one reputation update
     */
    function hasBeenRated(address agent) external view returns (bool) {
        return _lastUpdated[agent] > 0;
    }

    /**
     * @notice Get the raw score for an agent (0 if never updated)
     * @param agent The agent's wallet address
     * @return The raw score value
     */
    function getRawScore(address agent) external view returns (uint8) {
        return _agentScores[agent];
    }

    /**
     * @notice Get the last update timestamp for an agent
     * @param agent The agent's wallet address
     * @return The timestamp of last update (0 if never updated)
     */
    function getLastUpdateTime(address agent) external view returns (uint256) {
        return _lastUpdated[agent];
    }
}
