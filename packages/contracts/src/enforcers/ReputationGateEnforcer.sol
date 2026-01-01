// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IEnvioReputationOracle.sol";
import "../interfaces/ICaveatEnforcer.sol";

/**
 * @title ReputationGateEnforcer
 * @author Echelon Team
 * @notice Custom caveat enforcer that gates permissions based on agent reputation scores
 * @dev This enforcer implements dynamic permission scaling:
 *      - Agents with low reputation can only execute small amounts
 *      - As reputation increases, the executable amount scales up
 *      - Maximum amount is capped at the user-defined ceiling
 *
 * This solves the "cold start" trust problem:
 *      - New agents start with minimal permissions
 *      - They earn the right to manage more funds through demonstrated performance
 *      - Users set the rules, not the agents
 *
 * Formula for active limit:
 *      If score <= minReputationScore: activeLimit = baseAmount
 *      Else: activeLimit = baseAmount + (maxAmount - baseAmount) * (score - minScore) / (100 - minScore)
 *
 * Example with baseAmount=1 USDC, maxAmount=100 USDC, minScore=40:
 *      - Score 40: 1 USDC (minimum)
 *      - Score 70: 51 USDC (halfway)
 *      - Score 100: 100 USDC (maximum)
 */
contract ReputationGateEnforcer is ICaveatEnforcer {
    // ============ State Variables ============

    /// @notice Reference to the Envio reputation oracle
    IEnvioReputationOracle public immutable reputationOracle;

    // ============ Structs ============

    /**
     * @notice Terms structure for this enforcer (ABI encoded in delegation)
     * @param agentAddress The agent's wallet address whose reputation to check
     * @param baseAmount Starting limit (e.g., 1 USDC = 1e6 with 6 decimals)
     * @param maxAmount Ceiling limit (e.g., 100 USDC = 100e6)
     * @param minReputationScore Minimum score required to execute (0-100)
     * @param maxStaleness Maximum age of reputation data in seconds (0 = no limit)
     */
    struct Terms {
        address agentAddress;
        uint256 baseAmount;
        uint256 maxAmount;
        uint8 minReputationScore;
        uint256 maxStaleness;
    }

    // ============ Errors ============

    /// @notice Thrown when agent's reputation is below the minimum threshold
    error ReputationTooLow(uint8 currentScore, uint8 requiredScore);

    /// @notice Thrown when requested amount exceeds the reputation-scaled limit
    error ExceedsReputationLimit(uint256 requestedAmount, uint256 activeLimit);

    /// @notice Thrown when reputation data is too old
    error StaleReputationData(uint256 lastUpdated, uint256 maxAge);

    /// @notice Thrown when terms are invalid
    error InvalidTerms(string reason);

    // ============ Events ============

    /// @notice Emitted when a delegation is validated (for debugging/logging)
    event DelegationValidated(
        address indexed agentAddress,
        uint8 reputationScore,
        uint256 activeLimit,
        uint256 requestedAmount
    );

    // ============ Constructor ============

    /**
     * @notice Initialize the enforcer with the reputation oracle address
     * @param _oracle Address of the EnvioReputationOracle contract
     */
    constructor(address _oracle) {
        require(_oracle != address(0), "Invalid oracle address");
        reputationOracle = IEnvioReputationOracle(_oracle);
    }

    // ============ ICaveatEnforcer Implementation ============

    /**
     * @notice Called before all actions in batch redemption
     * @dev No-op for this enforcer - validation happens in beforeHook
     */
    function beforeAllHook(
        bytes calldata _terms,
        bytes calldata _args,
        ModeCode _mode,
        bytes calldata _executionCalldata,
        bytes32 _delegationHash,
        address _delegator,
        address _redeemer
    ) external view override {
        // Validate terms structure early to fail fast
        Terms memory terms = abi.decode(_terms, (Terms));
        _validateTerms(terms);
    }

    /**
     * @notice Called before each execution - MAIN VALIDATION LOGIC
     * @dev Checks reputation score and calculates dynamic limit
     */
    function beforeHook(
        bytes calldata _terms,
        bytes calldata _args,
        ModeCode _mode,
        bytes calldata _executionCalldata,
        bytes32 _delegationHash,
        address _delegator,
        address _redeemer
    ) external view override {
        Terms memory terms = abi.decode(_terms, (Terms));

        // Get current reputation from oracle
        (uint8 score, uint256 lastUpdated) = reputationOracle.getAgentReputation(terms.agentAddress);

        // Check for stale reputation data
        if (terms.maxStaleness > 0 && lastUpdated != 0) {
            if (block.timestamp - lastUpdated > terms.maxStaleness) {
                revert StaleReputationData(lastUpdated, terms.maxStaleness);
            }
        }

        // Check minimum reputation threshold
        if (score < terms.minReputationScore) {
            revert ReputationTooLow(score, terms.minReputationScore);
        }

        // Calculate dynamic limit based on reputation
        uint256 activeLimit = _calculateActiveLimit(terms, score);

        // Extract amount from execution calldata
        uint256 requestedAmount = _extractTransferAmount(_executionCalldata);

        // Validate amount against reputation-scaled limit
        if (requestedAmount > activeLimit) {
            revert ExceedsReputationLimit(requestedAmount, activeLimit);
        }
    }

    /**
     * @notice Called after each execution
     * @dev No-op for this enforcer - all validation happens in beforeHook
     */
    function afterHook(
        bytes calldata _terms,
        bytes calldata _args,
        ModeCode _mode,
        bytes calldata _executionCalldata,
        bytes32 _delegationHash,
        address _delegator,
        address _redeemer
    ) external override {
        // No-op: all validation happens in beforeHook
    }

    /**
     * @notice Called after all actions in batch redemption
     * @dev No-op for this enforcer
     */
    function afterAllHook(
        bytes calldata _terms,
        bytes calldata _args,
        ModeCode _mode,
        bytes calldata _executionCalldata,
        bytes32 _delegationHash,
        address _delegator,
        address _redeemer
    ) external override {
        // No-op: all validation happens in beforeHook
    }

    // ============ View Functions ============

    /**
     * @notice Get the current active limit for an agent based on encoded terms
     * @dev Useful for frontends to display the current executable amount
     * @param _terms ABI-encoded Terms struct
     * @return activeLimit The current executable amount
     * @return currentScore The agent's current reputation score
     * @return isStale Whether the reputation data is considered stale
     */
    function getActiveLimit(bytes calldata _terms)
        external
        view
        returns (uint256 activeLimit, uint8 currentScore, bool isStale)
    {
        Terms memory terms = abi.decode(_terms, (Terms));

        uint256 lastUpdated;
        (currentScore, lastUpdated) = reputationOracle.getAgentReputation(terms.agentAddress);

        activeLimit = _calculateActiveLimit(terms, currentScore);

        isStale = terms.maxStaleness > 0 &&
            lastUpdated != 0 &&
            block.timestamp - lastUpdated > terms.maxStaleness;
    }

    /**
     * @notice Calculate the active limit for given terms and score
     * @param _terms ABI-encoded Terms struct
     * @param _score The reputation score to use
     * @return The calculated active limit
     */
    function calculateLimitForScore(bytes calldata _terms, uint8 _score)
        external
        pure
        returns (uint256)
    {
        Terms memory terms = abi.decode(_terms, (Terms));
        return _calculateActiveLimit(terms, _score);
    }

    /**
     * @notice Encode terms for use in delegation creation
     * @param agentAddress The agent's wallet address
     * @param baseAmount Starting limit amount
     * @param maxAmount Maximum limit amount
     * @param minReputationScore Minimum required reputation
     * @param maxStaleness Maximum data age in seconds
     * @return Encoded terms bytes
     */
    function encodeTerms(
        address agentAddress,
        uint256 baseAmount,
        uint256 maxAmount,
        uint8 minReputationScore,
        uint256 maxStaleness
    ) external pure returns (bytes memory) {
        return abi.encode(Terms({
            agentAddress: agentAddress,
            baseAmount: baseAmount,
            maxAmount: maxAmount,
            minReputationScore: minReputationScore,
            maxStaleness: maxStaleness
        }));
    }

    // ============ Internal Functions ============

    /**
     * @notice Calculate the active limit based on reputation score
     * @dev Linear interpolation between baseAmount and maxAmount based on score
     * @param terms The terms structure
     * @param score The current reputation score
     * @return The calculated active limit
     */
    function _calculateActiveLimit(Terms memory terms, uint8 score) internal pure returns (uint256) {
        // If below minimum score, only allow base amount
        if (score <= terms.minReputationScore) {
            return terms.baseAmount;
        }

        // If at or above 100, return max amount
        if (score >= 100) {
            return terms.maxAmount;
        }

        // Linear scaling between base and max based on score progress
        uint256 scoreRange = 100 - terms.minReputationScore;
        uint256 currentProgress = score - terms.minReputationScore;
        uint256 amountRange = terms.maxAmount - terms.baseAmount;

        return terms.baseAmount + (amountRange * currentProgress) / scoreRange;
    }

    /**
     * @notice Extract transfer amount from ERC20 transfer calldata
     * @dev Supports both transfer(address,uint256) and transferFrom(address,address,uint256)
     * @param calldata_ The execution calldata
     * @return The extracted amount, or 0 if not a recognized transfer
     */
    function _extractTransferAmount(bytes calldata calldata_) internal pure returns (uint256) {
        if (calldata_.length < 4) {
            return 0;
        }

        bytes4 selector = bytes4(calldata_[:4]);

        // ERC20.transfer(address,uint256) - selector: 0xa9059cbb
        if (selector == 0xa9059cbb && calldata_.length >= 68) {
            return abi.decode(calldata_[36:68], (uint256));
        }

        // ERC20.transferFrom(address,address,uint256) - selector: 0x23b872dd
        if (selector == 0x23b872dd && calldata_.length >= 100) {
            return abi.decode(calldata_[68:100], (uint256));
        }

        // ERC20.approve(address,uint256) - selector: 0x095ea7b3
        if (selector == 0x095ea7b3 && calldata_.length >= 68) {
            return abi.decode(calldata_[36:68], (uint256));
        }

        // Not a recognized ERC20 transfer - return 0 to allow through
        // (other caveats may restrict the action)
        return 0;
    }

    /**
     * @notice Validate terms structure
     * @param terms The terms to validate
     */
    function _validateTerms(Terms memory terms) internal pure {
        if (terms.agentAddress == address(0)) {
            revert InvalidTerms("Agent address cannot be zero");
        }
        if (terms.baseAmount > terms.maxAmount) {
            revert InvalidTerms("Base amount cannot exceed max amount");
        }
        if (terms.minReputationScore > 100) {
            revert InvalidTerms("Min reputation score cannot exceed 100");
        }
    }
}
