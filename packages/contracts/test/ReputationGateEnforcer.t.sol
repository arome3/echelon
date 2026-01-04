// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/EnvioReputationOracle.sol";
import "../src/enforcers/ReputationGateEnforcer.sol";
import "../src/interfaces/ICaveatEnforcer.sol";

contract ReputationGateEnforcerTest is Test {
    EnvioReputationOracle public oracle;
    ReputationGateEnforcer public enforcer;

    address public owner = address(this);
    address public updater = address(0x1);
    address public agent1 = address(0x100);
    address public agent2 = address(0x200);
    address public delegator = address(0x300);
    address public redeemer = address(0x400);

    // Test token addresses
    address public usdc = address(0x2BfBc55F4A360352Dc89e599D04898F150472cA6);

    // Default terms for testing
    uint256 public constant BASE_AMOUNT = 1e6;    // 1 USDC
    uint256 public constant MAX_AMOUNT = 100e6;   // 100 USDC
    uint8 public constant MIN_SCORE = 40;
    uint256 public constant MAX_STALENESS = 3600; // 1 hour

    function setUp() public {
        oracle = new EnvioReputationOracle();
        oracle.setEnvioUpdater(updater);

        enforcer = new ReputationGateEnforcer(address(oracle));
    }

    // ============ Helper Functions ============

    function _encodeTerms(
        address agentAddress,
        uint256 baseAmount,
        uint256 maxAmount,
        uint8 minReputationScore,
        uint256 maxStaleness
    ) internal pure returns (bytes memory) {
        return abi.encode(ReputationGateEnforcer.Terms({
            agentAddress: agentAddress,
            baseAmount: baseAmount,
            maxAmount: maxAmount,
            minReputationScore: minReputationScore,
            maxStaleness: maxStaleness
        }));
    }

    function _encodeDefaultTerms(address agentAddress) internal pure returns (bytes memory) {
        return _encodeTerms(agentAddress, BASE_AMOUNT, MAX_AMOUNT, MIN_SCORE, MAX_STALENESS);
    }

    function _encodeERC20Transfer(address to, uint256 amount) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(bytes4(0xa9059cbb), to, amount);
    }

    function _encodeERC20TransferFrom(address from, address to, uint256 amount) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(bytes4(0x23b872dd), from, to, amount);
    }

    function _encodeERC20Approve(address spender, uint256 amount) internal pure returns (bytes memory) {
        return abi.encodeWithSelector(bytes4(0x095ea7b3), spender, amount);
    }

    // ============ Deployment Tests ============

    function test_Deployment_StoresOracleAddress() public view {
        assertEq(address(enforcer.reputationOracle()), address(oracle));
    }

    function test_Deployment_RejectsZeroOracle() public {
        vm.expectRevert("Invalid oracle address");
        new ReputationGateEnforcer(address(0));
    }

    // ============ Active Limit Calculation Tests ============

    function test_CalculateLimit_AtMinScore() public {
        // Set score to exactly min score (40)
        vm.prank(updater);
        oracle.updateReputation(agent1, 40);

        bytes memory terms = _encodeDefaultTerms(agent1);
        (uint256 limit, uint8 score, ) = enforcer.getActiveLimit(terms);

        assertEq(score, 40);
        assertEq(limit, BASE_AMOUNT); // Should be base amount
    }

    function test_CalculateLimit_BelowMinScore() public {
        // Set score below min (30 < 40)
        vm.prank(updater);
        oracle.updateReputation(agent1, 30);

        bytes memory terms = _encodeDefaultTerms(agent1);
        (uint256 limit, uint8 score, ) = enforcer.getActiveLimit(terms);

        assertEq(score, 30);
        assertEq(limit, BASE_AMOUNT); // Still base amount
    }

    function test_CalculateLimit_AtMaxScore() public {
        // Set score to 100
        vm.prank(updater);
        oracle.updateReputation(agent1, 100);

        bytes memory terms = _encodeDefaultTerms(agent1);
        (uint256 limit, uint8 score, ) = enforcer.getActiveLimit(terms);

        assertEq(score, 100);
        assertEq(limit, MAX_AMOUNT); // Should be max amount
    }

    function test_CalculateLimit_Midpoint() public {
        // Set score to 70 (halfway between 40 and 100)
        // Progress = (70 - 40) / (100 - 40) = 30/60 = 0.5
        // Limit = 1e6 + (100e6 - 1e6) * 0.5 = 1e6 + 49.5e6 = 50.5e6
        vm.prank(updater);
        oracle.updateReputation(agent1, 70);

        bytes memory terms = _encodeDefaultTerms(agent1);
        (uint256 limit, , ) = enforcer.getActiveLimit(terms);

        uint256 expectedLimit = BASE_AMOUNT + ((MAX_AMOUNT - BASE_AMOUNT) * 30) / 60;
        assertEq(limit, expectedLimit);
    }

    function test_CalculateLimit_DefaultNeutralScore() public view {
        // Agent never rated - should get neutral score of 50
        bytes memory terms = _encodeDefaultTerms(agent1);
        (uint256 limit, uint8 score, ) = enforcer.getActiveLimit(terms);

        assertEq(score, 50); // Default neutral
        // Progress = (50 - 40) / (100 - 40) = 10/60 = 1/6
        uint256 expectedLimit = BASE_AMOUNT + ((MAX_AMOUNT - BASE_AMOUNT) * 10) / 60;
        assertEq(limit, expectedLimit);
    }

    // ============ beforeHook Validation Tests ============

    function test_BeforeHook_AllowsWithinLimit() public {
        vm.prank(updater);
        oracle.updateReputation(agent1, 70);

        bytes memory terms = _encodeDefaultTerms(agent1);
        (uint256 activeLimit, , ) = enforcer.getActiveLimit(terms);

        // Request less than active limit
        uint256 requestAmount = activeLimit - 1e6;
        bytes memory calldata_ = _encodeERC20Transfer(redeemer, requestAmount);

        // Should not revert
        enforcer.beforeHook(
            terms,
            "",
            ModeCode.wrap(bytes32(0)),
            calldata_,
            bytes32(0),
            delegator,
            redeemer
        );
    }

    function test_BeforeHook_AllowsExactLimit() public {
        vm.prank(updater);
        oracle.updateReputation(agent1, 70);

        bytes memory terms = _encodeDefaultTerms(agent1);
        (uint256 activeLimit, , ) = enforcer.getActiveLimit(terms);

        bytes memory calldata_ = _encodeERC20Transfer(redeemer, activeLimit);

        // Should not revert
        enforcer.beforeHook(
            terms,
            "",
            ModeCode.wrap(bytes32(0)),
            calldata_,
            bytes32(0),
            delegator,
            redeemer
        );
    }

    function test_BeforeHook_RevertsExceedsLimit() public {
        vm.prank(updater);
        oracle.updateReputation(agent1, 70);

        bytes memory terms = _encodeDefaultTerms(agent1);
        (uint256 activeLimit, , ) = enforcer.getActiveLimit(terms);

        // Request more than active limit
        uint256 requestAmount = activeLimit + 1;
        bytes memory calldata_ = _encodeERC20Transfer(redeemer, requestAmount);

        vm.expectRevert(
            abi.encodeWithSelector(
                ReputationGateEnforcer.ExceedsReputationLimit.selector,
                requestAmount,
                activeLimit
            )
        );
        enforcer.beforeHook(
            terms,
            "",
            ModeCode.wrap(bytes32(0)),
            calldata_,
            bytes32(0),
            delegator,
            redeemer
        );
    }

    function test_BeforeHook_RevertsReputationTooLow() public {
        vm.prank(updater);
        oracle.updateReputation(agent1, 30); // Below min of 40

        bytes memory terms = _encodeDefaultTerms(agent1);
        bytes memory calldata_ = _encodeERC20Transfer(redeemer, 1e6);

        vm.expectRevert(
            abi.encodeWithSelector(
                ReputationGateEnforcer.ReputationTooLow.selector,
                30,
                40
            )
        );
        enforcer.beforeHook(
            terms,
            "",
            ModeCode.wrap(bytes32(0)),
            calldata_,
            bytes32(0),
            delegator,
            redeemer
        );
    }

    function test_BeforeHook_RevertsStaleData() public {
        vm.warp(1000);

        vm.prank(updater);
        oracle.updateReputation(agent1, 70);

        // Advance time beyond staleness threshold
        vm.warp(1000 + MAX_STALENESS + 1);

        bytes memory terms = _encodeDefaultTerms(agent1);
        bytes memory calldata_ = _encodeERC20Transfer(redeemer, 1e6);

        vm.expectRevert(
            abi.encodeWithSelector(
                ReputationGateEnforcer.StaleReputationData.selector,
                1000,
                MAX_STALENESS
            )
        );
        enforcer.beforeHook(
            terms,
            "",
            ModeCode.wrap(bytes32(0)),
            calldata_,
            bytes32(0),
            delegator,
            redeemer
        );
    }

    function test_BeforeHook_AllowsStaleIfMaxStalenessZero() public {
        vm.warp(1000);

        vm.prank(updater);
        oracle.updateReputation(agent1, 70);

        // Advance time significantly
        vm.warp(1000 + 1000000);

        // Terms with maxStaleness = 0 (no staleness check)
        bytes memory terms = _encodeTerms(agent1, BASE_AMOUNT, MAX_AMOUNT, MIN_SCORE, 0);
        bytes memory calldata_ = _encodeERC20Transfer(redeemer, 1e6);

        // Should not revert despite old data
        enforcer.beforeHook(
            terms,
            "",
            ModeCode.wrap(bytes32(0)),
            calldata_,
            bytes32(0),
            delegator,
            redeemer
        );
    }

    function test_BeforeHook_AllowsNewAgentWithDefaultScore() public view {
        // Agent never rated - gets default 50, which is >= minScore of 40
        bytes memory terms = _encodeDefaultTerms(agent1);
        bytes memory calldata_ = _encodeERC20Transfer(redeemer, 1e6);

        // Should not revert - new agents can execute with base amounts
        enforcer.beforeHook(
            terms,
            "",
            ModeCode.wrap(bytes32(0)),
            calldata_,
            bytes32(0),
            delegator,
            redeemer
        );
    }

    // ============ Calldata Extraction Tests ============

    function test_ExtractsTransferAmount() public {
        vm.prank(updater);
        oracle.updateReputation(agent1, 100); // Max score = max limit

        bytes memory terms = _encodeDefaultTerms(agent1);

        // Test with transfer()
        uint256 testAmount = 50e6;
        bytes memory transferCall = _encodeERC20Transfer(redeemer, testAmount);

        // Should allow since 50e6 < 100e6
        enforcer.beforeHook(
            terms,
            "",
            ModeCode.wrap(bytes32(0)),
            transferCall,
            bytes32(0),
            delegator,
            redeemer
        );
    }

    function test_ExtractsTransferFromAmount() public {
        vm.prank(updater);
        oracle.updateReputation(agent1, 100);

        bytes memory terms = _encodeDefaultTerms(agent1);

        // Test with transferFrom()
        uint256 testAmount = 50e6;
        bytes memory transferFromCall = _encodeERC20TransferFrom(delegator, redeemer, testAmount);

        enforcer.beforeHook(
            terms,
            "",
            ModeCode.wrap(bytes32(0)),
            transferFromCall,
            bytes32(0),
            delegator,
            redeemer
        );
    }

    function test_ExtractsApproveAmount() public {
        vm.prank(updater);
        oracle.updateReputation(agent1, 100);

        bytes memory terms = _encodeDefaultTerms(agent1);

        // Test with approve()
        uint256 testAmount = 50e6;
        bytes memory approveCall = _encodeERC20Approve(redeemer, testAmount);

        enforcer.beforeHook(
            terms,
            "",
            ModeCode.wrap(bytes32(0)),
            approveCall,
            bytes32(0),
            delegator,
            redeemer
        );
    }

    function test_UnrecognizedCalldata_ReturnsZero() public {
        vm.prank(updater);
        oracle.updateReputation(agent1, 50);

        bytes memory terms = _encodeDefaultTerms(agent1);

        // Random calldata that doesn't match ERC20 functions
        bytes memory randomCall = abi.encodeWithSelector(bytes4(0x12345678), uint256(1000e6));

        // Should not revert - unrecognized calldata returns 0 amount
        enforcer.beforeHook(
            terms,
            "",
            ModeCode.wrap(bytes32(0)),
            randomCall,
            bytes32(0),
            delegator,
            redeemer
        );
    }

    // ============ Terms Validation Tests ============

    function test_BeforeAllHook_ValidatesTerms() public {
        // Invalid terms - agent address is zero
        bytes memory invalidTerms = _encodeTerms(
            address(0),
            BASE_AMOUNT,
            MAX_AMOUNT,
            MIN_SCORE,
            MAX_STALENESS
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                ReputationGateEnforcer.InvalidTerms.selector,
                "Agent address cannot be zero"
            )
        );
        enforcer.beforeAllHook(
            invalidTerms,
            "",
            ModeCode.wrap(bytes32(0)),
            "",
            bytes32(0),
            delegator,
            redeemer
        );
    }

    function test_InvalidTerms_BaseExceedsMax() public {
        bytes memory invalidTerms = _encodeTerms(
            agent1,
            100e6,  // base > max
            50e6,
            MIN_SCORE,
            MAX_STALENESS
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                ReputationGateEnforcer.InvalidTerms.selector,
                "Base amount cannot exceed max amount"
            )
        );
        enforcer.beforeAllHook(
            invalidTerms,
            "",
            ModeCode.wrap(bytes32(0)),
            "",
            bytes32(0),
            delegator,
            redeemer
        );
    }

    function test_InvalidTerms_MinScoreOver100() public {
        bytes memory invalidTerms = _encodeTerms(
            agent1,
            BASE_AMOUNT,
            MAX_AMOUNT,
            101, // Invalid
            MAX_STALENESS
        );

        vm.expectRevert(
            abi.encodeWithSelector(
                ReputationGateEnforcer.InvalidTerms.selector,
                "Min reputation score cannot exceed 100"
            )
        );
        enforcer.beforeAllHook(
            invalidTerms,
            "",
            ModeCode.wrap(bytes32(0)),
            "",
            bytes32(0),
            delegator,
            redeemer
        );
    }

    // ============ Helper Function Tests ============

    function test_EncodeTerms() public view {
        bytes memory encoded = enforcer.encodeTerms(
            agent1,
            BASE_AMOUNT,
            MAX_AMOUNT,
            MIN_SCORE,
            MAX_STALENESS
        );

        // Decode and verify
        ReputationGateEnforcer.Terms memory decoded = abi.decode(
            encoded,
            (ReputationGateEnforcer.Terms)
        );

        assertEq(decoded.agentAddress, agent1);
        assertEq(decoded.baseAmount, BASE_AMOUNT);
        assertEq(decoded.maxAmount, MAX_AMOUNT);
        assertEq(decoded.minReputationScore, MIN_SCORE);
        assertEq(decoded.maxStaleness, MAX_STALENESS);
    }

    function test_CalculateLimitForScore() public view {
        bytes memory terms = _encodeDefaultTerms(agent1);

        uint256 limitAt50 = enforcer.calculateLimitForScore(terms, 50);
        uint256 limitAt70 = enforcer.calculateLimitForScore(terms, 70);
        uint256 limitAt100 = enforcer.calculateLimitForScore(terms, 100);

        // Verify ordering
        assertLt(limitAt50, limitAt70);
        assertLt(limitAt70, limitAt100);
        assertEq(limitAt100, MAX_AMOUNT);
    }

    function test_GetActiveLimit_ReturnsStaleStatus() public {
        vm.warp(1000);

        vm.prank(updater);
        oracle.updateReputation(agent1, 70);

        bytes memory terms = _encodeDefaultTerms(agent1);

        // Before staleness
        (, , bool isStale1) = enforcer.getActiveLimit(terms);
        assertFalse(isStale1);

        // After staleness
        vm.warp(1000 + MAX_STALENESS + 1);
        (, , bool isStale2) = enforcer.getActiveLimit(terms);
        assertTrue(isStale2);
    }

    // ============ Fuzz Tests ============

    function testFuzz_CalculateLimit_MonotonicIncrease(uint8 score1, uint8 score2) public {
        vm.assume(score1 >= MIN_SCORE && score1 <= 100);
        vm.assume(score2 >= MIN_SCORE && score2 <= 100);
        vm.assume(score1 <= score2);

        bytes memory terms = _encodeDefaultTerms(agent1);

        uint256 limit1 = enforcer.calculateLimitForScore(terms, score1);
        uint256 limit2 = enforcer.calculateLimitForScore(terms, score2);

        assertLe(limit1, limit2); // Limit should increase with score
    }

    function testFuzz_CalculateLimit_WithinBounds(uint8 score) public {
        vm.assume(score <= 100);

        bytes memory terms = _encodeDefaultTerms(agent1);
        uint256 limit = enforcer.calculateLimitForScore(terms, score);

        assertGe(limit, BASE_AMOUNT);
        assertLe(limit, MAX_AMOUNT);
    }

    function testFuzz_BeforeHook_AmountWithinLimit(uint256 amount) public {
        vm.prank(updater);
        oracle.updateReputation(agent1, 100); // Max limit

        bytes memory terms = _encodeDefaultTerms(agent1);
        vm.assume(amount <= MAX_AMOUNT);

        bytes memory calldata_ = _encodeERC20Transfer(redeemer, amount);

        // Should not revert for any amount within limit
        enforcer.beforeHook(
            terms,
            "",
            ModeCode.wrap(bytes32(0)),
            calldata_,
            bytes32(0),
            delegator,
            redeemer
        );
    }

    // ============ No-op Hook Tests ============

    function test_AfterHook_NoOp() public {
        bytes memory terms = _encodeDefaultTerms(agent1);

        // Should not revert
        enforcer.afterHook(
            terms,
            "",
            ModeCode.wrap(bytes32(0)),
            "",
            bytes32(0),
            delegator,
            redeemer
        );
    }

    function test_AfterAllHook_NoOp() public {
        bytes memory terms = _encodeDefaultTerms(agent1);

        // Should not revert
        enforcer.afterAllHook(
            terms,
            "",
            ModeCode.wrap(bytes32(0)),
            "",
            bytes32(0),
            delegator,
            redeemer
        );
    }
}
