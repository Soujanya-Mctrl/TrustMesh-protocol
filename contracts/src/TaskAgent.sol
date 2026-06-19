// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IdentityRegistry.sol";
import "./ReputationRegistry.sol";
import "./ValidationRegistry.sol";

/**
 * @title TaskAgent
 * @notice Demo application showcasing ERC-8004 on Avalanche C-Chain
 * @dev A simple task service that demonstrates identity, reputation, and validation
 *
 * Use Cases:
 * 1. Agent registers with its capabilities
 * 2. Users request tasks (text summarization, code review, etc.)
 * 3. Agent completes tasks off-chain and posts result hash
 * 4. Users provide feedback via Reputation Registry
 * 5. Validators can verify agent capabilities via Validation Registry
 */
contract TaskAgent is Ownable, ReentrancyGuard {
    // Task status enum
    enum TaskStatus {
        Pending,
        InProgress,
        Completed,
        Disputed,
        Cancelled
    }

    // Task type enum
    enum TaskType {
        TextSummarization,
        CodeReview,
        DataAnalysis,
        Translation,
        Custom
    }

    struct Task {
        uint256 taskId;
        uint256 agentId;
        address requester;
        TaskType taskType;
        TaskStatus status;
        string inputURI;          // IPFS/Arweave URI for input data
        bytes32 inputHash;        // Hash of input for verification
        string outputURI;         // IPFS/Arweave URI for output
        bytes32 outputHash;       // Hash of output
        uint256 payment;          // Payment in AVAX
        uint256 createdAt;
        uint256 completedAt;
    }

    // ERC-8004 Registries
    IIdentityRegistry public identityRegistry;
    IReputationRegistry public reputationRegistry;
    IValidationRegistry public validationRegistry;

    // Agent's ERC-8004 identity
    uint256 public agentId;
    bool public isRegistered;

    // Task management
    uint256 private _nextTaskId = 1;
    mapping(uint256 => Task) public tasks;
    uint256[] public taskIds;

    // Pricing per task type (in wei)
    mapping(TaskType => uint256) public taskPrices;

    // Agent metadata
    string public agentName;
    string public agentDescription;
    string public agentURI;

    // Events
    event AgentRegistered(uint256 indexed agentId, string name, string uri);
    event TaskRequested(uint256 indexed taskId, address indexed requester, TaskType taskType, uint256 payment);
    event TaskStarted(uint256 indexed taskId);
    event TaskCompleted(uint256 indexed taskId, string outputURI, bytes32 outputHash);
    event TaskDisputed(uint256 indexed taskId, address indexed disputer);
    event TaskCancelled(uint256 indexed taskId);
    event PaymentWithdrawn(address indexed owner, uint256 amount);

    constructor(
        address _identityRegistry,
        address _reputationRegistry,
        address _validationRegistry
    ) Ownable(msg.sender) {
        identityRegistry = IIdentityRegistry(_identityRegistry);
        reputationRegistry = IReputationRegistry(_reputationRegistry);
        validationRegistry = IValidationRegistry(_validationRegistry);

        // Set default prices (in AVAX wei - these are example values)
        taskPrices[TaskType.TextSummarization] = 0.001 ether;
        taskPrices[TaskType.CodeReview] = 0.005 ether;
        taskPrices[TaskType.DataAnalysis] = 0.003 ether;
        taskPrices[TaskType.Translation] = 0.002 ether;
        taskPrices[TaskType.Custom] = 0.01 ether;
    }

    /// @notice Register the agent with ERC-8004 Identity Registry
    function registerAgent(
        string calldata _name,
        string calldata _description,
        string calldata _agentURI
    ) external onlyOwner {
        require(!isRegistered, "Already registered");

        agentName = _name;
        agentDescription = _description;
        agentURI = _agentURI;

        // Create metadata entries
        IIdentityRegistry.MetadataEntry[] memory metadata = new IIdentityRegistry.MetadataEntry[](2);
        metadata[0] = IIdentityRegistry.MetadataEntry({
            key: "name",
            value: bytes(_name)
        });
        metadata[1] = IIdentityRegistry.MetadataEntry({
            key: "description",
            value: bytes(_description)
        });

        // Register with Identity Registry
        agentId = identityRegistry.registerFor(msg.sender, _agentURI, metadata);
        isRegistered = true;

        emit AgentRegistered(agentId, _name, _agentURI);
    }

    /// @notice Request a task from the agent
    function requestTask(
        TaskType taskType,
        string calldata inputURI,
        bytes32 inputHash
    ) external payable nonReentrant returns (uint256 taskId) {
        require(isRegistered, "Agent not registered");
        require(msg.value >= taskPrices[taskType], "Insufficient payment");

        taskId = _nextTaskId++;

        tasks[taskId] = Task({
            taskId: taskId,
            agentId: agentId,
            requester: msg.sender,
            taskType: taskType,
            status: TaskStatus.Pending,
            inputURI: inputURI,
            inputHash: inputHash,
            outputURI: "",
            outputHash: bytes32(0),
            payment: msg.value,
            createdAt: block.timestamp,
            completedAt: 0
        });

        taskIds.push(taskId);

        emit TaskRequested(taskId, msg.sender, taskType, msg.value);
    }

    /// @notice Start working on a task (agent only)
    function startTask(uint256 taskId) external onlyOwner {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.Pending, "Task not pending");

        task.status = TaskStatus.InProgress;
        emit TaskStarted(taskId);
    }

    /// @notice Complete a task with output (agent only)
    function completeTask(
        uint256 taskId,
        string calldata outputURI,
        bytes32 outputHash
    ) external onlyOwner {
        Task storage task = tasks[taskId];
        require(task.status == TaskStatus.InProgress, "Task not in progress");

        task.status = TaskStatus.Completed;
        task.outputURI = outputURI;
        task.outputHash = outputHash;
        task.completedAt = block.timestamp;

        emit TaskCompleted(taskId, outputURI, outputHash);
    }

    /// @notice Dispute a completed task (requester only)
    function disputeTask(uint256 taskId) external {
        Task storage task = tasks[taskId];
        require(task.requester == msg.sender, "Not the requester");
        require(task.status == TaskStatus.Completed, "Task not completed");
        require(block.timestamp <= task.completedAt + 7 days, "Dispute period expired");

        task.status = TaskStatus.Disputed;
        emit TaskDisputed(taskId, msg.sender);
    }

    /// @notice Cancel a pending task and refund (requester only)
    function cancelTask(uint256 taskId) external nonReentrant {
        Task storage task = tasks[taskId];
        require(task.requester == msg.sender, "Not the requester");
        require(task.status == TaskStatus.Pending, "Task not pending");

        task.status = TaskStatus.Cancelled;

        // Refund payment
        (bool success, ) = msg.sender.call{value: task.payment}("");
        require(success, "Refund failed");

        emit TaskCancelled(taskId);
    }

    /// @notice Give feedback for a completed task
    /// @dev Convenience function that calls Reputation Registry
    function giveFeedback(
        uint256 taskId,
        int128 rating,
        string calldata comment
    ) external {
        Task storage task = tasks[taskId];
        require(task.requester == msg.sender, "Not the requester");
        require(task.status == TaskStatus.Completed, "Task not completed");

        // Convert task type to tag
        string memory tag1 = _taskTypeToString(task.taskType);

        reputationRegistry.giveFeedback(
            agentId,
            rating,
            0,              // 0 decimals (whole number rating)
            tag1,
            comment,
            "",             // endpoint
            "",             // feedbackURI
            bytes32(0)      // feedbackHash
        );
    }

    /// @notice Request validation from a validator
    function requestValidation(
        address validator,
        string calldata requestURI,
        bytes32 requestHash
    ) external onlyOwner {
        require(isRegistered, "Agent not registered");
        validationRegistry.validationRequest(validator, agentId, requestURI, requestHash);
    }

    /// @notice Set price for a task type
    function setTaskPrice(TaskType taskType, uint256 price) external onlyOwner {
        taskPrices[taskType] = price;
    }

    /// @notice Withdraw accumulated payments
    function withdraw() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");

        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Withdrawal failed");

        emit PaymentWithdrawn(msg.sender, balance);
    }

    /// @notice Update agent URI in Identity Registry
    function updateAgentURI(string calldata newURI) external onlyOwner {
        require(isRegistered, "Agent not registered");
        agentURI = newURI;
        identityRegistry.setAgentURI(agentId, newURI);
    }

    // View functions

    /// @notice Get task details
    function getTask(uint256 taskId) external view returns (Task memory) {
        return tasks[taskId];
    }

    /// @notice Get all task IDs
    function getAllTaskIds() external view returns (uint256[] memory) {
        return taskIds;
    }

    /// @notice Get tasks by status
    function getTasksByStatus(TaskStatus status) external view returns (uint256[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < taskIds.length; i++) {
            if (tasks[taskIds[i]].status == status) {
                count++;
            }
        }

        uint256[] memory result = new uint256[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < taskIds.length; i++) {
            if (tasks[taskIds[i]].status == status) {
                result[index++] = taskIds[i];
            }
        }

        return result;
    }

    /// @notice Get agent reputation summary
    function getReputationSummary() external view returns (
        uint64 feedbackCount,
        int128 averageRating
    ) {
        address[] memory empty = new address[](0);
        (feedbackCount, averageRating,) = reputationRegistry.getSummary(agentId, empty, "", "");
    }

    /// @notice Get agent validation summary
    function getValidationSummary() external view returns (
        uint64 validationCount,
        uint8 averageScore
    ) {
        address[] memory empty = new address[](0);
        (validationCount, averageScore) = validationRegistry.getSummary(agentId, empty, "");
    }

    /// @notice Get total tasks count
    function getTotalTasks() external view returns (uint256) {
        return taskIds.length;
    }

    // Internal helpers

    function _taskTypeToString(TaskType taskType) internal pure returns (string memory) {
        if (taskType == TaskType.TextSummarization) return "summarization";
        if (taskType == TaskType.CodeReview) return "code-review";
        if (taskType == TaskType.DataAnalysis) return "data-analysis";
        if (taskType == TaskType.Translation) return "translation";
        return "custom";
    }

    // Allow contract to receive AVAX
    receive() external payable {}
}
