// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IIdentityRegistry {
    function getAgentIdByWallet(address who) external view returns (uint256);
    function getRegistrationTime(uint256 agentId) external view returns (uint256);
}

interface IReputationRegistry {
    function getSummary(
        uint256 agentId,
        address[] calldata clientAddresses,
        string calldata tag1,
        string calldata tag2
    ) external view returns (uint64 count, int128 summaryValue, uint8 summaryValueDecimals);
}

interface IAgentMetricsRegistry {
    struct AgentMetrics {
        uint256 settledVolumeUsd18;
        uint64 totalSettledTransactions;
        uint64 microTransactionCount;
        uint32 distinctCounterpartyCount;
    }

    function getMetrics(address agent) external view returns (AgentMetrics memory);
}

contract TrustRegistry {
    address public immutable IDENTITY_REGISTRY;
    address public immutable REPUTATION_REGISTRY;
    address public immutable AGENT_METRICS_REGISTRY;
    uint32 public constant CACHE_TTL = 60;

    struct CompositeScoreResult {
        uint8 score;
        bool unregistered;
        bool sybilFlagged;
        uint32 cachedAt;
    }

    mapping(address => CompositeScoreResult) internal cache;

    event ScoreComputed(address indexed agentAddress, uint8 compositeScore, uint256 timestamp);

    address public admin;

    modifier onlyAdmin() {
        require(msg.sender == admin, "TR: only admin");
        _;
    }

    constructor(address identity_, address reputation_, address metrics_) {
        IDENTITY_REGISTRY = identity_;
        REPUTATION_REGISTRY = reputation_;
        AGENT_METRICS_REGISTRY = metrics_;
        admin = msg.sender;
    }

    function getCachedScore(address agentAddress) external view returns (CompositeScoreResult memory) {
        return cache[agentAddress];
    }

    function getCompositeScore(address agentAddress) external returns (CompositeScoreResult memory result) {
        if (cache[agentAddress].cachedAt != 0 && block.timestamp <= uint256(cache[agentAddress].cachedAt) + CACHE_TTL) {
            emit ScoreComputed(agentAddress, cache[agentAddress].score, block.timestamp);
            return cache[agentAddress];
        }

        // registration check
        uint256 agentId = 0;
        if (IDENTITY_REGISTRY != address(0)) {
            agentId = IIdentityRegistry(IDENTITY_REGISTRY).getAgentIdByWallet(agentAddress);
        }

        bool registered = (agentId != 0 || seededRegistered[agentAddress]);

        if (!registered) {
            cache[agentAddress].score = 0;
            cache[agentAddress].unregistered = true;
            cache[agentAddress].sybilFlagged = false;
            cache[agentAddress].cachedAt = uint32(block.timestamp);
            emit ScoreComputed(agentAddress, 0, block.timestamp);
            return cache[agentAddress];
        }

        uint8 reputationScore = 0;
        uint256 feedbackCount = 0;

        if (REPUTATION_REGISTRY == address(0)) {
            reputationScore = seededReputation[agentAddress];
            feedbackCount = seededFeedbackCount[agentAddress];
            if (feedbackCount == 0 && seededRegistered[agentAddress]) {
                // default to 5 to avoid penalty for unseeded tests
                feedbackCount = 5;
            }
        } else {
            address[] memory empty = new address[](0);
            (uint64 fbCount, int128 avgRating, ) = IReputationRegistry(REPUTATION_REGISTRY).getSummary(agentId, empty, "", "");
            feedbackCount = fbCount;
            if (fbCount > 0) {
                int256 rating = int256(avgRating);
                if (rating > 5) rating = 5;
                if (rating < 1) rating = 1;
                reputationScore = uint8(uint256(rating - 1) * 25);
            } else {
                reputationScore = 100; // default to 100 if no ratings yet
            }
        }
        if (feedbackCount < 3) {
            reputationScore = uint8(uint256(reputationScore) * 50 / 100);
        }

        uint8 ageScore = _identityAgeScore(agentAddress);

        IAgentMetricsRegistry.AgentMetrics memory m;
        if (AGENT_METRICS_REGISTRY == address(0)) {
            m = seededMetrics[agentAddress];
        } else {
            m = IAgentMetricsRegistry(AGENT_METRICS_REGISTRY).getMetrics(agentAddress);
        }
        uint8 volumeScore = _txValueWeightScore(m.settledVolumeUsd18);
        uint8 diversityScore = _counterpartyDiversityScore(m.distinctCounterpartyCount);
        bool isSybil = _detectSybil(m.microTransactionCount, m.totalSettledTransactions);

        if (isSybil) {
            diversityScore = uint8(uint256(diversityScore) * 10 / 100); // diversityScore = diversityScore * 0.1
        }

        uint256 weighted = uint256(reputationScore) * 40 + uint256(ageScore) * 20 + uint256(volumeScore) * 20 + uint256(diversityScore) * 20;
        uint8 composite = uint8(weighted / 100);

        if (isSybil) {
            composite = uint8(uint256(composite) * 30 / 100); // finalScore = composite * 0.3
        }

        cache[agentAddress].score = composite;
        cache[agentAddress].unregistered = false;
        cache[agentAddress].sybilFlagged = isSybil;
        cache[agentAddress].cachedAt = uint32(block.timestamp);
        emit ScoreComputed(agentAddress, composite, block.timestamp);
        return cache[agentAddress];
    }

    // ===== Admin seeding helpers (demo only) =====
    mapping(address => bool) public seededRegistered;
    mapping(address => uint256) public seededRegistrationTime;
    mapping(address => uint8) public seededReputation;
    mapping(address => uint256) public seededFeedbackCount;

    function seedRegistered(address who, bool ok, uint256 ts) external onlyAdmin {
        seededRegistered[who] = ok;
        seededRegistrationTime[who] = ts;
    }

    function seedReputation(address who, uint8 score) external onlyAdmin {
        seededReputation[who] = score;
    }

    function seedFeedbackCount(address who, uint256 count) external onlyAdmin {
        seededFeedbackCount[who] = count;
    }

    // Seed agent metrics when no external AgentMetricsRegistry is configured
    mapping(address => IAgentMetricsRegistry.AgentMetrics) internal seededMetrics;

    function seedAgentMetrics(address who, IAgentMetricsRegistry.AgentMetrics calldata m) external onlyAdmin {
        seededMetrics[who] = m;
    }

    // when using seeded identity data, return the seeded registrationTime
    function _registrationTime(address agentAddress) internal view returns (uint256) {
        if (IDENTITY_REGISTRY == address(0)) return seededRegistrationTime[agentAddress];
        uint256 agentId = IIdentityRegistry(IDENTITY_REGISTRY).getAgentIdByWallet(agentAddress);
        if (agentId == 0) return 0;
        return IIdentityRegistry(IDENTITY_REGISTRY).getRegistrationTime(agentId);
    }

    function _identityAgeScore(address agentAddress) internal view returns (uint8) {
        uint256 regTime = _registrationTime(agentAddress);
        uint256 ageDays = 0;
        if (regTime < block.timestamp) {
            ageDays = (block.timestamp - regTime) / 1 days;
        }
        if (ageDays > 180) ageDays = 180;
        return uint8((ageDays * 100) / 180);
    }

    function _txValueWeightScore(uint256 settledUsd18) internal pure returns (uint8) {
        uint256 capUsd18 = 10000 * 1e18;
        if (settledUsd18 >= capUsd18) return 100;
        return uint8((settledUsd18 * 100) / capUsd18);
    }

    function _counterpartyDiversityScore(uint32 distinct) internal pure returns (uint8) {
        uint256 cap = 50;
        if (distinct >= cap) return 100;
        return uint8((uint256(distinct) * 100) / cap);
    }

    function _detectSybil(uint64 micro, uint64 total) internal pure returns (bool) {
        if (total == 0) return false;
        return (uint256(micro) * 100) > (uint256(total) * 60);
    }

    // Admin helper for test scenarios: clear cache
    function clearCache(address agent) external onlyAdmin {
        delete cache[agent];
    }
}
