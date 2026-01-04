// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/PermissionRegistry.sol";

/**
 * @title PermissionRegistryTest
 * @notice Comprehensive tests for the PermissionRegistry contract
 * @dev Tests cover ERC-7715 permission recording, revocation, and querying
 */
contract PermissionRegistryTest is Test {
    // ============ State Variables ============

    PermissionRegistry public registry;

    // Test addresses
    address public owner;
    address public user1;
    address public user2;
    address public agent1;
    address public agent2;
    address public token;

    // Test constants
    uint256 constant AMOUNT_PER_PERIOD = 1000e6; // 1000 USDC
    uint256 constant PERIOD_DURATION = 1 days;
    uint256 constant EXPIRY_DURATION = 30 days;

    // ============ Events (for testing emissions) ============

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

    event PermissionRevoked(
        bytes32 indexed permissionId, address indexed user, address indexed agent, uint256 revokedAt
    );

    event PermissionExpired(
        bytes32 indexed permissionId, address indexed user, address indexed agent
    );

    // ============ Setup ============

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        agent1 = makeAddr("agent1");
        agent2 = makeAddr("agent2");
        token = makeAddr("token");

        registry = new PermissionRegistry();

        // Fund test addresses with ETH for gas
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
    }

    // ============ Helper Functions ============

    function _recordPermission(
        address user,
        address agent,
        uint256 amountPerPeriod,
        uint256 periodDuration,
        uint256 expiryDays
    ) internal returns (bytes32) {
        vm.prank(user);
        return registry.recordPermission(
            agent,
            token,
            amountPerPeriod,
            periodDuration,
            block.timestamp + expiryDays * 1 days,
            keccak256(abi.encodePacked(user, agent, block.timestamp))
        );
    }

    function _recordDefaultPermission(address user, address agent) internal returns (bytes32) {
        return _recordPermission(user, agent, AMOUNT_PER_PERIOD, PERIOD_DURATION, 30);
    }

    // ============ Constructor Tests ============

    function test_Deployment_OwnerIsDeployer() public view {
        assertEq(registry.owner(), owner);
    }

    function test_Deployment_InitialCountersAreZero() public view {
        assertEq(registry.totalPermissions(), 0);
        assertEq(registry.activePermissions(), 0);
    }

    // ============ Record Permission Tests ============

    function test_RecordPermission() public {
        bytes32 permissionId = _recordDefaultPermission(user1, agent1);

        // Verify permission was recorded
        PermissionRegistry.Permission memory perm = registry.getPermission(permissionId);
        assertEq(perm.user, user1);
        assertEq(perm.agent, agent1);
        assertEq(perm.token, token);
        assertEq(perm.amountPerPeriod, AMOUNT_PER_PERIOD);
        assertEq(perm.periodDuration, PERIOD_DURATION);
        assertTrue(perm.isActive);
    }

    function test_RecordPermission_EmitsEvent() public {
        uint256 expiresAt = block.timestamp + 30 days;
        bytes32 permissionHash = keccak256(abi.encodePacked(user1, agent1, block.timestamp));

        vm.prank(user1);
        vm.expectEmit(false, true, true, true); // permissionId is dynamic, so skip checking it
        emit PermissionGranted(
            bytes32(0), // Will be different
            user1,
            agent1,
            token,
            AMOUNT_PER_PERIOD,
            PERIOD_DURATION,
            expiresAt,
            permissionHash
        );

        registry.recordPermission(
            agent1, token, AMOUNT_PER_PERIOD, PERIOD_DURATION, expiresAt, permissionHash
        );
    }

    function test_RecordPermission_UpdatesCounters() public {
        _recordDefaultPermission(user1, agent1);

        assertEq(registry.totalPermissions(), 1);
        assertEq(registry.activePermissions(), 1);

        _recordDefaultPermission(user2, agent1);

        assertEq(registry.totalPermissions(), 2);
        assertEq(registry.activePermissions(), 2);
    }

    function test_RecordPermission_UpdatesMappings() public {
        bytes32 permissionId = _recordDefaultPermission(user1, agent1);

        // Check user-agent mapping
        assertEq(registry.userAgentPermission(user1, agent1), permissionId);

        // Check user permissions array
        bytes32[] memory userPerms = registry.getUserPermissions(user1);
        assertEq(userPerms.length, 1);
        assertEq(userPerms[0], permissionId);

        // Check agent permissions array
        bytes32[] memory agentPerms = registry.getAgentPermissions(agent1);
        assertEq(agentPerms.length, 1);
        assertEq(agentPerms[0], permissionId);
    }

    function test_RecordPermission_RevokesExistingPermission() public {
        // Record first permission
        bytes32 permissionId1 = _recordDefaultPermission(user1, agent1);
        assertTrue(registry.isPermissionActive(permissionId1));

        // Record second permission (same user -> same agent)
        vm.warp(block.timestamp + 1); // Advance time to get different permissionId
        bytes32 permissionId2 = _recordDefaultPermission(user1, agent1);

        // First permission should be revoked
        assertFalse(registry.isPermissionActive(permissionId1));
        // Second permission should be active
        assertTrue(registry.isPermissionActive(permissionId2));

        // Active permissions should still be 1
        assertEq(registry.activePermissions(), 1);
        // Total should be 2
        assertEq(registry.totalPermissions(), 2);
    }

    function test_RecordPermission_AllowsMultipleAgents() public {
        bytes32 perm1 = _recordDefaultPermission(user1, agent1);
        bytes32 perm2 = _recordDefaultPermission(user1, agent2);

        assertTrue(registry.isPermissionActive(perm1));
        assertTrue(registry.isPermissionActive(perm2));
        assertEq(registry.activePermissions(), 2);
    }

    function test_RecordPermission_AllowsMultipleUsers() public {
        bytes32 perm1 = _recordDefaultPermission(user1, agent1);
        bytes32 perm2 = _recordDefaultPermission(user2, agent1);

        assertTrue(registry.isPermissionActive(perm1));
        assertTrue(registry.isPermissionActive(perm2));
        assertEq(registry.activePermissions(), 2);
    }

    // ============ Record Permission Revert Tests ============

    function test_RevertWhen_RecordPermission_ZeroAgent() public {
        vm.prank(user1);
        vm.expectRevert(PermissionRegistry.InvalidAddress.selector);
        registry.recordPermission(
            address(0),
            token,
            AMOUNT_PER_PERIOD,
            PERIOD_DURATION,
            block.timestamp + 30 days,
            bytes32(0)
        );
    }

    function test_RevertWhen_RecordPermission_ZeroToken() public {
        vm.prank(user1);
        vm.expectRevert(PermissionRegistry.InvalidAddress.selector);
        registry.recordPermission(
            agent1,
            address(0),
            AMOUNT_PER_PERIOD,
            PERIOD_DURATION,
            block.timestamp + 30 days,
            bytes32(0)
        );
    }

    function test_RevertWhen_RecordPermission_ZeroAmount() public {
        vm.prank(user1);
        vm.expectRevert(PermissionRegistry.InvalidAmount.selector);
        registry.recordPermission(
            agent1, token, 0, PERIOD_DURATION, block.timestamp + 30 days, bytes32(0)
        );
    }

    function test_RevertWhen_RecordPermission_ZeroPeriod() public {
        vm.prank(user1);
        vm.expectRevert(PermissionRegistry.InvalidDuration.selector);
        registry.recordPermission(
            agent1, token, AMOUNT_PER_PERIOD, 0, block.timestamp + 30 days, bytes32(0)
        );
    }

    function test_RevertWhen_RecordPermission_ExpiredExpiry() public {
        vm.prank(user1);
        vm.expectRevert(PermissionRegistry.InvalidDuration.selector);
        registry.recordPermission(
            agent1,
            token,
            AMOUNT_PER_PERIOD,
            PERIOD_DURATION,
            block.timestamp, // Expires now or in the past
            bytes32(0)
        );
    }

    function test_RevertWhen_RecordPermission_PastExpiry() public {
        vm.prank(user1);
        vm.expectRevert(PermissionRegistry.InvalidDuration.selector);
        registry.recordPermission(
            agent1,
            token,
            AMOUNT_PER_PERIOD,
            PERIOD_DURATION,
            block.timestamp - 1, // In the past
            bytes32(0)
        );
    }

    // ============ Revoke Permission Tests ============

    function test_RevokePermission() public {
        bytes32 permissionId = _recordDefaultPermission(user1, agent1);
        assertTrue(registry.isPermissionActive(permissionId));

        vm.prank(user1);
        registry.revokePermission(permissionId);

        assertFalse(registry.isPermissionActive(permissionId));
        assertEq(registry.activePermissions(), 0);
    }

    function test_RevokePermission_EmitsEvent() public {
        bytes32 permissionId = _recordDefaultPermission(user1, agent1);

        vm.prank(user1);
        vm.expectEmit(true, true, true, false);
        emit PermissionRevoked(permissionId, user1, agent1, block.timestamp);
        registry.revokePermission(permissionId);
    }

    function test_RevertWhen_RevokePermission_NotFound() public {
        bytes32 fakeId = keccak256("fake");

        vm.prank(user1);
        vm.expectRevert(PermissionRegistry.PermissionNotFound.selector);
        registry.revokePermission(fakeId);
    }

    function test_RevertWhen_RevokePermission_NotOwner() public {
        bytes32 permissionId = _recordDefaultPermission(user1, agent1);

        vm.prank(user2); // Wrong user
        vm.expectRevert(PermissionRegistry.NotPermissionOwner.selector);
        registry.revokePermission(permissionId);
    }

    function test_RevertWhen_RevokePermission_AlreadyRevoked() public {
        bytes32 permissionId = _recordDefaultPermission(user1, agent1);

        vm.prank(user1);
        registry.revokePermission(permissionId);

        vm.prank(user1);
        vm.expectRevert(PermissionRegistry.PermissionAlreadyRevoked.selector);
        registry.revokePermission(permissionId);
    }

    // ============ Query Tests ============

    function test_GetPermission() public {
        bytes32 permissionId = _recordDefaultPermission(user1, agent1);

        PermissionRegistry.Permission memory perm = registry.getPermission(permissionId);

        assertEq(perm.user, user1);
        assertEq(perm.agent, agent1);
        assertEq(perm.token, token);
        assertEq(perm.amountPerPeriod, AMOUNT_PER_PERIOD);
        assertEq(perm.periodDuration, PERIOD_DURATION);
        assertTrue(perm.isActive);
    }

    function test_GetActivePermission() public {
        _recordDefaultPermission(user1, agent1);

        PermissionRegistry.Permission memory perm = registry.getActivePermission(user1, agent1);

        assertEq(perm.user, user1);
        assertEq(perm.agent, agent1);
        assertTrue(perm.isActive);
    }

    function test_GetActivePermission_ReturnsEmptyIfNone() public view {
        PermissionRegistry.Permission memory perm = registry.getActivePermission(user1, agent1);

        assertEq(perm.user, address(0));
        assertEq(perm.agent, address(0));
        assertFalse(perm.isActive);
    }

    function test_GetActivePermission_ReturnsInactiveIfExpired() public {
        _recordDefaultPermission(user1, agent1);

        // Warp past expiry
        vm.warp(block.timestamp + 31 days);

        PermissionRegistry.Permission memory perm = registry.getActivePermission(user1, agent1);

        assertEq(perm.user, user1);
        assertEq(perm.agent, agent1);
        assertFalse(perm.isActive); // Should be marked inactive due to expiry
    }

    function test_IsPermissionActive() public {
        bytes32 permissionId = _recordDefaultPermission(user1, agent1);

        assertTrue(registry.isPermissionActive(permissionId));

        vm.prank(user1);
        registry.revokePermission(permissionId);

        assertFalse(registry.isPermissionActive(permissionId));
    }

    function test_IsPermissionActive_ReturnsFalseAfterExpiry() public {
        bytes32 permissionId = _recordDefaultPermission(user1, agent1);

        assertTrue(registry.isPermissionActive(permissionId));

        // Warp past expiry
        vm.warp(block.timestamp + 31 days);

        assertFalse(registry.isPermissionActive(permissionId));
    }

    function test_GetUserPermissions() public {
        bytes32 perm1 = _recordDefaultPermission(user1, agent1);
        bytes32 perm2 = _recordDefaultPermission(user1, agent2);

        bytes32[] memory perms = registry.getUserPermissions(user1);

        assertEq(perms.length, 2);
        assertEq(perms[0], perm1);
        assertEq(perms[1], perm2);
    }

    function test_GetAgentPermissions() public {
        bytes32 perm1 = _recordDefaultPermission(user1, agent1);
        bytes32 perm2 = _recordDefaultPermission(user2, agent1);

        bytes32[] memory perms = registry.getAgentPermissions(agent1);

        assertEq(perms.length, 2);
        assertEq(perms[0], perm1);
        assertEq(perms[1], perm2);
    }

    function test_GetUserActivePermissionCount() public {
        // Create 3 permissions for user1
        _recordDefaultPermission(user1, agent1);
        _recordDefaultPermission(user1, agent2);
        address agent3 = makeAddr("agent3");
        _recordDefaultPermission(user1, agent3);

        assertEq(registry.getUserActivePermissionCount(user1), 3);

        // Revoke one
        bytes32 permToRevoke = registry.userAgentPermission(user1, agent2);
        vm.prank(user1);
        registry.revokePermission(permToRevoke);

        assertEq(registry.getUserActivePermissionCount(user1), 2);
    }

    function test_GetUserActivePermissionCount_ExcludesExpired() public {
        // Create permission that expires in 1 day
        _recordPermission(user1, agent1, AMOUNT_PER_PERIOD, PERIOD_DURATION, 1);
        // Create permission that expires in 30 days
        _recordPermission(user1, agent2, AMOUNT_PER_PERIOD, PERIOD_DURATION, 30);

        assertEq(registry.getUserActivePermissionCount(user1), 2);

        // Warp past first expiry but before second
        vm.warp(block.timestamp + 2 days);

        assertEq(registry.getUserActivePermissionCount(user1), 1);
    }

    // ============ Cleanup Tests ============

    function test_CleanupExpiredPermissions() public {
        // Create permissions with different expiry times
        bytes32 perm1 = _recordPermission(user1, agent1, AMOUNT_PER_PERIOD, PERIOD_DURATION, 1);
        bytes32 perm2 = _recordPermission(user1, agent2, AMOUNT_PER_PERIOD, PERIOD_DURATION, 30);

        assertEq(registry.activePermissions(), 2);

        // Warp past first expiry
        vm.warp(block.timestamp + 2 days);

        // Cleanup expired permissions
        bytes32[] memory toCleanup = new bytes32[](2);
        toCleanup[0] = perm1;
        toCleanup[1] = perm2;

        vm.expectEmit(true, true, true, false);
        emit PermissionExpired(perm1, user1, agent1);
        registry.cleanupExpiredPermissions(toCleanup);

        // perm1 should be inactive, perm2 should still be active
        assertFalse(registry.isPermissionActive(perm1));
        assertTrue(registry.isPermissionActive(perm2));
        assertEq(registry.activePermissions(), 1);
    }

    function test_CleanupExpiredPermissions_NoOpIfNotExpired() public {
        bytes32 perm1 = _recordDefaultPermission(user1, agent1);

        bytes32[] memory toCleanup = new bytes32[](1);
        toCleanup[0] = perm1;

        registry.cleanupExpiredPermissions(toCleanup);

        assertTrue(registry.isPermissionActive(perm1));
        assertEq(registry.activePermissions(), 1);
    }

    function test_CleanupExpiredPermissions_NoOpIfAlreadyInactive() public {
        bytes32 perm1 = _recordDefaultPermission(user1, agent1);

        vm.prank(user1);
        registry.revokePermission(perm1);

        // Warp past expiry
        vm.warp(block.timestamp + 31 days);

        uint256 activeBefore = registry.activePermissions();

        bytes32[] memory toCleanup = new bytes32[](1);
        toCleanup[0] = perm1;

        registry.cleanupExpiredPermissions(toCleanup);

        // Should not change active count since it was already inactive
        assertEq(registry.activePermissions(), activeBefore);
    }

    function test_CleanupExpiredPermissions_BatchCleanup() public {
        // Create 5 permissions with staggered expiries
        bytes32[] memory perms = new bytes32[](5);
        for (uint256 i = 0; i < 5; i++) {
            address agent = makeAddr(string(abi.encodePacked("agent", i)));
            perms[i] = _recordPermission(user1, agent, AMOUNT_PER_PERIOD, PERIOD_DURATION, i + 1);
        }

        assertEq(registry.activePermissions(), 5);

        // Warp past 3 permissions (expiry uses > not >=, so day 4 expires too)
        vm.warp(block.timestamp + 4 days);

        registry.cleanupExpiredPermissions(perms);

        // Permissions expire when expiresAt <= block.timestamp
        // Day 1, 2, 3, 4 all <= current time, only day 5 is still active
        assertEq(registry.activePermissions(), 1);
    }

    // ============ Fuzz Tests ============

    function testFuzz_RecordPermission_ValidAmounts(uint256 amount) public {
        vm.assume(amount > 0 && amount < type(uint128).max);

        bytes32 permissionId = _recordPermission(user1, agent1, amount, PERIOD_DURATION, 30);

        PermissionRegistry.Permission memory perm = registry.getPermission(permissionId);
        assertEq(perm.amountPerPeriod, amount);
    }

    function testFuzz_RecordPermission_ValidPeriods(uint256 period) public {
        vm.assume(period > 0 && period < 365 days);

        bytes32 permissionId = _recordPermission(user1, agent1, AMOUNT_PER_PERIOD, period, 30);

        PermissionRegistry.Permission memory perm = registry.getPermission(permissionId);
        assertEq(perm.periodDuration, period);
    }

    function testFuzz_RecordPermission_ValidExpiry(uint256 daysUntilExpiry) public {
        vm.assume(daysUntilExpiry > 0 && daysUntilExpiry < 3650); // Up to 10 years

        bytes32 permissionId =
            _recordPermission(user1, agent1, AMOUNT_PER_PERIOD, PERIOD_DURATION, daysUntilExpiry);

        PermissionRegistry.Permission memory perm = registry.getPermission(permissionId);
        assertEq(perm.expiresAt, block.timestamp + daysUntilExpiry * 1 days);
    }

    function testFuzz_MultiplePermissions_CountsCorrect(uint8 numPermissions) public {
        vm.assume(numPermissions > 0 && numPermissions <= 50);

        for (uint256 i = 0; i < numPermissions; i++) {
            address agent = makeAddr(string(abi.encodePacked("agent", i)));
            _recordDefaultPermission(user1, agent);
        }

        assertEq(registry.totalPermissions(), numPermissions);
        assertEq(registry.activePermissions(), numPermissions);
        assertEq(registry.getUserActivePermissionCount(user1), numPermissions);
    }

    // ============ Edge Case Tests ============

    function test_PermissionId_UniquePerTransaction() public {
        // Record two permissions in different blocks
        bytes32 perm1 = _recordDefaultPermission(user1, agent1);

        vm.roll(block.number + 1);
        vm.warp(block.timestamp + 1);

        // Same user, different agent - should get different ID
        bytes32 perm2 = _recordDefaultPermission(user1, agent2);

        assertTrue(perm1 != perm2);
    }

    function test_PermissionHash_StoredCorrectly() public {
        bytes32 expectedHash = keccak256(abi.encodePacked("custom_permission_hash"));

        vm.prank(user1);
        bytes32 permissionId = registry.recordPermission(
            agent1,
            token,
            AMOUNT_PER_PERIOD,
            PERIOD_DURATION,
            block.timestamp + 30 days,
            expectedHash
        );

        PermissionRegistry.Permission memory perm = registry.getPermission(permissionId);
        assertEq(perm.permissionHash, expectedHash);
    }

    function test_GetPermission_NonExistent() public view {
        bytes32 fakeId = keccak256("nonexistent");
        PermissionRegistry.Permission memory perm = registry.getPermission(fakeId);

        assertEq(perm.user, address(0));
        assertEq(perm.agent, address(0));
        assertFalse(perm.isActive);
    }

    function test_GrantedAt_IsBlockTimestamp() public {
        uint256 expectedTime = block.timestamp;
        bytes32 permissionId = _recordDefaultPermission(user1, agent1);

        PermissionRegistry.Permission memory perm = registry.getPermission(permissionId);
        assertEq(perm.grantedAt, expectedTime);
    }
}
