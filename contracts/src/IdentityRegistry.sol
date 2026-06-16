// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";

interface IIdentityRegistry {
    struct MetadataEntry {
        string key;
        bytes value;
    }

    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event URIUpdated(uint256 indexed agentId, string newURI, address indexed updatedBy);
    event MetadataSet(
        uint256 indexed agentId,
        string indexed indexedMetadataKey,
        string metadataKey,
        bytes metadataValue
    );
    event AgentWalletSet(uint256 indexed agentId, address indexed wallet);
    event AgentWalletUnset(uint256 indexed agentId);

    function register(string calldata agentURI, MetadataEntry[] calldata metadata) external returns (uint256 agentId);
    function register(string calldata agentURI) external returns (uint256 agentId);
    function register() external returns (uint256 agentId);
    function registerFor(address wallet, string memory agentURI, MetadataEntry[] memory metadata) external returns (uint256 agentId);

    function setAgentURI(uint256 agentId, string calldata newURI) external;
    function getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes memory);
    function setMetadata(uint256 agentId, string memory metadataKey, bytes memory metadataValue) external;

    function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature) external;
    function getAgentWallet(uint256 agentId) external view returns (address);
    function unsetAgentWallet(uint256 agentId) external;

    function isAuthorized(uint256 agentId, address caller) external view returns (bool);
    function getAgentIdByWallet(address who) external view returns (uint256);
    function getRegistrationTime(uint256 agentId) external view returns (uint256);
}
/**
 * @title IdentityRegistry
 * @notice ERC-8004 Identity Registry implementation for Avalanche C-Chain
 * @dev Manages agent identities as ERC-721 NFTs with metadata and wallet binding
 */
