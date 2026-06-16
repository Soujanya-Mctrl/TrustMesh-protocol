// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAgentMetricsRegistry {
    function recordSettlement(address payer, address payee, uint256 amountAvax, uint256 settledUsd18) external;
}

contract EscrowVault {
    uint256 public constant REFUND_DELAY = 24 hours;
    uint256 public constant MAX_OPEN_ESCROWS = 100;

    address public admin;
    address public AGENT_METRICS_REGISTRY;

    uint256 public nextEscrowId = 1;
    uint256 public openCount = 0;

    enum EscrowState { Pending, Released, Refunded }

    struct Escrow {
        address payer;
        address payee;
        uint256 amount;
        bytes32 expectedHash;
        uint64 createdAt;
        EscrowState state;
    }

    mapping(uint256 => Escrow) public escrows;

    event EscrowCreated(uint256 indexed escrowId, address indexed payer, address indexed payee, uint256 amount, bytes32 expectedHash);
    event DeliverableSubmitted(uint256 indexed escrowId, address indexed submitter, bytes32 deliverableHash, bool matched);
    event EscrowReleased(uint256 indexed escrowId, address indexed payee, uint256 amount);
    event EscrowRefunded(uint256 indexed escrowId, address indexed payer, uint256 amount);

    // minimal reentrancy guard
    uint256 private _status;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    modifier nonReentrant() {
        require(_status != _ENTERED, "reentrant");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "only admin");
        _;
    }

    constructor(address _agentMetrics) {
        admin = msg.sender;
        AGENT_METRICS_REGISTRY = _agentMetrics;
        _status = _NOT_ENTERED;
    }

    function setAgentMetricsRegistry(address a) external onlyAdmin {
        AGENT_METRICS_REGISTRY = a;
    }

    function createEscrow(address payee, bytes32 expectedHash) external payable returns (uint256) {
        require(payee != address(0), "invalid payee");
        require(msg.value > 0, "zero value");
        require(openCount < MAX_OPEN_ESCROWS, "max open escrows");

        uint256 id = nextEscrowId++;
        escrows[id] = Escrow({
            payer: msg.sender,
            payee: payee,
            amount: msg.value,
            expectedHash: expectedHash,
            createdAt: uint64(block.timestamp),
            state: EscrowState.Pending
        });
        openCount++;

        emit EscrowCreated(id, msg.sender, payee, msg.value, expectedHash);
        return id;
    }

    function submitDeliverable(uint256 escrowId, bytes32 deliverableHash) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        require(e.payee != address(0), "not found");
        require(e.state == EscrowState.Pending, "not pending");
        require(msg.sender == e.payee, "only payee");

        require(deliverableHash == e.expectedHash, "Hash mismatch");
        emit DeliverableSubmitted(escrowId, msg.sender, deliverableHash, true);

        e.state = EscrowState.Released;
        openCount--;
        uint256 amount = e.amount;
        e.amount = 0;
        _safeTransfer(e.payee, amount);
        emit EscrowReleased(escrowId, e.payee, amount);

        if (AGENT_METRICS_REGISTRY != address(0)) {
            // best-effort metrics recording; settledUsd18 not available here
            IAgentMetricsRegistry(AGENT_METRICS_REGISTRY).recordSettlement(e.payer, e.payee, amount, 0);
        }
    }

    function refundEscrow(uint256 escrowId) external nonReentrant {
        Escrow storage e = escrows[escrowId];
        require(e.payer != address(0), "not found");
        require(e.state == EscrowState.Pending, "not pending");
        require(msg.sender == e.payer, "only payer");
        require(block.timestamp >= uint256(e.createdAt) + REFUND_DELAY, "too early");

        e.state = EscrowState.Refunded;
        openCount--;
        uint256 amount = e.amount;
        e.amount = 0;
        _safeTransfer(e.payer, amount);
        emit EscrowRefunded(escrowId, e.payer, amount);
    }

    function _safeTransfer(address to, uint256 amount) internal {
        // using call to forward gas and avoid reversion bubbles
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "transfer failed");
    }

    receive() external payable {
        revert("send via createEscrow");
    }
}
