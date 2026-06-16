// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./IdentityRegistry.sol";

interface IValidationRegistry {
    event ValidationRequest(
        address indexed validatorAddress,
        uint256 indexed agentId,
        string requestURI,
        bytes32 indexed requestHash
    );

    event ValidationResponse(
        address indexed validatorAddress,
        uint256 indexed agentId,
        bytes32 indexed requestHash,
        uint8 response,
        string responseURI,
        bytes32 responseHash,
        string tag
    );

    function getIdentityRegistry() external view returns (address);

    function validationRequest(
        address validatorAddress,
        uint256 agentId,
        string calldata requestURI,
        bytes32 requestHash
    ) external;

    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseURI,
        bytes32 responseHash,
        string calldata tag
    ) external;

    function getValidationStatus(bytes32 requestHash) external view returns (
        address validatorAddress,
        uint256 agentId,
        uint8 response,
        bytes32 responseHash,
        string memory tag,
        uint256 lastUpdate
    );

    function getSummary(
        uint256 agentId,
        address[] calldata validatorAddresses,
        string calldata tag
    ) external view returns (uint64 count, uint8 averageResponse);

    function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory requestHashes);
    function getValidatorRequests(address validatorAddress) external view returns (bytes32[] memory requestHashes);
    function isValidationComplete(bytes32 requestHash) external view returns (bool);
}

/**
 * @title ValidationRegistry
 * @notice ERC-8004 Validation Registry implementation for Avalanche C-Chain
 * @dev Manages validation requests and responses for registered agents
 */
contract ValidationRegistry is IValidationRegistry, Ownable {
    struct ValidationStatus {
        address validatorAddress;
        uint256 agentId;
        uint8 response;
        bytes32 responseHash;
        string tag;
        uint256 lastUpdate;
        bool isComplete;
    }

    IIdentityRegistry public immutable identityRegistry;

    // requestHash => ValidationStatus
    mapping(bytes32 => ValidationStatus) private _validations;

    // agentId => array of request hashes
    mapping(uint256 => bytes32[]) private _agentValidations;

    // validatorAddress => array of request hashes
    mapping(address => bytes32[]) private _validatorRequests;

    mapping(address => bool) public authorizedWriters;
    event WriterAuthorizationChanged(address indexed writer, bool authorized);

    function setAuthorizedWriter(address writer, bool ok) external onlyOwner {
        authorizedWriters[writer] = ok;
        emit WriterAuthorizationChanged(writer, ok);
    }

    constructor(address _identityRegistry) Ownable(msg.sender) {
        identityRegistry = IIdentityRegistry(_identityRegistry);
    }

    function getIdentityRegistry() external view returns (address) {
        return address(identityRegistry);
    }

    /// @notice Create a validation request
    function validationRequest(
        address validatorAddress,
        uint256 agentId,
        string calldata requestURI,
        bytes32 requestHash
    ) external {
        require(identityRegistry.isAuthorized(agentId, msg.sender), "Not authorized");
        require(_validations[requestHash].lastUpdate == 0, "Request already exists");

        _validations[requestHash] = ValidationStatus({
            validatorAddress: validatorAddress,
            agentId: agentId,
            response: 0,
            responseHash: bytes32(0),
            tag: "",
            lastUpdate: block.timestamp,
            isComplete: false
        });

        _agentValidations[agentId].push(requestHash);
        _validatorRequests[validatorAddress].push(requestHash);

        emit ValidationRequest(validatorAddress, agentId, requestURI, requestHash);
    }

    /// @notice Submit a validation response
    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseURI,
        bytes32 responseHash,
        string calldata tag
    ) external {
        ValidationStatus storage status = _validations[requestHash];
        require(status.lastUpdate > 0, "Request does not exist");
        require(
            status.validatorAddress == msg.sender || 
            msg.sender == owner() || 
            authorizedWriters[msg.sender], 
            "Not the designated validator"
        );
        require(response <= 100, "Response must be 0-100");

        status.response = response;
        status.responseHash = responseHash;
        status.tag = tag;
        status.lastUpdate = block.timestamp;
        status.isComplete = true;

        emit ValidationResponse(
            msg.sender,
            status.agentId,
            requestHash,
            response,
            responseURI,
            responseHash,
            tag
        );
    }

    /// @notice Get the status of a validation request
    function getValidationStatus(bytes32 requestHash) external view returns (
        address validatorAddress,
        uint256 agentId,
        uint8 response,
        bytes32 responseHash,
        string memory tag,
        uint256 lastUpdate
    ) {
        ValidationStatus storage status = _validations[requestHash];
        return (
            status.validatorAddress,
            status.agentId,
            status.response,
            status.responseHash,
            status.tag,
            status.lastUpdate
        );
    }

    /// @notice Get summary of validations for an agent
    function getSummary(
        uint256 agentId,
        address[] calldata validatorAddresses,
        string calldata tag
    ) external view returns (uint64 count, uint8 averageResponse) {
        bytes32[] storage hashes = _agentValidations[agentId];
        uint256 total = 0;

        for (uint256 i = 0; i < hashes.length; i++) {
            ValidationStatus storage status = _validations[hashes[i]];

            if (!status.isComplete) continue;

            // Filter by validators if provided
            if (validatorAddresses.length > 0) {
                bool found = false;
                for (uint256 j = 0; j < validatorAddresses.length; j++) {
                    if (status.validatorAddress == validatorAddresses[j]) {
                        found = true;
                        break;
                    }
                }
                if (!found) continue;
            }

            // Filter by tag if provided
            if (bytes(tag).length > 0 && keccak256(bytes(status.tag)) != keccak256(bytes(tag))) continue;

            total += status.response;
            count++;
        }

        if (count > 0) {
            averageResponse = uint8(total / count);
        }
    }

    /// @notice Get all validation request hashes for an agent
    function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory requestHashes) {
        return _agentValidations[agentId];
    }

    /// @notice Get all validation request hashes for a validator
    function getValidatorRequests(address validatorAddress) external view returns (bytes32[] memory requestHashes) {
        return _validatorRequests[validatorAddress];
    }

    /// @notice Check if a validation is complete
    function isValidationComplete(bytes32 requestHash) external view returns (bool) {
        return _validations[requestHash].isComplete;
    }
}
