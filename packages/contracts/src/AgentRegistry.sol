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
 * @notice ERC-8004 compliant Identity Registry for AI trading agents
 * @dev Implements IAgentRegistry (which extends IERC8004Identity) with ERC-721 NFT ownership and
 * key-value metadata storage
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

    /// @notice Key-value metadata storage (ERC-8004 compliant)
    mapping(uint256 => mapping(string => bytes)) private _metadata;

    /// @notice Mapping from wallet address to agent ID (for backward compatibility)
    mapping(address => uint256) private _walletToAgentId;

    /// @notice Minimum name length
    uint256 public constant MIN_NAME_LENGTH = 3;

    /// @notice Maximum name length
    uint256 public constant MAX_NAME_LENGTH = 50;

    /// @notice Valid strategy types
    mapping(string => bool) public validStrategyTypes;

    // ============ Metadata Keys ============

    /// @notice Standard metadata keys used by this registry
    string public constant KEY_WALLET_ADDRESS = "walletAddress";
    string public constant KEY_NAME = "name";
    string public constant KEY_STRATEGY_TYPE = "strategyType";
    string public constant KEY_RISK_LEVEL = "riskLevel";
    string public constant KEY_REGISTERED_AT = "registeredAt";
    string public constant KEY_IS_ACTIVE = "isActive";
    string public constant KEY_IS_VERIFIED = "isVerified";
    string public constant KEY_IS_ORCHESTRATOR = "isOrchestrator";

    // ============ Verified Agents ============

    /// @notice Mapping of verified agent IDs (set by contract owner)
    mapping(uint256 => bool) private _verifiedAgents;

    /// @notice Mapping of orchestrator agent IDs (set by contract owner)
    mapping(uint256 => bool) private _orchestratorAgents;

    /// @notice Emitted when an agent is verified
    event AgentVerified(uint256 indexed agentId, bool verified);

    /// @notice Emitted when an agent is set as orchestrator
    event AgentOrchestratorSet(uint256 indexed agentId, bool isOrchestrator);

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

    // ============ ERC-8004 Identity Functions ============

    /// @inheritdoc IERC8004Identity
    function register(string calldata tokenURI_, MetadataEntry[] calldata metadata)
        external
        nonReentrant
        returns (uint256 agentId)
    {
        agentId = _registerAgent(tokenURI_);

        // Set all provided metadata entries
        for (uint256 i = 0; i < metadata.length; i++) {
            _setMetadataInternal(agentId, metadata[i].key, metadata[i].value);
        }
    }

    /// @inheritdoc IERC8004Identity
    function register(string calldata tokenURI_) external nonReentrant returns (uint256 agentId) {
        agentId = _registerAgent(tokenURI_);
    }

    /// @inheritdoc IERC8004Identity
    function register() external nonReentrant returns (uint256 agentId) {
        agentId = _registerAgent("");
    }

    /// @inheritdoc IERC8004Identity
    function getMetadata(uint256 agentId, string calldata key)
        external
        view
        returns (bytes memory value)
    {
        require(_ownerOf(agentId) != address(0), "Agent does not exist");
        return _metadata[agentId][key];
    }

    /// @inheritdoc IERC8004Identity
    function setMetadata(uint256 agentId, string calldata key, bytes calldata value) external {
        require(_ownerOf(agentId) == msg.sender, "Not agent owner");
        _setMetadataInternal(agentId, key, value);
    }

    // ============ Legacy Functions (Backward Compatibility) ============

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

        // Register using ERC-8004 standard
        agentId = _registerAgent(metadataUri);

        // Store as ERC-8004 metadata
        _setMetadataInternal(agentId, KEY_WALLET_ADDRESS, abi.encode(walletAddress));
        _setMetadataInternal(agentId, KEY_NAME, abi.encode(name));
        _setMetadataInternal(agentId, KEY_STRATEGY_TYPE, abi.encode(strategyType));
        _setMetadataInternal(agentId, KEY_RISK_LEVEL, abi.encode(riskLevel));
        _setMetadataInternal(agentId, KEY_REGISTERED_AT, abi.encode(block.timestamp));
        _setMetadataInternal(agentId, KEY_IS_ACTIVE, abi.encode(true));

        // Map wallet to agent ID for backward compatibility lookups
        _walletToAgentId[walletAddress] = agentId;

        // Emit legacy event for backward compatibility
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

        bytes memory currentStatus = _metadata[agentId][KEY_IS_ACTIVE];
        if (currentStatus.length > 0) {
            bool isActive = abi.decode(currentStatus, (bool));
            require(isActive, "Already deactivated");
        }

        _setMetadataInternal(agentId, KEY_IS_ACTIVE, abi.encode(false));

        emit AgentDeactivated(agentId);
    }

    /// @inheritdoc IAgentRegistry
    function reactivateAgent(uint256 agentId) external {
        require(_ownerOf(agentId) == msg.sender, "Not agent owner");

        bytes memory currentStatus = _metadata[agentId][KEY_IS_ACTIVE];
        if (currentStatus.length > 0) {
            bool isActive = abi.decode(currentStatus, (bool));
            require(!isActive, "Already active");
        }

        _setMetadataInternal(agentId, KEY_IS_ACTIVE, abi.encode(true));

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
        metadata = _decodeAgentMetadata(agentId);
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
        return _decodeAgentMetadata(agentId);
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
    function getActiveAgents(uint256 offset, uint256 limit)
        external
        view
        returns (uint256[] memory agentIds)
    {
        uint256 total = totalSupply();
        uint256 count = 0;

        // First pass: count active agents
        for (uint256 i = 1; i <= total; i++) {
            if (_isAgentActive(i)) count++;
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
            if (_isAgentActive(i)) {
                if (currentIndex >= start) {
                    agentIds[resultIndex] = i;
                    resultIndex++;
                }
                currentIndex++;
            }
        }
    }

    /**
     * @notice Check if a specific metadata key exists for an agent
     * @param agentId The agent's ID
     * @param key The metadata key to check
     * @return exists Whether the key exists
     */
    function hasMetadata(uint256 agentId, string calldata key) external view returns (bool exists) {
        require(_ownerOf(agentId) != address(0), "Agent does not exist");
        return _metadata[agentId][key].length > 0;
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

    /**
     * @notice Set an agent's verified status (owner only)
     * @param agentId The agent ID to verify/unverify
     * @param verified The verification status
     */
    function setAgentVerified(uint256 agentId, bool verified) external onlyOwner {
        require(_ownerOf(agentId) != address(0), "Agent does not exist");
        _verifiedAgents[agentId] = verified;
        _setMetadataInternal(agentId, KEY_IS_VERIFIED, abi.encode(verified));
        emit AgentVerified(agentId, verified);
    }

    /**
     * @notice Batch set verified status for multiple agents (owner only)
     * @param agentIds Array of agent IDs
     * @param verified The verification status to set
     */
    function setAgentsVerified(uint256[] calldata agentIds, bool verified) external onlyOwner {
        for (uint256 i = 0; i < agentIds.length; i++) {
            uint256 agentId = agentIds[i];
            require(_ownerOf(agentId) != address(0), "Agent does not exist");
            _verifiedAgents[agentId] = verified;
            _setMetadataInternal(agentId, KEY_IS_VERIFIED, abi.encode(verified));
            emit AgentVerified(agentId, verified);
        }
    }

    /**
     * @notice Check if an agent is verified
     * @param agentId The agent ID to check
     * @return isVerified Whether the agent is verified
     */
    function isAgentVerified(uint256 agentId) external view returns (bool) {
        return _verifiedAgents[agentId];
    }

    /**
     * @notice Set an agent's orchestrator status (owner only)
     * @param agentId The agent ID to set as orchestrator
     * @param isOrchestrator The orchestrator status
     */
    function setAgentOrchestrator(uint256 agentId, bool isOrchestrator) external onlyOwner {
        require(_ownerOf(agentId) != address(0), "Agent does not exist");
        _orchestratorAgents[agentId] = isOrchestrator;
        _setMetadataInternal(agentId, KEY_IS_ORCHESTRATOR, abi.encode(isOrchestrator));
        emit AgentOrchestratorSet(agentId, isOrchestrator);
    }

    /**
     * @notice Check if an agent is an orchestrator
     * @param agentId The agent ID to check
     * @return isOrchestrator Whether the agent is an orchestrator
     */
    function isAgentOrchestrator(uint256 agentId) external view returns (bool) {
        return _orchestratorAgents[agentId];
    }

    /**
     * @notice Get all verified agents with pagination
     * @param offset Start index
     * @param limit Number of agents to return
     * @return agentIds Array of verified agent IDs
     */
    function getVerifiedAgents(uint256 offset, uint256 limit)
        external
        view
        returns (uint256[] memory agentIds)
    {
        uint256 total = totalSupply();
        uint256 count = 0;

        // First pass: count verified agents
        for (uint256 i = 1; i <= total; i++) {
            if (_verifiedAgents[i] && _isAgentActive(i)) count++;
        }

        // Calculate actual return size
        uint256 start = offset;
        uint256 end = offset + limit > count ? count : offset + limit;
        uint256 resultSize = end > start ? end - start : 0;

        agentIds = new uint256[](resultSize);

        // Second pass: collect verified agents
        uint256 currentIndex = 0;
        uint256 resultIndex = 0;

        for (uint256 i = 1; i <= total && resultIndex < resultSize; i++) {
            if (_verifiedAgents[i] && _isAgentActive(i)) {
                if (currentIndex >= start) {
                    agentIds[resultIndex] = i;
                    resultIndex++;
                }
                currentIndex++;
            }
        }
    }

    // ============ Internal Functions ============

    /**
     * @notice Internal function to register a new agent
     * @param tokenURI_ The token URI for the agent
     * @return agentId The new agent's ID
     */
    function _registerAgent(string memory tokenURI_) internal returns (uint256 agentId) {
        agentId = ++_nextAgentId;

        // Mint NFT to caller
        _safeMint(msg.sender, agentId);

        // Set token URI if provided
        if (bytes(tokenURI_).length > 0) {
            _setTokenURI(agentId, tokenURI_);
        }

        // Emit ERC-8004 compliant event
        emit Registered(agentId, tokenURI_, msg.sender);
    }

    /**
     * @notice Internal function to set metadata and emit event
     * @param agentId The agent's ID
     * @param key The metadata key
     * @param value The metadata value
     */
    function _setMetadataInternal(uint256 agentId, string memory key, bytes memory value) internal {
        _metadata[agentId][key] = value;

        // Emit ERC-8004 compliant event
        emit MetadataSet(agentId, keccak256(bytes(key)), key, value);
    }

    /**
     * @notice Decode metadata into legacy AgentMetadata struct
     * @param agentId The agent's ID
     * @return metadata The decoded metadata struct
     */
    function _decodeAgentMetadata(uint256 agentId)
        internal
        view
        returns (AgentMetadata memory metadata)
    {
        bytes memory walletData = _metadata[agentId][KEY_WALLET_ADDRESS];
        bytes memory nameData = _metadata[agentId][KEY_NAME];
        bytes memory strategyData = _metadata[agentId][KEY_STRATEGY_TYPE];
        bytes memory riskData = _metadata[agentId][KEY_RISK_LEVEL];
        bytes memory registeredData = _metadata[agentId][KEY_REGISTERED_AT];
        bytes memory activeData = _metadata[agentId][KEY_IS_ACTIVE];

        metadata.walletAddress =
            walletData.length > 0 ? abi.decode(walletData, (address)) : address(0);
        metadata.name = nameData.length > 0 ? abi.decode(nameData, (string)) : "";
        metadata.strategyType = strategyData.length > 0 ? abi.decode(strategyData, (string)) : "";
        metadata.riskLevel = riskData.length > 0 ? abi.decode(riskData, (uint8)) : 0;
        metadata.registeredAt =
            registeredData.length > 0 ? abi.decode(registeredData, (uint256)) : 0;
        metadata.isActive = activeData.length > 0 ? abi.decode(activeData, (bool)) : false;
    }

    /**
     * @notice Check if an agent is active
     * @param agentId The agent's ID
     * @return isActive Whether the agent is active
     */
    function _isAgentActive(uint256 agentId) internal view returns (bool) {
        bytes memory activeData = _metadata[agentId][KEY_IS_ACTIVE];
        if (activeData.length == 0) return false;
        return abi.decode(activeData, (bool));
    }

    // ============ Override Functions ============

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
