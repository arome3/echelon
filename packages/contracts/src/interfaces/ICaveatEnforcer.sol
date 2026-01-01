// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title ModeCode
 * @notice Execution mode for delegation redemption
 * @dev Matches the ModeCode type from MetaMask's delegation-framework
 */
type ModeCode is bytes32;

/**
 * @title ICaveatEnforcer
 * @author MetaMask (interface) / Echelon Team (local copy)
 * @notice Interface for caveat enforcers in the MetaMask delegation framework
 * @dev This is a local copy of the interface from @metamask/delegation-framework
 *      to avoid requiring the full framework as a dependency.
 *
 * Caveat enforcers are called at different stages of delegation redemption:
 * 1. beforeAllHook - Called once before any actions in a batch
 * 2. beforeHook - Called before each individual execution
 * 3. afterHook - Called after each individual execution
 * 4. afterAllHook - Called once after all actions in a batch
 *
 * @custom:see https://github.com/MetaMask/delegation-framework
 */
interface ICaveatEnforcer {
    /**
     * @notice Enforces conditions before any actions in a batch redemption process begin
     * @param _terms The terms to enforce, set by the delegator (ABI encoded)
     * @param _args Optional input parameter set by the redeemer at invocation time
     * @param _mode The mode of execution for the executionCalldata
     * @param _executionCalldata The data representing the execution
     * @param _delegationHash The hash of the delegation being redeemed
     * @param _delegator The address of the delegator
     * @param _redeemer The address that is redeeming the delegation
     */
    function beforeAllHook(
        bytes calldata _terms,
        bytes calldata _args,
        ModeCode _mode,
        bytes calldata _executionCalldata,
        bytes32 _delegationHash,
        address _delegator,
        address _redeemer
    ) external;

    /**
     * @notice Enforces conditions before the execution tied to a specific delegation
     * @param _terms The terms to enforce, set by the delegator (ABI encoded)
     * @param _args Optional input parameter set by the redeemer at invocation time
     * @param _mode The mode of execution for the executionCalldata
     * @param _executionCalldata The data representing the execution
     * @param _delegationHash The hash of the delegation being redeemed
     * @param _delegator The address of the delegator
     * @param _redeemer The address that is redeeming the delegation
     */
    function beforeHook(
        bytes calldata _terms,
        bytes calldata _args,
        ModeCode _mode,
        bytes calldata _executionCalldata,
        bytes32 _delegationHash,
        address _delegator,
        address _redeemer
    ) external;

    /**
     * @notice Enforces conditions after the execution tied to a specific delegation
     * @param _terms The terms to enforce, set by the delegator (ABI encoded)
     * @param _args Optional input parameter set by the redeemer at invocation time
     * @param _mode The mode of execution for the executionCalldata
     * @param _executionCalldata The data representing the execution
     * @param _delegationHash The hash of the delegation being redeemed
     * @param _delegator The address of the delegator
     * @param _redeemer The address that is redeeming the delegation
     */
    function afterHook(
        bytes calldata _terms,
        bytes calldata _args,
        ModeCode _mode,
        bytes calldata _executionCalldata,
        bytes32 _delegationHash,
        address _delegator,
        address _redeemer
    ) external;

    /**
     * @notice Enforces conditions after all actions in a batch redemption process
     * @param _terms The terms to enforce, set by the delegator (ABI encoded)
     * @param _args Optional input parameter set by the redeemer at invocation time
     * @param _mode The mode of execution for the executionCalldata
     * @param _executionCalldata The data representing the execution
     * @param _delegationHash The hash of the delegation being redeemed
     * @param _delegator The address of the delegator
     * @param _redeemer The address that is redeeming the delegation
     */
    function afterAllHook(
        bytes calldata _terms,
        bytes calldata _args,
        ModeCode _mode,
        bytes calldata _executionCalldata,
        bytes32 _delegationHash,
        address _delegator,
        address _redeemer
    ) external;
}