contract IdentityRegistry is ERC721URIStorage, IIdentityRegistry {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    uint256 private _nextAgentId = 1;

    address public admin;

    // agentId => metadataKey => metadataValue
    mapping(uint256 => mapping(string => bytes)) private _metadata;

    // agentId => agent wallet address
    mapping(uint256 => address) private _agentWallets;

    // agent wallet address => agentId
    mapping(address => uint256) private _walletToAgentId;

    // agentId => registration timestamp
    mapping(uint256 => uint256) private _registeredAt;

    // Reserved metadata key
    string private constant AGENT_WALLET_KEY = "agentWallet";

    // EIP-712 domain separator
    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 private constant WALLET_TYPEHASH = keccak256("SetAgentWallet(uint256 agentId,address newWallet,uint256 deadline)");

    constructor() ERC721("ERC8004 Agent Identity", "AGENT") {
        admin = msg.sender;
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("ERC8004 Identity Registry")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    /// @notice Register a new agent with URI, metadata, and a designated wallet address
    function registerFor(
        address wallet,
        string memory agentURI,
        MetadataEntry[] memory metadata
    ) public returns (uint256 agentId) {
        agentId = _nextAgentId++;
        _mint(msg.sender, agentId);
        _agentWallets[agentId] = wallet;
        _walletToAgentId[wallet] = agentId;
        _registeredAt[agentId] = block.timestamp;
        _setTokenURI(agentId, agentURI);

        for (uint256 i = 0; i < metadata.length; i++) {
            require(
                keccak256(bytes(metadata[i].key)) != keccak256(bytes(AGENT_WALLET_KEY)),
                "Cannot set reserved key"
            );
            _metadata[agentId][metadata[i].key] = metadata[i].value;
            emit MetadataSet(agentId, metadata[i].key, metadata[i].key, metadata[i].value);
        }

        emit AgentWalletSet(agentId, wallet);
        emit Registered(agentId, agentURI, msg.sender);
    }

    /// @notice Register a new agent with URI and metadata
    function register(string calldata agentURI, MetadataEntry[] calldata metadata) external returns (uint256 agentId) {
        return registerFor(msg.sender, agentURI, metadata);
    }

    /// @notice Register a new agent with URI only
    function register(string calldata agentURI) external returns (uint256 agentId) {
        return registerFor(msg.sender, agentURI, new MetadataEntry[](0));
    }

    /// @notice Register a new agent with no URI
    function register() external returns (uint256 agentId) {
        return registerFor(msg.sender, "", new MetadataEntry[](0));
    }

    /// @notice Update the agent URI
    function setAgentURI(uint256 agentId, string calldata newURI) external {
        require(isAuthorized(agentId, msg.sender), "Not authorized");
        _setTokenURI(agentId, newURI);
        emit URIUpdated(agentId, newURI, msg.sender);
    }

    /// @notice Get metadata value for a key
    function getMetadata(uint256 agentId, string memory metadataKey) external view returns (bytes memory) {
        if (keccak256(bytes(metadataKey)) == keccak256(bytes(AGENT_WALLET_KEY))) {
            return abi.encode(_agentWallets[agentId]);
        }
        return _metadata[agentId][metadataKey];
    }

    /// @notice Set metadata value for a key
    function setMetadata(uint256 agentId, string memory metadataKey, bytes memory metadataValue) external {
        require(isAuthorized(agentId, msg.sender), "Not authorized");
        require(
            keccak256(bytes(metadataKey)) != keccak256(bytes(AGENT_WALLET_KEY)),
            "Cannot set reserved key"
        );
        _metadata[agentId][metadataKey] = metadataValue;
        emit MetadataSet(agentId, metadataKey, metadataKey, metadataValue);
    }

    /// @notice Set agent wallet with signature verification
    function setAgentWallet(
        uint256 agentId,
        address newWallet,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(isAuthorized(agentId, msg.sender), "Not authorized");
        require(deadline >= block.timestamp, "Deadline expired");
        require(deadline <= block.timestamp + 5 minutes, "Deadline too far");

        bytes32 structHash = keccak256(abi.encode(WALLET_TYPEHASH, agentId, newWallet, deadline));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash));

        // Try ECDSA recovery first
        address recovered = digest.recover(signature);
        if (recovered != newWallet) {
            // Fallback to ERC1271
            try IERC1271(newWallet).isValidSignature(digest, signature) returns (bytes4 magicValue) {
                require(magicValue == IERC1271.isValidSignature.selector, "Invalid signature");
            } catch {
                revert("Invalid signature");
            }
        }

        address oldWallet = _agentWallets[agentId];
        if (oldWallet != address(0)) {
            delete _walletToAgentId[oldWallet];
        }

        _agentWallets[agentId] = newWallet;
        _walletToAgentId[newWallet] = agentId;
        emit AgentWalletSet(agentId, newWallet);
    }

    /// @notice Get the agent wallet address
    function getAgentWallet(uint256 agentId) external view returns (address) {
        return _agentWallets[agentId];
    }

    /// @notice Unset the agent wallet
    function unsetAgentWallet(uint256 agentId) external {
        require(isAuthorized(agentId, msg.sender), "Not authorized");
        address oldWallet = _agentWallets[agentId];
        if (oldWallet != address(0)) {
            delete _walletToAgentId[oldWallet];
        }
        delete _agentWallets[agentId];
        emit AgentWalletUnset(agentId);
    }

    /// @notice Check if caller is authorized for agent operations
    function isAuthorized(uint256 agentId, address caller) public view returns (bool) {
        address owner = ownerOf(agentId);
        return caller == owner ||
               isApprovedForAll(owner, caller) ||
               getApproved(agentId) == caller;
    }

    /// @notice Clear agent wallet on transfer
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        address from = super._update(to, tokenId, auth);
        if (from != address(0) && to != address(0) && from != to) {
            address oldWallet = _agentWallets[tokenId];
            if (oldWallet != address(0)) {
                delete _walletToAgentId[oldWallet];
            }
            delete _agentWallets[tokenId];
            emit AgentWalletUnset(tokenId);
        }
        return from;
    }

    /// @notice Get total registered agents
    function totalAgents() external view returns (uint256) {
        return _nextAgentId - 1;
    }

    /// @notice Get agentId from a wallet address
    function getAgentIdByWallet(address who) external view returns (uint256) {
        return _walletToAgentId[who];
    }

    /// @notice Get registration timestamp for agentId
    function getRegistrationTime(uint256 agentId) external view returns (uint256) {
        return _registeredAt[agentId];
    }

    /// @notice Set/override registration timestamp for agentId (for testing/seeding)
    function setRegistrationTime(uint256 agentId, uint256 timestamp) external {
        ownerOf(agentId); // Reverts if token doesn't exist
        require(msg.sender == admin || isAuthorized(agentId, msg.sender), "Not authorized");
        _registeredAt[agentId] = timestamp;
    }
}
