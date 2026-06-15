import {
  createPublicClient,
  createWalletClient,
  http,
  parseAbi,
  encodeFunctionData,
  type PublicClient,
  type WalletClient,
  type Transport,
  type Chain,
  type Account,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";

import {
  buildCanonicalHash,
  type PaymentEvaluation,
  type PaymentResult,
  type TrustMeshClientConfig,
  type TrustMeshRequest,
  type X402PaymentHeader,
} from "@trustmesh/shared";

import type { TrustMeshRuntime } from "./runtime.js";

// ===== Contract ABIs =====

const POLICY_ENGINE_ABI = parseAbi([
  "function evaluateTier(address payee, uint256 amountAvax) public view returns (uint8)",
  "function recordDirectSettlement(address payer, address payee, uint256 amountAvax, uint256 settledUsd18) external",
  "function decideAndEmit(address payer, address payee, uint256 amountAvax) external returns (uint8)",
  "function trustRegistry() external view returns (address)",
  "function validationRegistry() external view returns (address)",
]);

const TRUST_REGISTRY_ABI = parseAbi([
  "function getCompositeScore(address agentAddress) external view returns (uint8 score, bool unregistered, bool sybilFlagged, uint32 cachedAt)",
  "function getCachedScore(address agentAddress) external view returns (uint8 score, bool unregistered, bool sybilFlagged, uint32 cachedAt)",
  "function REPUTATION_REGISTRY() external view returns (address)",
  "function IDENTITY_REGISTRY() external view returns (address)",
]);

const REPUTATION_REGISTRY_ABI = parseAbi([
  "function submitFeedback(address agent, uint8 qualityScore, uint8 reliabilityScore, string calldata tags) external",
]);

const VALIDATION_REGISTRY_ABI = parseAbi([
  "function validationRequest(address validatorAddress, uint256 agentId, string calldata requestURI, bytes32 requestHash) external",
  "function getValidationStatus(bytes32 requestHash) external view returns (address validatorAddress, uint256 agentId, uint8 response, bytes32 responseHash, string memory tag, uint256 lastUpdate)",
]);

const ESCROW_VAULT_ABI = parseAbi([
  "function createEscrow(address payee, bytes32 expectedHash) external payable returns (uint256)",
  "function submitDeliverable(uint256 escrowId, bytes32 deliverableHash) external",
]);

// ===== Local Hardhat chain definition =====

const hardhatLocal: Chain = {
  id: 31337,
  name: "Hardhat",
  nativeCurrency: { decimals: 18, name: "Ether", symbol: "ETH" },
  rpcUrls: {
    default: { http: ["http://127.0.0.1:8545"] },
  },
};

// Hardhat default accounts private keys for simulating provider agents
const HARDHAT_PRIVATE_KEYS: Record<string, `0x${string}`> = {
  "0x70997970c51812dc3a010c7d01b50e0d17dc79c8": "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
  "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc": "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
  "0x90f79bf6eb2c4f870365e785982e1f101e93b906": "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
};

async function resolveAgentName(publicClient: PublicClient, trustRegistryAddress: `0x${string}`, address: string): Promise<string> {
  const addr = address.toLowerCase();
  if (addr === "0x70997970c51812dc3a010c7d01b50e0d17dc79c8") return "DataFeed Pro";
  if (addr === "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc") return "NewService";
  if (addr === "0x90f79bf6eb2c4f870365e785982e1f101e93b906") return "SuspiciousAgent";

  try {
    const AIR_ABI = parseAbi([
      "function agentCardOf(address who) external view returns (string)",
      "function tokenContract() external view returns (address)",
      "function tokenId() external view returns (uint256)",
    ]);
    const identityRegistryAddr = await publicClient.readContract({
      address: trustRegistryAddress,
      abi: TRUST_REGISTRY_ABI,
      functionName: "IDENTITY_REGISTRY",
    }) as `0x${string}`;

    let lookupAddress = address as `0x${string}`;
    try {
      const tc = await publicClient.readContract({
        address: lookupAddress,
        abi: AIR_ABI,
        functionName: "tokenContract",
      }) as `0x${string}`;
      if (tc.toLowerCase() === identityRegistryAddr.toLowerCase()) {
        const tid = await publicClient.readContract({
          address: lookupAddress,
          abi: AIR_ABI,
          functionName: "tokenId",
        }) as bigint;
        const ownerOfAbi = parseAbi(["function ownerOf(uint256 tokenId) external view returns (address)"]);
        lookupAddress = await publicClient.readContract({
          address: identityRegistryAddr,
          abi: ownerOfAbi,
          functionName: "ownerOf",
          args: [tid],
        }) as `0x${string}`;
      }
    } catch {}

    const cardUri = await publicClient.readContract({
      address: identityRegistryAddr,
      abi: AIR_ABI,
      functionName: "agentCardOf",
      args: [lookupAddress],
    }) as string;

    if (cardUri.startsWith("data:application/json;base64,")) {
      const base64 = cardUri.split("base64,")[1];
      const json = Buffer.from(base64, "base64").toString("utf8");
      const card = JSON.parse(json);
      return card.name;
    }
  } catch {}

  return "Agent";
}

export interface ViemRuntimeOptions extends TrustMeshClientConfig {
  chainId?: number;
}

export class ViemRuntime implements TrustMeshRuntime {
  public readonly publicClient: PublicClient<Transport, Chain>;
  public readonly walletClient: WalletClient<Transport, Chain, Account>;
  public readonly config: TrustMeshClientConfig;

  constructor(options: ViemRuntimeOptions) {
    this.config = options;

    const chain =
      options.chainId === 43113 ? avalancheFuji : hardhatLocal;

    const account = privateKeyToAccount(options.privateKey);

    this.publicClient = createPublicClient({
      chain,
      transport: http(options.rpcUrl),
    }) as PublicClient<Transport, Chain>;

    this.walletClient = createWalletClient({
      account,
      chain,
      transport: http(options.rpcUrl),
    });
  }

  async getTbaAddress(payeeAddress: string): Promise<`0x${string}`> {
    if (!this.config.erc6551RegistryAddress) {
      return payeeAddress as `0x${string}`;
    }

    const AIR_ABI = parseAbi([
      "function agentTokenId(address agent) external view returns (uint256)",
    ]);
    const REGISTRY_ABI = parseAbi([
      "function getAccount(address tokenContract, uint256 tokenId) external view returns (address)",
    ]);

    try {
      const identityRegistryAddr = await this.publicClient.readContract({
        address: this.config.trustRegistryAddress,
        abi: TRUST_REGISTRY_ABI,
        functionName: "IDENTITY_REGISTRY",
      }) as `0x${string}`;

      const tokenId = await this.publicClient.readContract({
        address: identityRegistryAddr,
        abi: AIR_ABI,
        functionName: "agentTokenId",
        args: [payeeAddress as `0x${string}`],
      });

      if (tokenId === 0n) {
        return payeeAddress as `0x${string}`;
      }

      const tba = await this.publicClient.readContract({
        address: this.config.erc6551RegistryAddress,
        abi: REGISTRY_ABI,
        functionName: "getAccount",
        args: [identityRegistryAddr, tokenId],
      });

      return tba as `0x${string}`;
    } catch (error) {
      console.warn("Failed to retrieve TBA address, falling back to hot wallet:", error);
      return payeeAddress as `0x${string}`;
    }
  }

  async evaluatePayment(
    request: TrustMeshRequest,
  ): Promise<PaymentEvaluation> {
    const hotWallet = request.payeeAddress as `0x${string}`;
    
    // Resolve TBA address first
    const tbaAddress = await this.getTbaAddress(hotWallet);

    // Get tier from PolicyEngine using the TBA address (on-chain scorer reads this)
    const tier = await this.publicClient.readContract({
      address: this.config.policyEngineAddress,
      abi: POLICY_ENGINE_ABI,
      functionName: "evaluateTier",
      args: [tbaAddress, BigInt(request.amount)],
    });

    // Get composite score from TrustRegistry
    const scoreResult = await this.publicClient.readContract({
      address: this.config.trustRegistryAddress,
      abi: TRUST_REGISTRY_ABI,
      functionName: "getCompositeScore",
      args: [tbaAddress],
    }) as any;

    const score = Number(scoreResult.score !== undefined ? scoreResult.score : scoreResult[0]);

    return {
      tier: Number(tier) as 0 | 1 | 2,
      compositeScore: score,
      paymentRequestId: `pay-${Date.now()}-${tbaAddress.slice(2, 8)}`,
      escrowAddress: this.config.escrowVaultAddress,
    };
  }

  async runTier0(
    request: TrustMeshRequest,
    evaluation: PaymentEvaluation,
  ): Promise<PaymentResult> {
    const hotWallet = request.payeeAddress as `0x${string}`;
    const tbaAddress = await this.getTbaAddress(hotWallet);
    const amount = BigInt(request.amount);

    // 1. Direct settlement — send AVAX directly to the agent's TBA wallet
    const txHash = await this.walletClient.sendTransaction({
      to: tbaAddress,
      value: amount,
    });

    // Wait for confirmation
    await this.publicClient.waitForTransactionReceipt({ hash: txHash });

    // 2. Make x402 service request with payment proof (Provider delivers service)
    const serviceRes = await this._requestServiceWithPayment(request.serviceUrl, txHash, request.prompt) as any;

    // 3. Record settlement on-chain via PolicyEngine
    if (this.config.policyEngineAddress) {
      try {
        const recordHash = await this.walletClient.writeContract({
          address: this.config.policyEngineAddress,
          abi: POLICY_ENGINE_ABI,
          functionName: "recordDirectSettlement",
          args: [
            this.walletClient.account.address,
            tbaAddress,
            amount,
            0n, // settledUsd18 — simplified for demo
          ],
        });
        await this.publicClient.waitForTransactionReceipt({ hash: recordHash });
      } catch (e) {
        console.error("Direct settlement metrics record failed", e);
      }
    }

    // 4. Submit feedback to ReputationRegistry
    try {
      const trustRegistry = await this.publicClient.readContract({
        address: this.config.policyEngineAddress,
        abi: POLICY_ENGINE_ABI,
        functionName: "trustRegistry",
      });
      const reputationRegistry = await this.publicClient.readContract({
        address: trustRegistry as `0x${string}`,
        abi: TRUST_REGISTRY_ABI,
        functionName: "REPUTATION_REGISTRY",
      });
      
      const feedbackHash = await this.walletClient.writeContract({
        address: reputationRegistry as `0x${string}`,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "submitFeedback",
        args: [tbaAddress, 95, 95, "fast,accurate"],
      });
      await this.publicClient.waitForTransactionReceipt({ hash: feedbackHash });

      // Bust cache on-chain
      const bustHash = await this.walletClient.writeContract({
        address: this.config.trustRegistryAddress,
        abi: TRUST_REGISTRY_ABI,
        functionName: "getCompositeScore",
        args: [tbaAddress],
      });
      await this.publicClient.waitForTransactionReceipt({ hash: bustHash });
    } catch (err) {
      console.error("Feedback/cache bust failed for Tier 0", err);
    }

    return {
      tier: 0,
      status: "settled",
      txHash,
      output: serviceRes?.output,
    };
  }

  async runTier1(
    request: TrustMeshRequest,
    evaluation: PaymentEvaluation,
  ): Promise<PaymentResult> {
    const hotWallet = request.payeeAddress as `0x${string}`;
    const tbaAddress = await this.getTbaAddress(hotWallet);
    const amount = BigInt(request.amount);

    if (!this.config.escrowVaultAddress) {
      throw new Error("EscrowVault address not configured");
    }

    // Step 1: POST to get quote and receive target deliverable hash
    let quoteRes: any;
    try {
      const res = await fetch(request.serviceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceRequest: { type: "quote", prompt: request.prompt ?? "default prompt" },
        }),
      });
      quoteRes = await res.json();
    } catch (err) {
      throw new Error(`Failed to request quote: ${err instanceof Error ? err.message : String(err)}`);
    }

    const deliverableHash = quoteRes.deliverableHash as `0x${string}`;
    if (!deliverableHash) {
      throw new Error("Service provider did not return a deliverable hash for quote");
    }

    // Step 2: Create escrow with the deliverable hash and lock AVAX under TBA payee
    const escrowTxHash = await this.walletClient.writeContract({
      address: this.config.escrowVaultAddress,
      abi: ESCROW_VAULT_ABI,
      functionName: "createEscrow",
      args: [tbaAddress, deliverableHash],
      value: amount,
    });

    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: escrowTxHash,
    });

    // Extract escrow ID from the logs (event EscrowCreated(uint256 indexed escrowId, ...))
    const escrowIdHex = receipt.logs[0]?.topics[1] ?? "0x1";
    const escrowId = BigInt(escrowIdHex);

    // Step 3: Request service execution with escrow payment proof
    const serviceRes = (await this._requestServiceWithPayment(
      request.serviceUrl,
      escrowTxHash,
      request.prompt,
    )) as any;
    const responseHash = serviceRes?.deliverableHash ?? deliverableHash;

    // Step 4: Simulate TBA owner (hot wallet) submitting deliverable via TBA execute()
    const payeePrivateKey = HARDHAT_PRIVATE_KEYS[hotWallet.toLowerCase()];
    if (payeePrivateKey) {
      const payeeAccount = privateKeyToAccount(payeePrivateKey);
      const payeeWalletClient = createWalletClient({
        account: payeeAccount,
        chain: this.walletClient.chain,
        transport: http(this.config.rpcUrl),
      });

      // Encode the target submitDeliverable(escrowId, responseHash) call
      const submitData = encodeFunctionData({
        abi: ESCROW_VAULT_ABI,
        functionName: "submitDeliverable",
        args: [escrowId, responseHash],
      });

      // Write to ERC6551Account.execute
      const ACCOUNT_ABI = parseAbi([
        "function execute(address to, uint256 value, bytes calldata data) external payable returns (bytes)",
      ]);

      const submitHash = await payeeWalletClient.writeContract({
        address: tbaAddress,
        abi: ACCOUNT_ABI,
        functionName: "execute",
        args: [this.config.escrowVaultAddress, 0n, submitData],
      });
      await this.publicClient.waitForTransactionReceipt({ hash: submitHash });
    }

    // Step 5: Submit positive reputation feedback
    try {
      const trustRegistry = await this.publicClient.readContract({
        address: this.config.policyEngineAddress,
        abi: POLICY_ENGINE_ABI,
        functionName: "trustRegistry",
      });
      const reputationRegistry = await this.publicClient.readContract({
        address: trustRegistry as `0x${string}`,
        abi: TRUST_REGISTRY_ABI,
        functionName: "REPUTATION_REGISTRY",
      });
      
      const feedbackHash = await this.walletClient.writeContract({
        address: reputationRegistry as `0x${string}`,
        abi: REPUTATION_REGISTRY_ABI,
        functionName: "submitFeedback",
        args: [tbaAddress, 78, 78, "correct-output"],
      });
      await this.publicClient.waitForTransactionReceipt({ hash: feedbackHash });

      // Bust cache on-chain
      const bustHash = await this.walletClient.writeContract({
        address: this.config.trustRegistryAddress,
        abi: TRUST_REGISTRY_ABI,
        functionName: "getCompositeScore",
        args: [tbaAddress],
      });
      await this.publicClient.waitForTransactionReceipt({ hash: bustHash });
    } catch (err) {
      console.error("Feedback/cache bust failed for Tier 1", err);
    }

    return {
      tier: 1,
      status: "settled",
      txHash: escrowTxHash,
      escrowId: escrowId.toString(),
      output: serviceRes?.output,
    };
  }

  async runTier2(
    request: TrustMeshRequest,
    evaluation: PaymentEvaluation,
  ): Promise<PaymentResult> {
    const hotWallet = request.payeeAddress as `0x${string}`;
    const tbaAddress = await this.getTbaAddress(hotWallet);

    // Get validationRegistry address dynamically from PolicyEngine
    const validationRegistryAddress = await this.publicClient.readContract({
      address: this.config.policyEngineAddress,
      abi: POLICY_ENGINE_ABI,
      functionName: "validationRegistry",
    }) as `0x${string}`;

    // Get trustRegistry address dynamically from PolicyEngine
    const trustRegistryAddress = await this.publicClient.readContract({
      address: this.config.policyEngineAddress,
      abi: POLICY_ENGINE_ABI,
      functionName: "trustRegistry",
    }) as `0x${string}`;

    // Get identityRegistry address dynamically from TrustRegistry
    const identityRegistryAddress = await this.publicClient.readContract({
      address: trustRegistryAddress,
      abi: TRUST_REGISTRY_ABI,
      functionName: "IDENTITY_REGISTRY",
    }) as `0x${string}`;

    // Get agentId from IdentityRegistry
    const agentId = await this.publicClient.readContract({
      address: identityRegistryAddress,
      abi: parseAbi(["function getAgentIdByWallet(address who) external view returns (uint256)"]),
      functionName: "getAgentIdByWallet",
      args: [tbaAddress],
    }) as bigint;

    // Generate task hash based on the transaction spec
    const taskHash = buildCanonicalHash({
      payee: tbaAddress,
      amount: request.amount,
      serviceUrl: request.serviceUrl,
      timestamp: Date.now(),
    });

    // Step 1: Request validation on-chain using standard validationRequest
    const validationTxHash = await this.walletClient.writeContract({
      address: validationRegistryAddress,
      abi: VALIDATION_REGISTRY_ABI,
      functionName: "validationRequest",
      args: [
        this.config.policyEngineAddress, // validatorAddress
        agentId,
        "",                              // requestURI
        taskHash,                        // requestHash
      ],
    });

    await this.publicClient.waitForTransactionReceipt({
      hash: validationTxHash,
    });

    const simulationId = taskHash;

    // Step 2: Make x402 challenge request (expect 402 back)
    let challenge: any;
    try {
      const challengeResponse = await fetch(request.serviceUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serviceRequest: { type: "simulation", prompt: request.prompt } }),
      });
      challenge = await challengeResponse.json();
    } catch {
      challenge = { error: "Payment required" };
    }

    return {
      tier: 2,
      status: "simulation_started",
      txHash: validationTxHash,
      simulationId,
      riskReport: {
        simulationId,
        outcome: "failure",
        anomalyFlags: ["low_trust_score", "suspicious_pattern"],
        compositeScore: evaluation.compositeScore,
        recommendedAction: "manual_review",
      },
    };
  }

  /**
   * Make an x402 service request with payment proof.
   */
  private async _requestServiceWithPayment(
    serviceUrl: string,
    txHash: `0x${string}`,
    prompt?: string,
  ): Promise<unknown> {
    const paymentHeader: X402PaymentHeader = {
      txHash,
      network: "avalanche-fuji",
      payer: this.walletClient.account.address,
    };

    const response = await fetch(serviceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-PAYMENT": JSON.stringify(paymentHeader),
      },
      body: JSON.stringify({
        serviceRequest: { type: "execute", prompt },
      }),
    });

    if (response.status === 402) {
      throw new Error("Payment not accepted by service provider");
    }

    return response.json();
  }
}

