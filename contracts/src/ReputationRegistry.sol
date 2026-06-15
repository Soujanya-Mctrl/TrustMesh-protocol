// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IdentityRegistry.sol";

interface IReputationRegistry {
    event NewFeedback(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        int128 value,
        uint8 valueDecimals,
        string indexed indexedTag1,
        string tag1,
        string tag2,
        string endpoint,
        string feedbackURI,
        bytes32 feedbackHash
    );

    event FeedbackRevoked(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 indexed feedbackIndex
    );

    event ResponseAppended(
        uint256 indexed agentId,
        address indexed clientAddress,
        uint64 feedbackIndex,
        address indexed responder,
        string responseURI,
        bytes32 responseHash
    );

    function getIdentityRegistry() external view returns (address);

    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external;

    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external;

    function appendResponse(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        string calldata responseURI,
        bytes32 responseHash
    ) external;

    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1,
        string calldata tag2
    ) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals);

    function readFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex
    ) external view returns (
        int128 value,
        uint8 valueDecimals,
        string memory tag1,
        string memory tag2,
        bool isRevoked
    );

    function getClients(uint256 agentId) external view returns (address[] memory);
    function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64);
}

/**
 * @title ReputationRegistry
 * @notice ERC-8004 Reputation Registry implementation for Avalanche C-Chain
 * @dev Manages feedback and reputation for registered agents
 */
contract ReputationRegistry is IReputationRegistry, Ownable {
    struct FeedbackEntry {
        int128 value;
        uint8 valueDecimals;
        string tag1;
        string tag2;
        bool isRevoked;
    }

    IIdentityRegistry public immutable identityRegistry;

    // agentId => clientAddress => feedbackIndex => FeedbackEntry
    mapping(uint256 => mapping(address => mapping(uint64 => FeedbackEntry))) private _feedback;

    // agentId => clientAddress => lastFeedbackIndex
    mapping(uint256 => mapping(address => uint64)) private _lastIndex;

    // agentId => list of clients who gave feedback
    mapping(uint256 => address[]) private _clients;
    mapping(uint256 => mapping(address => bool)) private _isClient;

    // agentId => clientAddress => feedbackIndex => responder => responseCount
    mapping(uint256 => mapping(address => mapping(uint64 => mapping(address => uint64)))) private _responses;

    constructor(address _identityRegistry) Ownable(msg.sender) {
        identityRegistry = IIdentityRegistry(_identityRegistry);
    }

    function getIdentityRegistry() external view returns (address) {
        return address(identityRegistry);
    }

    /// @notice Submit feedback for an agent
    function giveFeedback(
        uint256 agentId,
        int128 value,
        uint8 valueDecimals,
        string calldata tag1,
        string calldata tag2,
        string calldata endpoint,
        string calldata feedbackURI,
        bytes32 feedbackHash
    ) external {
        require(valueDecimals <= 18, "Decimals too high");

        // Prevent self-feedback
        try identityRegistry.getAgentWallet(agentId) returns (address wallet) {
            require(wallet != msg.sender, "Cannot give self-feedback");
        } catch {}

        // Track client
        if (!_isClient[agentId][msg.sender]) {
            _clients[agentId].push(msg.sender);
            _isClient[agentId][msg.sender] = true;
        }

        uint64 feedbackIndex = ++_lastIndex[agentId][msg.sender];

        _feedback[agentId][msg.sender][feedbackIndex] = FeedbackEntry({
            value: value,
            valueDecimals: valueDecimals,
            tag1: tag1,
            tag2: tag2,
            isRevoked: false
        });

        emit NewFeedback(
            agentId,
            msg.sender,
            feedbackIndex,
            value,
            valueDecimals,
            tag1,
            tag1,
            tag2,
            endpoint,
            feedbackURI,
            feedbackHash
        );
    }

    /// @notice Revoke previously submitted feedback
    function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external {
        FeedbackEntry storage entry = _feedback[agentId][msg.sender][feedbackIndex];
        require(entry.valueDecimals > 0 || entry.value != 0, "Feedback does not exist");
        require(!entry.isRevoked, "Already revoked");

        entry.isRevoked = true;
        emit FeedbackRevoked(agentId, msg.sender, feedbackIndex);
    }

    /// @notice Append a response to feedback
    function appendResponse(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        string calldata responseURI,
        bytes32 responseHash
    ) external {
        FeedbackEntry storage entry = _feedback[agentId][clientAddress][feedbackIndex];
        require(entry.valueDecimals > 0 || entry.value != 0, "Feedback does not exist");

        _responses[agentId][clientAddress][feedbackIndex][msg.sender]++;

        emit ResponseAppended(
            agentId,
            clientAddress,
            feedbackIndex,
            msg.sender,
            responseURI,
            responseHash
        );
    }

    /// @notice Get summary of feedback for an agent
    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1,
        string calldata tag2
    ) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals) {
        address[] memory clients;
        if (clientAddresses.length > 0) {
            clients = new address[](clientAddresses.length);
            for (uint256 i = 0; i < clientAddresses.length; i++) {
                clients[i] = clientAddresses[i];
            }
        } else {
            clients = _clients[agentId];
        }
        summaryValueDecimals = 18;

        int256 total = 0;

        for (uint256 i = 0; i < clients.length; i++) {
            address client = clients[i];
            uint64 lastIdx = _lastIndex[agentId][client];

            for (uint64 j = 1; j <= lastIdx; j++) {
                FeedbackEntry storage entry = _feedback[agentId][client][j];

                if (entry.isRevoked) continue;

                // Filter by tags if provided
                if (bytes(tag1).length > 0 && keccak256(bytes(entry.tag1)) != keccak256(bytes(tag1))) continue;
                if (bytes(tag2).length > 0 && keccak256(bytes(entry.tag2)) != keccak256(bytes(tag2))) continue;

                // Normalize to 18 decimals
                int256 normalizedValue = int256(entry.value) * int256(10 ** (18 - entry.valueDecimals));
                total += normalizedValue;
                count++;
            }
        }

        if (count > 0) {
            summaryValue = int128(total / int256(uint256(count)));
        }
    }

    /// @notice Read a specific feedback entry
    function readFeedback(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex
    ) external view returns (
        int128 value,
        uint8 valueDecimals,
        string memory tag1,
        string memory tag2,
        bool isRevoked
    ) {
        FeedbackEntry storage entry = _feedback[agentId][clientAddress][feedbackIndex];
        return (entry.value, entry.valueDecimals, entry.tag1, entry.tag2, entry.isRevoked);
    }

    /// @notice Get all clients who gave feedback to an agent
    function getClients(uint256 agentId) external view returns (address[] memory) {
        return _clients[agentId];
    }

    /// @notice Get the last feedback index for a client
    function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64) {
        return _lastIndex[agentId][clientAddress];
    }

    /// @notice Get response count for a feedback entry
    function getResponseCount(
        uint256 agentId,
        address clientAddress,
        uint64 feedbackIndex,
        address responder
    ) external view returns (uint64) {
        return _responses[agentId][clientAddress][feedbackIndex][responder];
    }
}
