// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IAgentRegistry.sol";

/**
 * @title AgentRegistry
 * @author Echelon Team
 * @notice ERC-8004 compliant registry for AI trading agents
 * @dev Implements ERC-721 with URI storage for agent metadata
 */
contract AgentRegistry is
    IAgentRegistry,
    ERC721URIStorage,
    ERC721Enumerable,
    Ownable,
    ReentrancyGuard
{
    // ============ State Variables ============

    /// @notice Counter for agent IDs
    uint256 private _nextAgentId;

    /// @notice Mapping from agent ID to metadata
    mapping(uint256 => AgentMetadata) private _agents;

    /// @notice Mapping from wallet address to agent ID
    mapping(address => uint256) private _walletToAgentId;

    /// @notice Minimum name length
    uint256 public constant MIN_NAME_LENGTH = 3;

    /// @notice Maximum name length
    uint256 public constant MAX_NAME_LENGTH = 50;

    /// @notice Valid strategy types
    mapping(string => bool) public validStrategyTypes;

    // ============ Constructor ============

    constructor() ERC721("Echelon Agent Registry", "AGENT") Ownable(msg.sender) {
        // Initialize valid strategy types
        validStrategyTypes["DCA"] = true;
        validStrategyTypes["Arbitrage"] = true;
        validStrategyTypes["Yield"] = true;
        validStrategyTypes["Momentum"] = true;
        validStrategyTypes["MeanReversion"] = true;
        validStrategyTypes["GridTrading"] = true;
    }

    // ============ External Functions ============

    /// @inheritdoc IAgentRegistry
    function registerAgent(
        address walletAddress,
        string calldata name,
        string calldata strategyType,
        uint8 riskLevel,
        string calldata metadataUri
    ) external nonReentrant returns (uint256 agentId) {
        // Validations
        require(walletAddress != address(0), "Invalid wallet address");
        require(_walletToAgentId[walletAddress] == 0, "Wallet already registered");
        require(bytes(name).length >= MIN_NAME_LENGTH, "Name too short");
        require(bytes(name).length <= MAX_NAME_LENGTH, "Name too long");
        require(validStrategyTypes[strategyType], "Invalid strategy type");
        require(riskLevel >= 1 && riskLevel <= 10, "Risk level must be 1-10");
        require(bytes(metadataUri).length > 0, "Metadata URI required");

        // Increment and assign agent ID
        agentId = ++_nextAgentId;

        // Store agent metadata
        _agents[agentId] = AgentMetadata({
            walletAddress: walletAddress,
            name: name,
            strategyType: strategyType,
            riskLevel: riskLevel,
            registeredAt: block.timestamp,
            isActive: true
        });

        // Map wallet to agent ID
        _walletToAgentId[walletAddress] = agentId;

        // Mint NFT to caller
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, metadataUri);

        emit AgentRegistered(agentId, walletAddress, name, strategyType, riskLevel);
    }

    /// @inheritdoc IAgentRegistry
    function updateAgentMetadata(uint256 agentId, string calldata metadataUri) external {
        require(_ownerOf(agentId) == msg.sender, "Not agent owner");
        require(bytes(metadataUri).length > 0, "Metadata URI required");

        _setTokenURI(agentId, metadataUri);

        emit AgentUpdated(agentId, metadataUri);
    }

    /// @inheritdoc IAgentRegistry
    function deactivateAgent(uint256 agentId) external {
        require(_ownerOf(agentId) == msg.sender, "Not agent owner");
        require(_agents[agentId].isActive, "Already deactivated");

        _agents[agentId].isActive = false;

        emit AgentDeactivated(agentId);
    }

    /// @inheritdoc IAgentRegistry
    function reactivateAgent(uint256 agentId) external {
        require(_ownerOf(agentId) == msg.sender, "Not agent owner");
        require(!_agents[agentId].isActive, "Already active");

        _agents[agentId].isActive = true;

        emit AgentReactivated(agentId);
    }

    // ============ View Functions ============

    /// @inheritdoc IAgentRegistry
    function getAgentByWallet(address walletAddress)
        external
        view
        returns (uint256 agentId, AgentMetadata memory metadata)
    {
        agentId = _walletToAgentId[walletAddress];
        require(agentId != 0, "Agent not found");
        metadata = _agents[agentId];
    }

    /// @inheritdoc IAgentRegistry
    function isRegisteredAgent(address walletAddress) external view returns (bool) {
        return _walletToAgentId[walletAddress] != 0;
    }

    /// @inheritdoc IAgentRegistry
    function totalAgents() external view returns (uint256) {
        return _nextAgentId;
    }

    /// @inheritdoc IAgentRegistry
    function agents(uint256 agentId) external view returns (AgentMetadata memory) {
        require(_ownerOf(agentId) != address(0), "Agent does not exist");
        return _agents[agentId];
    }

    /// @inheritdoc IAgentRegistry
    function walletToAgentId(address wallet) external view returns (uint256) {
        return _walletToAgentId[wallet];
    }

    /**
     * @notice Get all agents owned by an address
     * @param owner The owner address
     * @return agentIds Array of agent IDs
     */
    function getAgentsByOwner(address owner) external view returns (uint256[] memory agentIds) {
        uint256 balance = balanceOf(owner);
        agentIds = new uint256[](balance);

        for (uint256 i = 0; i < balance; i++) {
            agentIds[i] = tokenOfOwnerByIndex(owner, i);
        }
    }

    /**
     * @notice Get active agents with pagination
     * @param offset Start index
     * @param limit Number of agents to return
     * @return agentIds Array of active agent IDs
     */
    function getActiveAgents(
        uint256 offset,
        uint256 limit
    ) external view returns (uint256[] memory agentIds) {
        uint256 total = totalSupply();
        uint256 count = 0;

        // First pass: count active agents
        for (uint256 i = 1; i <= total; i++) {
            if (_agents[i].isActive) count++;
        }

        // Calculate actual return size
        uint256 start = offset;
        uint256 end = offset + limit > count ? count : offset + limit;
        uint256 resultSize = end > start ? end - start : 0;

        agentIds = new uint256[](resultSize);

        // Second pass: collect active agents
        uint256 currentIndex = 0;
        uint256 resultIndex = 0;

        for (uint256 i = 1; i <= total && resultIndex < resultSize; i++) {
            if (_agents[i].isActive) {
                if (currentIndex >= start) {
                    agentIds[resultIndex] = i;
                    resultIndex++;
                }
                currentIndex++;
            }
        }
    }

    // ============ Admin Functions ============

    /**
     * @notice Add a new valid strategy type
     * @param strategyType The strategy type to add
     */
    function addStrategyType(string calldata strategyType) external onlyOwner {
        require(!validStrategyTypes[strategyType], "Strategy type exists");
        validStrategyTypes[strategyType] = true;
    }

    /**
     * @notice Remove a strategy type
     * @param strategyType The strategy type to remove
     */
    function removeStrategyType(string calldata strategyType) external onlyOwner {
        require(validStrategyTypes[strategyType], "Strategy type not found");
        validStrategyTypes[strategyType] = false;
    }

    // ============ Override Functions ============

    function _update(
        address to,
        uint256 tokenId,
        address auth
    ) internal override(ERC721, ERC721Enumerable) returns (address) {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(
        address account,
        uint128 value
    ) internal override(ERC721, ERC721Enumerable) {
        super._increaseBalance(account, value);
    }

    function tokenURI(
        uint256 tokenId
    ) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721URIStorage, ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
