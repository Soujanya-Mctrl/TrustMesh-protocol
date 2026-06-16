export type TrustMeshTier = 0 | 1 | 2;

export interface CompositeScoreResult {
  score: number;
  unregistered: boolean;
  sybilFlagged: boolean;
  cachedAt: number;
}

export interface PaymentEvaluation {
  tier: TrustMeshTier;
  compositeScore: number;
  paymentRequestId: string;
  simulationId?: string;
  escrowAddress?: `0x${string}`;
}

export interface RiskReport {
  simulationId: string;
  outcome: "success" | "failure";
  anomalyFlags: string[];
  compositeScore: number;
  recommendedAction: "approve" | "reject" | "manual_review";
}

export interface PaymentResult {
  tier: TrustMeshTier;
  status: "settled" | "escrow_created" | "simulation_started" | "failed";
  txHash?: `0x${string}`;
  escrowId?: string;
  simulationId?: string;
  riskReport?: RiskReport;
  output?: string;
}

export interface ProviderProfile {
  name: string;
  trustScore: number;
  tier: TrustMeshTier;
  serviceUrl: string;
  correctDeliverable: boolean;
  walletAddress: `0x${string}`;
  serviceFee: string; // in wei
}

export interface TrustMeshClientConfig {
  rpcUrl: string;
  privateKey: `0x${string}`;
  policyEngineAddress: `0x${string}`;
  trustRegistryAddress: `0x${string}`;
  escrowVaultAddress?: `0x${string}`;
  agentMetricsAddress?: `0x${string}`;
}

export interface TrustMeshRequest {
  payeeAddress: string;
  amount: string;
  serviceUrl: string;
  prompt?: string;
}

export interface TrustMeshEventMap {
  tier_assigned: {
    payeeAddress: string;
    amount: string;
    tier: TrustMeshTier;
    compositeScore: number;
  };
  payment_settled: PaymentResult;
  escrow_created: PaymentResult;
  simulation_started: PaymentResult;
  escalation_required: PaymentResult;
}

export type TrustMeshErrorCode =
  | "INVALID_CONFIGURATION"
  | "RUNTIME_NOT_CONFIGURED"
  | "EVALUATION_FAILED"
  | "TIER_FLOW_FAILED"
  | "X402_RETRY_EXHAUSTED"
  | "X402_PAYMENT_REQUIRED"
  | "TIMEOUT";

// ===== x402 Protocol Types =====

export interface X402PaymentOffer {
  scheme: "exact";
  network: "avalanche-fuji" | "avalanche-mainnet";
  maxAmountRequired: string; // wei
  resource: string;          // the endpoint path
  payTo: `0x${string}`;     // recipient wallet
  description: string;
}

export interface X402Challenge {
  x402Version: number;
  accepts: X402PaymentOffer[];
}

export interface X402PaymentHeader {
  txHash: `0x${string}`;
  network: string;
  payer: `0x${string}`;
}

// ===== ERC-8004 Agent Card =====

export interface AgentCard {
  name: string;
  description: string;
  protocols: string[];
  capabilities: string[];
  wallet: `0x${string}`;
  serviceUrl: string;
}