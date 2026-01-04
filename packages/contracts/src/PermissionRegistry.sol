// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title PermissionRegistry
 * @author Echelon Team
 * @notice On-chain registry for ERC-7715 permission grants
 * @dev Bridges off-chain MetaMask Flask permissions to on-chain tracking
 *
 * Flow:
 * 1. User grants ERC-7715 permission in MetaMask Flask (off-chain)
 * 2. Frontend calls recordPermission() to log it on-chain
 * 3. Indexer picks up PermissionGranted event
 * 4. Agent can query getPermission() or listen for events
 */
contract PermissionRegistry is Ownable, ReentrancyGuard {
    // ============ Structs ============

    struct Permission {
        address user; // The user who granted permission
        address agent; // The agent wallet that received permission
        address token; // Token address (e.g., USDC)
        uint256 amountPerPeriod; // Amount allowed per period
        uint256 periodDuration; // Period duration in seconds
        uint256 grantedAt; // Timestamp when permission was granted
        uint256 expiresAt; // Timestamp when permission expires
        bool isActive; // Whether permission is still active
        bytes32 permissionHash; // Hash of the ERC-7715 permission data (for verification)
    }

    // ============ State Variables ============

    /// @notice Mapping from permission ID to Permission struct
    mapping(bytes32 => Permission) public permissions;

    /// @notice Mapping from user => agent => permission ID (latest)
    mapping(address => mapping(address => bytes32)) public userAgentPermission;

    /// @notice List of all permission IDs for a user
    mapping(address => bytes32[]) public userPermissions;

    /// @notice List of all permission IDs for an agent
    mapping(address => bytes32[]) public agentPermissions;

    /// @notice Total permissions granted
    uint256 public totalPermissions;

    /// @notice Total active permissions
    uint256 public activePermissions;

    // ============ Events ============

    /// @notice Emitted when a permission is granted
    event PermissionGranted(
        bytes32 indexed permissionId,
        address indexed user,
        address indexed agent,
        address token,
        uint256 amountPerPeriod,
        uint256 periodDuration,
        uint256 expiresAt,
        bytes32 permissionHash
    );

    /// @notice Emitted when a permission is revoked
    event PermissionRevoked(
        bytes32 indexed permissionId, address indexed user, address indexed agent, uint256 revokedAt
    );

    /// @notice Emitted when a permission expires
    event PermissionExpired(
        bytes32 indexed permissionId, address indexed user, address indexed agent
    );

    // ============ Errors ============

    error InvalidAddress();
    error InvalidAmount();
    error InvalidDuration();
    error PermissionNotFound();
    error PermissionAlreadyRevoked();
    error NotPermissionOwner();
    error PermissionExpiredError();

    // ============ Constructor ============

    constructor() Ownable(msg.sender) { }

    // ============ External Functions ============

    /**
     * @notice Record a new ERC-7715 permission grant on-chain
     * @dev Called by the frontend after MetaMask Flask approves the permission
     * @param agent The agent wallet address
     * @param token The token address (e.g., USDC)
     * @param amountPerPeriod Amount allowed per period
     * @param periodDuration Period duration in seconds
     * @param expiresAt Expiration timestamp
     * @param permissionHash Hash of the off-chain permission data
     * @return permissionId The unique permission ID
     */
    function recordPermission(
        address agent,
        address token,
        uint256 amountPerPeriod,
        uint256 periodDuration,
        uint256 expiresAt,
        bytes32 permissionHash
    ) external nonReentrant returns (bytes32 permissionId) {
        if (agent == address(0)) revert InvalidAddress();
        if (token == address(0)) revert InvalidAddress();
        if (amountPerPeriod == 0) revert InvalidAmount();
        if (periodDuration == 0) revert InvalidDuration();
        if (expiresAt <= block.timestamp) revert InvalidDuration();

        // Generate unique permission ID
        permissionId =
            keccak256(abi.encodePacked(msg.sender, agent, token, block.timestamp, block.number));

        // Revoke any existing permission from this user to this agent
        bytes32 existingId = userAgentPermission[msg.sender][agent];
        if (existingId != bytes32(0) && permissions[existingId].isActive) {
            _revokePermission(existingId);
        }

        // Create permission
        permissions[permissionId] = Permission({
            user: msg.sender,
            agent: agent,
            token: token,
            amountPerPeriod: amountPerPeriod,
            periodDuration: periodDuration,
            grantedAt: block.timestamp,
            expiresAt: expiresAt,
            isActive: true,
            permissionHash: permissionHash
        });

        // Update mappings
        userAgentPermission[msg.sender][agent] = permissionId;
        userPermissions[msg.sender].push(permissionId);
        agentPermissions[agent].push(permissionId);

        // Update counters
        totalPermissions++;
        activePermissions++;

        emit PermissionGranted(
            permissionId,
            msg.sender,
            agent,
            token,
            amountPerPeriod,
            periodDuration,
            expiresAt,
            permissionHash
        );

        return permissionId;
    }

    /**
     * @notice Revoke a permission
     * @dev Can only be called by the user who granted the permission
     * @param permissionId The permission ID to revoke
     */
    function revokePermission(bytes32 permissionId) external nonReentrant {
        Permission storage perm = permissions[permissionId];

        if (perm.user == address(0)) revert PermissionNotFound();
        if (perm.user != msg.sender) revert NotPermissionOwner();
        if (!perm.isActive) revert PermissionAlreadyRevoked();

        _revokePermission(permissionId);
    }

    /**
     * @notice Get permission details
     * @param permissionId The permission ID
     * @return The Permission struct
     */
    function getPermission(bytes32 permissionId) external view returns (Permission memory) {
        return permissions[permissionId];
    }

    /**
     * @notice Get the active permission from a user to an agent
     * @param user The user address
     * @param agent The agent address
     * @return The Permission struct (or empty if none)
     */
    function getActivePermission(address user, address agent)
        external
        view
        returns (Permission memory)
    {
        bytes32 permissionId = userAgentPermission[user][agent];
        if (permissionId == bytes32(0)) {
            return Permission(address(0), address(0), address(0), 0, 0, 0, 0, false, bytes32(0));
        }

        Permission memory perm = permissions[permissionId];

        // Check if expired
        if (perm.expiresAt <= block.timestamp) {
            perm.isActive = false;
        }

        return perm;
    }

    /**
     * @notice Check if a permission is active
     * @param permissionId The permission ID
     * @return True if active and not expired
     */
    function isPermissionActive(bytes32 permissionId) external view returns (bool) {
        Permission memory perm = permissions[permissionId];
        return perm.isActive && perm.expiresAt > block.timestamp;
    }

    /**
     * @notice Get all permission IDs for a user
     * @param user The user address
     * @return Array of permission IDs
     */
    function getUserPermissions(address user) external view returns (bytes32[] memory) {
        return userPermissions[user];
    }

    /**
     * @notice Get all permission IDs for an agent
     * @param agent The agent address
     * @return Array of permission IDs
     */
    function getAgentPermissions(address agent) external view returns (bytes32[] memory) {
        return agentPermissions[agent];
    }

    /**
     * @notice Get count of active permissions for a user
     * @param user The user address
     * @return Count of active permissions
     */
    function getUserActivePermissionCount(address user) external view returns (uint256) {
        bytes32[] memory permIds = userPermissions[user];
        uint256 count = 0;

        for (uint256 i = 0; i < permIds.length; i++) {
            Permission memory perm = permissions[permIds[i]];
            if (perm.isActive && perm.expiresAt > block.timestamp) {
                count++;
            }
        }

        return count;
    }

    // ============ Internal Functions ============

    /**
     * @notice Internal function to revoke a permission
     * @param permissionId The permission ID to revoke
     */
    function _revokePermission(bytes32 permissionId) internal {
        Permission storage perm = permissions[permissionId];
        perm.isActive = false;
        activePermissions--;

        emit PermissionRevoked(permissionId, perm.user, perm.agent, block.timestamp);
    }

    // ============ Admin Functions ============

    /**
     * @notice Mark expired permissions as inactive (gas-efficient batch)
     * @dev Can be called by anyone to clean up expired permissions
     * @param permissionIds Array of permission IDs to check
     */
    function cleanupExpiredPermissions(bytes32[] calldata permissionIds) external {
        for (uint256 i = 0; i < permissionIds.length; i++) {
            Permission storage perm = permissions[permissionIds[i]];
            if (perm.isActive && perm.expiresAt <= block.timestamp) {
                perm.isActive = false;
                activePermissions--;

                emit PermissionExpired(permissionIds[i], perm.user, perm.agent);
            }
        }
    }
}
