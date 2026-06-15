import type {
  PaymentEvaluation,
  PaymentResult,
  TrustMeshRequest,
} from "@trustmesh/shared";

export interface TrustMeshRuntime {
  evaluatePayment(request: TrustMeshRequest): Promise<PaymentEvaluation>;
  runTier0(
    request: TrustMeshRequest,
    evaluation: PaymentEvaluation,
  ): Promise<PaymentResult>;
  runTier1(
    request: TrustMeshRequest,
    evaluation: PaymentEvaluation,
  ): Promise<PaymentResult>;
  runTier2(
    request: TrustMeshRequest,
    evaluation: PaymentEvaluation,
  ): Promise<PaymentResult>;
}

export class MissingRuntime implements TrustMeshRuntime {
  async evaluatePayment(): Promise<PaymentEvaluation> {
    throw new Error("TrustMeshRuntime is not configured.");
  }

  async runTier0(): Promise<PaymentResult> {
    throw new Error("TrustMeshRuntime is not configured.");
  }

  async runTier1(): Promise<PaymentResult> {
    throw new Error("TrustMeshRuntime is not configured.");
  }

  async runTier2(): Promise<PaymentResult> {
    throw new Error("TrustMeshRuntime is not configured.");
  }
}