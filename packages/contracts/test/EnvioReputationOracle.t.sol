// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/EnvioReputationOracle.sol";

contract EnvioReputationOracleTest is Test {
    EnvioReputationOracle public oracle;

    address public owner = address(this);
    address public updater = address(0x1);
    address public agent1 = address(0x100);
    address public agent2 = address(0x200);
    address public agent3 = address(0x300);
    address public randomUser = address(0x999);

    function setUp() public {
        oracle = new EnvioReputationOracle();
        oracle.setEnvioUpdater(updater);
    }

    // ============ Deployment Tests ============

    function test_Deployment_OwnerIsDeployer() public view {
        assertEq(oracle.owner(), owner);
    }

    function test_Deployment_DefaultNeutralScore() public view {
        assertEq(oracle.DEFAULT_NEUTRAL_SCORE(), 50);
    }

    function test_Deployment_MaxScore() public view {
        assertEq(oracle.MAX_SCORE(), 100);
    }

    // ============ Set Updater Tests ============

    function test_SetEnvioUpdater() public {
        address newUpdater = address(0x2);
        oracle.setEnvioUpdater(newUpdater);
        assertEq(oracle.envioUpdater(), newUpdater);
    }

    function test_SetEnvioUpdater_EmitsEvent() public {
        address newUpdater = address(0x2);

        vm.expectEmit(true, true, false, false);
        emit IEnvioReputationOracle.UpdaterChanged(updater, newUpdater);

        oracle.setEnvioUpdater(newUpdater);
    }

    function test_SetEnvioUpdater_OnlyOwner() public {
        vm.prank(randomUser);
        vm.expectRevert();
        oracle.setEnvioUpdater(address(0x2));
    }

    function test_SetEnvioUpdater_RejectsZeroAddress() public {
        vm.expectRevert(EnvioReputationOracle.ZeroAddressNotAllowed.selector);
        oracle.setEnvioUpdater(address(0));
    }

    // ============ Update Reputation Tests ============

    function test_UpdateReputation() public {
        vm.prank(updater);
        oracle.updateReputation(agent1, 75);

        (uint8 score, uint256 lastUpdated) = oracle.getAgentReputation(agent1);
        assertEq(score, 75);
        assertGt(lastUpdated, 0);
    }

    function test_UpdateReputation_EmitsEvent() public {
        vm.prank(updater);

        vm.expectEmit(true, false, false, true);
        emit IEnvioReputationOracle.ReputationUpdated(agent1, 80, block.timestamp);

        oracle.updateReputation(agent1, 80);
    }

    function test_UpdateReputation_OwnerCanUpdate() public {
        // Owner should also be able to update
        oracle.updateReputation(agent1, 65);

        (uint8 score,) = oracle.getAgentReputation(agent1);
        assertEq(score, 65);
    }

    function test_UpdateReputation_UnauthorizedReverts() public {
        vm.prank(randomUser);
        vm.expectRevert(EnvioReputationOracle.Unauthorized.selector);
        oracle.updateReputation(agent1, 75);
    }

    function test_UpdateReputation_ScoreAbove100Reverts() public {
        vm.prank(updater);
        vm.expectRevert(
            abi.encodeWithSelector(EnvioReputationOracle.ScoreExceedsMaximum.selector, 101, 100)
        );
        oracle.updateReputation(agent1, 101);
    }

    function test_UpdateReputation_CanUpdateToZero() public {
        vm.prank(updater);
        oracle.updateReputation(agent1, 0);

        (uint8 score,) = oracle.getAgentReputation(agent1);
        assertEq(score, 0);
    }

    function test_UpdateReputation_CanUpdateTo100() public {
        vm.prank(updater);
        oracle.updateReputation(agent1, 100);

        (uint8 score,) = oracle.getAgentReputation(agent1);
        assertEq(score, 100);
    }

    function test_UpdateReputation_OverwritesPrevious() public {
        vm.startPrank(updater);
        oracle.updateReputation(agent1, 50);
        oracle.updateReputation(agent1, 75);
        vm.stopPrank();

        (uint8 score,) = oracle.getAgentReputation(agent1);
        assertEq(score, 75);
    }

    // ============ Batch Update Tests ============

    function test_BatchUpdateReputation() public {
        address[] memory agents = new address[](3);
        agents[0] = agent1;
        agents[1] = agent2;
        agents[2] = agent3;

        uint8[] memory scores = new uint8[](3);
        scores[0] = 60;
        scores[1] = 70;
        scores[2] = 80;

        vm.prank(updater);
        oracle.batchUpdateReputation(agents, scores);

        (uint8 score1,) = oracle.getAgentReputation(agent1);
        (uint8 score2,) = oracle.getAgentReputation(agent2);
        (uint8 score3,) = oracle.getAgentReputation(agent3);

        assertEq(score1, 60);
        assertEq(score2, 70);
        assertEq(score3, 80);
    }

    function test_BatchUpdateReputation_EmitsEvents() public {
        address[] memory agents = new address[](2);
        agents[0] = agent1;
        agents[1] = agent2;

        uint8[] memory scores = new uint8[](2);
        scores[0] = 55;
        scores[1] = 65;

        vm.prank(updater);

        vm.expectEmit(true, false, false, true);
        emit IEnvioReputationOracle.ReputationUpdated(agent1, 55, block.timestamp);

        vm.expectEmit(true, false, false, true);
        emit IEnvioReputationOracle.ReputationUpdated(agent2, 65, block.timestamp);

        oracle.batchUpdateReputation(agents, scores);
    }

    function test_BatchUpdateReputation_ArrayMismatchReverts() public {
        address[] memory agents = new address[](2);
        agents[0] = agent1;
        agents[1] = agent2;

        uint8[] memory scores = new uint8[](3);
        scores[0] = 60;
        scores[1] = 70;
        scores[2] = 80;

        vm.prank(updater);
        vm.expectRevert(
            abi.encodeWithSelector(EnvioReputationOracle.ArrayLengthMismatch.selector, 2, 3)
        );
        oracle.batchUpdateReputation(agents, scores);
    }

    function test_BatchUpdateReputation_ScoreAbove100Reverts() public {
        address[] memory agents = new address[](2);
        agents[0] = agent1;
        agents[1] = agent2;

        uint8[] memory scores = new uint8[](2);
        scores[0] = 60;
        scores[1] = 105; // Invalid

        vm.prank(updater);
        vm.expectRevert(
            abi.encodeWithSelector(EnvioReputationOracle.ScoreExceedsMaximum.selector, 105, 100)
        );
        oracle.batchUpdateReputation(agents, scores);
    }

    function test_BatchUpdateReputation_EmptyArrays() public {
        address[] memory agents = new address[](0);
        uint8[] memory scores = new uint8[](0);

        vm.prank(updater);
        oracle.batchUpdateReputation(agents, scores); // Should not revert
    }

    // ============ Get Reputation Tests ============

    function test_GetAgentReputation_DefaultForNewAgent() public view {
        (uint8 score, uint256 lastUpdated) = oracle.getAgentReputation(agent1);

        assertEq(score, 50); // Default neutral score
        assertEq(lastUpdated, 0); // Never updated
    }

    function test_GetAgentReputation_AfterUpdate() public {
        vm.prank(updater);
        oracle.updateReputation(agent1, 85);

        (uint8 score, uint256 lastUpdated) = oracle.getAgentReputation(agent1);

        assertEq(score, 85);
        assertEq(lastUpdated, block.timestamp);
    }

    function test_HasBeenRated() public {
        assertFalse(oracle.hasBeenRated(agent1));

        vm.prank(updater);
        oracle.updateReputation(agent1, 75);

        assertTrue(oracle.hasBeenRated(agent1));
    }

    function test_GetRawScore() public {
        // Before any update, raw score is 0 (not the default)
        assertEq(oracle.getRawScore(agent1), 0);

        vm.prank(updater);
        oracle.updateReputation(agent1, 75);

        assertEq(oracle.getRawScore(agent1), 75);
    }

    function test_GetLastUpdateTime() public {
        assertEq(oracle.getLastUpdateTime(agent1), 0);

        vm.prank(updater);
        oracle.updateReputation(agent1, 75);

        assertEq(oracle.getLastUpdateTime(agent1), block.timestamp);
    }

    // ============ Fuzz Tests ============

    function testFuzz_UpdateReputation_ValidScores(uint8 score) public {
        vm.assume(score <= 100);

        vm.prank(updater);
        oracle.updateReputation(agent1, score);

        (uint8 storedScore,) = oracle.getAgentReputation(agent1);
        assertEq(storedScore, score);
    }

    function testFuzz_BatchUpdate_MultipleAgents(uint8 numAgents) public {
        vm.assume(numAgents > 0 && numAgents <= 50);

        address[] memory agents = new address[](numAgents);
        uint8[] memory scores = new uint8[](numAgents);

        for (uint8 i = 0; i < numAgents; i++) {
            agents[i] = address(uint160(0x1000 + i));
            scores[i] = (i * 2) % 101; // Scores between 0-100
        }

        vm.prank(updater);
        oracle.batchUpdateReputation(agents, scores);

        // Verify all were updated
        for (uint8 i = 0; i < numAgents; i++) {
            (uint8 storedScore,) = oracle.getAgentReputation(agents[i]);
            assertEq(storedScore, scores[i]);
        }
    }

    // ============ Time-based Tests ============

    function test_UpdateReputation_TimestampUpdates() public {
        vm.warp(1000);

        vm.prank(updater);
        oracle.updateReputation(agent1, 50);

        (, uint256 firstUpdate) = oracle.getAgentReputation(agent1);
        assertEq(firstUpdate, 1000);

        vm.warp(2000);

        vm.prank(updater);
        oracle.updateReputation(agent1, 60);

        (, uint256 secondUpdate) = oracle.getAgentReputation(agent1);
        assertEq(secondUpdate, 2000);
    }
}
