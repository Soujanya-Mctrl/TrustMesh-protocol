# 🏗️ TrustMesh Architecture & Flow Overview

This document describes the updated architecture of the **TrustMesh Protocol** following the removal of the ERC-6551 Token Bound Account (TBA) layers. The protocol now uses **Direct EOA Wallet Mappings**, simplifying on-chain interactions and improving gas efficiency.

---

## 🗺️ High-Level System Architecture

The following diagram illustrates how the **Orchestrator**, **SDK**, **Smart Contracts**, and **Provider Agents** interact using the **x402 Payment Handshake** and **ERC-8004 registries**:

```mermaid
flowchart TD
    %% Components
    subgraph ClientLayer["Client & Orchestration Layer"]
        Orchestrator["Lead Agent / Orchestrator"]
        SDK["TrustMesh SDK Client"]
    end

    subgraph SmartContracts["On-Chain Smart Contracts (Avalanche L1)"]
        IdentityRegistry["IdentityRegistry<br>(Agent NFT & EOA Wallet Map)"]
        PolicyEngine["PolicyEngine<br>(Tier Evaluation & Routing)"]
        TrustRegistry["TrustRegistry<br>(Composite Score Engine)"]
        MetricsRegistry["AgentMetricsRegistry<br>(On-Chain Tx Volume & Diversity)"]
        RepRegistry["ReputationRegistry<br>(Peer feedback & ratings)"]
        
        EscrowVault["EscrowVault<br>(Locked committed-hash payments)"]
        ValidationRegistry["ValidationRegistry<br>(Simulations & human-in-the-loop)"]
    end

    subgraph ServiceProviders["Provider Agent HTTP Nodes (x402)"]
        Agent0["DataFeed Pro<br>(Port 3001 - Tier 0 EOA)"]
        Agent1["NewService<br>(Port 3002 - Tier 1 EOA)"]
        Agent2["SuspiciousAgent<br>(Port 3003 - Tier 2 EOA)"]
    end

    %% Step-by-Step Flow
    Orchestrator -->|"1. Request Task"| SDK
    SDK -->|"2. Check Tier / Risk"| PolicyEngine
    PolicyEngine -->|"3. Read Score"| TrustRegistry
    
    %% Scorer inputs
    IdentityRegistry -->|"Identity Age"| TrustRegistry
    MetricsRegistry -->|"Tx Volume & Diversity"| TrustRegistry
    RepRegistry -->|"P2P Rating & Reviews"| TrustRegistry

    %% Tier Routing Decisions
    PolicyEngine -.->|"Tier 0 (Score >= 70)"| SDK
    PolicyEngine -.->|"Tier 1 (Score 30-69)"| SDK
    PolicyEngine -.->|"Tier 2 (Score < 30)"| SDK

    %% Execution Flows
    SDK -->|"Route Tier 0: Direct Pay to EOA & call x402"| Agent0
    SDK -->|"Route Tier 1: Create Escrow on-chain & call x402"| Agent1
    SDK -->|"Route Tier 2: Create Validation request & call x402"| Agent2

    %% Settling
    Agent1 -->|"4. Resolve Escrow by providing output preimage"| EscrowVault
    Agent2 -.->|"4. Escalate validation to Admin"| ValidationRegistry
```

---

## 🔄 Tiered Payment & Verification Flows (Direct EOA)

Since the Token Bound Account proxies have been removed, the payer SDK interacts directly with the payee's EOA wallet and the provider's HTTP server.

### 🟢 Tier 0: Direct Payment (High Trust, Score $\ge$ 70)
Used when the payee has an established, high-trust on-chain score. 

```mermaid
sequenceDiagram
    participant Payer as Orchestrator / SDK
    participant Chain as Avalanche L1 Ledger
    participant Provider as Provider Node (Port 3001)

    Payer->>Chain: sendTransaction(to: Provider_EOA, value: Fee)
    Chain-->>Payer: Confirm Transaction (txHash)
    
    Payer->>Provider: POST /request-service (X-PAYMENT: txHash, body: prompt)
    Note over Provider: Verifies txHash on-chain (value >= Fee, to == Provider_EOA)
    Provider-->>Payer: Return 200 OK (output, deliverableHash)
    
    Payer->>Chain: recordDirectSettlement(Payer, Provider_EOA, Fee)
    Payer->>Chain: submitFeedback(Provider_EOA, rating: 5)
```

---

### 🟡 Tier 1: Commit-Lock-Reveal Escrow (Medium Trust, Score 30–69)
Used to secure funds for medium-trust providers. Funds are locked in escrow and only released when the provider reveals the matching content preimage.

```mermaid
sequenceDiagram
    participant Payer as Orchestrator / SDK
    participant Chain as EscrowVault.sol
    participant Provider as Provider Node (Port 3002)

    Payer->>Provider: POST /request-service (type: quote, body: prompt)
    Provider-->>Payer: Return 200 OK (deliverableHash)
    
    Payer->>Chain: createEscrow(payee: Provider_EOA, deliverableHash) with locked funds
    Chain-->>Payer: Confirm Escrow Created (escrowId, txHash)
    
    Payer->>Provider: POST /request-service (type: execute, X-PAYMENT: txHash, body: prompt)
    Note over Provider: Verifies escrow created on-chain with matching deliverableHash
    Provider-->>Payer: Return 200 OK (output, deliverableHash)
    
    Provider->>Chain: submitDeliverable(escrowId, deliverableHash)
    Note over Chain: Verifies msg.sender == Provider_EOA && hashes match
    Chain-->>Provider: Release locked funds to Provider_EOA EOA
```

---

### 🔴 Tier 2: Validation & Escalation (Low Trust, Score < 30)
Used for unverified or low-trust providers. The task is requested under validation, and simulated first to ensure safety.

```mermaid
sequenceDiagram
    participant Payer as Orchestrator / SDK
    participant Chain as ValidationRegistry.sol
    participant Provider as Provider Node (Port 3003)

    Payer->>Chain: validationRequest(PolicyEngine, Agent_ID, taskHash)
    Chain-->>Payer: Confirm Request Registered
    
    Payer->>Provider: POST /request-service (type: simulation, body: prompt)
    Provider-->>Payer: Return HTTP 402 Payment Required (Payment Challenge)
    
    Note over Payer: Task is simulated in sandboxed dry-run
    Note over Payer: Admin reviews outcome and updates ValidationRegistry (Approve/Reject)
    
    alt Admin Approves Direct Pay
        Payer->>Provider: Direct EOA payment flow (Tier 0)
    else Admin Approves Escrow Lock
        Payer->>Provider: Escrow EOA payment flow (Tier 1)
    else Admin Rejects
        Note over Payer: Task cancelled, transaction abandoned
    end
```
