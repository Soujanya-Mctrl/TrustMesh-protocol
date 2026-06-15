// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentMetricsRegistry {
    function recordSettlement(address payer, address payee, uint256 amountAvax, uint256 settledUsd18) external;
}

interface ITrustRegistry {
    struct CompositeScoreResult {
        uint8 score;
        bool unregistered;
        bool sybilFlagged;
        uint32 cachedAt;
    }
    function getCompositeScore(address agent) external returns (CompositeScoreResult memory);
}

interface IValidationRegistry {
    function validationResponse(
        bytes32 requestHash,
        uint8 response,
        string calldata responseURI,
        bytes32 responseHash,
        string calldata tag
    ) external;
}

contract PolicyEngine {
    address public admin;
    address public agentMetricsRegistry;
    address public trustRegistry;
    address public validationRegistry;

    mapping(address => bool) public facilitators;

    event FacilitatorAdded(address indexed who);
    event FacilitatorRemoved(address indexed who);
    event PaymentRouted(address indexed payer, address indexed payee, uint8 tier, uint256 amountAvax);

    event HumanReviewRequired(
        bytes32 indexed jobId,
        address indexed provider,
        uint256 amount,
        uint256 trustScore,
        bool sybilFlagged
    );

    enum HumanDecision { Reject, ApproveWithEscrow, ApproveDirect }

    event HumanDecisionRecorded(bytes32 indexed requestHash, HumanDecision decision, address human);

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin");
        _;
    }

    modifier onlyFacilitator() {
        require(facilitators[msg.sender], "only facilitator");
        _;
    }

    constructor(address _agentMetrics, address _trustRegistry, address _validationRegistry) {
        admin = msg.sender;
        agentMetricsRegistry = _agentMetrics;
        trustRegistry = _trustRegistry;
        validationRegistry = _validationRegistry;
    }

    function addFacilitator(address f) external onlyAdmin {
        facilitators[f] = true;
        emit FacilitatorAdded(f);
    }

    function removeFacilitator(address f) external onlyAdmin {
        facilitators[f] = false;
        emit FacilitatorRemoved(f);
    }

    // Evaluate tier for a payee; simple thresholds using TrustRegistry score
    // Tier 0: score >= 70
    // Tier 1: score >= 40 && <70
    // Tier 2: score < 40
    function evaluateTier(address payee, uint256 amountAvax) public returns (uint8) {
        ITrustRegistry.CompositeScoreResult memory r = ITrustRegistry(trustRegistry).getCompositeScore(payee);
        uint8 s = r.score;
        if (s >= 70) return 0;
        if (s >= 40) return 1;

        // Tier 2: Emit HumanReviewRequired event
        bytes32 jobId = keccak256(abi.encodePacked(payee, amountAvax, block.timestamp));
        emit HumanReviewRequired(jobId, payee, amountAvax, s, r.sybilFlagged);
        return 2;
    }

    // Called by an authorized facilitator to record that a Tier 0 direct settlement occurred
    function recordDirectSettlement(address payer, address payee, uint256 amountAvax, uint256 settledUsd18) external onlyFacilitator {
        IAgentMetricsRegistry(agentMetricsRegistry).recordSettlement(payer, payee, amountAvax, settledUsd18);
        emit PaymentRouted(payer, payee, 0, amountAvax);
    }

    // Utility: returns routing decision and emits event
    function decideAndEmit(address payer, address payee, uint256 amountAvax) external returns (uint8) {
        uint8 tier = evaluateTier(payee, amountAvax);
        emit PaymentRouted(payer, payee, tier, amountAvax);
        return tier;
    }

    // Human-in-the-loop validation approval helper for Tier 2 escalation
    function recordHumanDecision(bytes32 requestHash, HumanDecision decision, address human) public onlyAdmin {
        emit HumanDecisionRecorded(requestHash, decision, human);
        uint8 response = (decision == HumanDecision.Reject) ? 0 : 100;
        IValidationRegistry(validationRegistry).validationResponse(
            requestHash,
            response,
            "",
            bytes32(0),
            ""
        );
    }

    // Legacy helper to support unit tests
    function humanApprove(bytes32 requestHash, bool passed) external onlyAdmin {
        recordHumanDecision(requestHash, passed ? HumanDecision.ApproveDirect : HumanDecision.Reject, msg.sender);
    }
}
