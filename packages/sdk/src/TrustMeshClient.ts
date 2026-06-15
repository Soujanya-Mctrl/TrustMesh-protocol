import { EventEmitter } from "node:events";

import type {
  PaymentEvaluation,
  PaymentResult,
  TrustMeshClientConfig,
  TrustMeshEventMap,
  TrustMeshRequest,
} from "@trustmesh/shared";
import { TrustMeshError } from "./errors.js";
import { MissingRuntime, type TrustMeshRuntime } from "./runtime.js";

export interface TrustMeshClientOptions extends TrustMeshClientConfig {
  runtime?: TrustMeshRuntime;
}

export class TrustMeshClient extends EventEmitter {
  readonly config: TrustMeshClientConfig;
  private readonly runtime: TrustMeshRuntime;

  constructor(options: TrustMeshClientOptions) {
    super();
    this.config = {
      rpcUrl: options.rpcUrl,
      privateKey: options.privateKey,
      policyEngineAddress: options.policyEngineAddress,
      trustRegistryAddress: options.trustRegistryAddress,
      escrowVaultAddress: options.escrowVaultAddress,
      agentMetricsAddress: options.agentMetricsAddress,
      erc6551RegistryAddress: options.erc6551RegistryAddress,
    };
    this.runtime = options.runtime ?? new MissingRuntime();
  }

  override on<E extends keyof TrustMeshEventMap>(
    eventName: E,
    listener: (payload: TrustMeshEventMap[E]) => void,
  ): this {
    return super.on(eventName, listener);
  }

  override emit<E extends keyof TrustMeshEventMap>(
    eventName: E,
    payload: TrustMeshEventMap[E],
  ): boolean {
    return super.emit(eventName, payload);
  }

  async pay(
    payeeAddress: string,
    amount: string,
    serviceUrl: string,
    prompt?: string,
  ): Promise<PaymentResult> {
    const request: TrustMeshRequest = {
      payeeAddress,
      amount,
      serviceUrl,
      prompt,
    };

    let evaluation: PaymentEvaluation;

    try {
      evaluation = await this.runtime.evaluatePayment(request);
    } catch (error) {
      throw new TrustMeshError(
        "EVALUATION_FAILED",
        "Unable to evaluate payment.",
        { cause: error instanceof Error ? error.message : String(error) },
      );
    }

    this.emit("tier_assigned", {
      payeeAddress,
      amount,
      tier: evaluation.tier,
      compositeScore: evaluation.compositeScore,
    });

    try {
      if (evaluation.tier === 0) {
        const result = await this.runtime.runTier0(request, evaluation);
        this.emit("payment_settled", result);
        return result;
      }

      if (evaluation.tier === 1) {
        const result = await this.runtime.runTier1(request, evaluation);
        this.emit("escrow_created", result);
        return result;
      }

      const result = await this.runtime.runTier2(request, evaluation);
      this.emit("simulation_started", result);
      if (result.status !== "settled") {
        this.emit("escalation_required", result);
      }

      return result;
    } catch (error) {
      throw new TrustMeshError(
        "TIER_FLOW_FAILED",
        "The selected payment tier failed.",
        { cause: error instanceof Error ? error.message : String(error) },
      );
    }
  }
}