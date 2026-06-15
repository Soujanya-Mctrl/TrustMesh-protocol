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
}
export interface ProviderProfile {
    name: string;
    trustScore: number;
    tier: TrustMeshTier;
    serviceUrl: string;
    correctDeliverable: boolean;
}
export interface TrustMeshClientConfig {
    rpcUrl: string;
    privateKey: `0x${string}`;
    policyEngineAddress: `0x${string}`;
    trustRegistryAddress: `0x${string}`;
}
export interface TrustMeshRequest {
    payeeAddress: string;
    amount: string;
    serviceUrl: string;
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
export type TrustMeshErrorCode = "INVALID_CONFIGURATION" | "RUNTIME_NOT_CONFIGURED" | "EVALUATION_FAILED" | "TIER_FLOW_FAILED" | "X402_RETRY_EXHAUSTED" | "TIMEOUT";
//# sourceMappingURL=types.d.ts.map