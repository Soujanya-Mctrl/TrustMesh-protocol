// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract AgentMetricsRegistry {
    address public admin;
    address public PRICE_ORACLE;
    uint256 public MAX_ORACLE_AGE;

    struct AgentMetrics {
        uint256 settledVolumeUsd18;
        uint64 totalSettledTransactions;
        uint64 microTransactionCount;
        uint32 distinctCounterpartyCount;
    }

    mapping(address => AgentMetrics) internal metrics;
    mapping(address => bool) public authorizedSettler;
    mapping(address => mapping(address => bool)) internal seenCounterparty;

    event SettlementRecorded(
        address indexed payer,
        address indexed payee,
        uint256 amountAvax,
        uint256 settledUsd18
    );

    event MetricsSeeded(address indexed agent);
    event SettlerAuthorizationChanged(address indexed who, bool authorized);

    modifier onlyAdmin() {
        require(msg.sender == admin, "AMR: only admin");
        _;
    }

    modifier onlySettler() {
        require(authorizedSettler[msg.sender], "AMR: not authorized settler");
        _;
    }

    constructor(address priceOracle_, uint256 maxOracleAge_) {
        admin = msg.sender;
        PRICE_ORACLE = priceOracle_;
        MAX_ORACLE_AGE = maxOracleAge_;
    }

    function authorizeSettler(address who, bool ok) external onlyAdmin {
        authorizedSettler[who] = ok;
        emit SettlerAuthorizationChanged(who, ok);
    }

    /// @notice Record a settlement. For demo purposes the caller supplies a USD18-normalized value.
    function recordSettlement(
        address payer,
        address payee,
        uint256 amountAvax,
        uint256 settledUsd18
    ) external onlySettler {
        AgentMetrics storage m = metrics[payee];
        m.settledVolumeUsd18 += settledUsd18;
        m.totalSettledTransactions += 1;

        if (amountAvax < 1e15) {
            // < 0.001 AVAX counted as micro-transaction
            m.microTransactionCount += 1;
        }

        if (!seenCounterparty[payee][payer]) {
            seenCounterparty[payee][payer] = true;
            m.distinctCounterpartyCount += 1;
        }

        emit SettlementRecorded(payer, payee, amountAvax, settledUsd18);
    }

    function seedMetrics(address agent, AgentMetrics calldata seeded) external onlyAdmin {
        metrics[agent] = seeded;
        emit MetricsSeeded(agent);
    }

    function getMetrics(address agent) external view returns (AgentMetrics memory) {
        return metrics[agent];
    }
}
