import { GoogleGenerativeAI } from "@google/generative-ai";
import { providerProfiles } from "@trustmesh/agents";
import type { TrustMeshClient, ViemRuntime } from "@trustmesh/sdk";
import { parseAbi, keccak256, toBytes } from "viem";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type OrchestratorScenario = "all" | "meetup" | "finance" | "research";

export interface OrchestratorDependencies {
  client: TrustMeshClient;
  runtime: ViemRuntime;
  logger?: Pick<Console, "log" | "error">;
}

export interface WorkflowStep {
  requiredCapability: string;
  prompt: string;
  trustThreshold: number;
}

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Read deployed addresses
let deployed: any;
try {
  const path = resolve(process.cwd(), "deployed-addresses.json");
  deployed = JSON.parse(readFileSync(path, "utf8"));
} catch {
  try {
    const path = resolve(process.cwd(), "../../deployed-addresses.json");
    deployed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    // fallback if file not created yet
  }
}

// Minimal TaskAgent ABI for Orchestrator task execution
const TaskAgentABI = parseAbi([
  "function requestTask(uint8 taskType, string inputURI, bytes32 inputHash) external payable returns (uint256)",
  "function getTask(uint256 taskId) view returns ((uint256 taskId, uint256 agentId, address requester, uint8 taskType, uint8 status, string inputURI, bytes32 inputHash, string outputURI, bytes32 outputHash, uint256 payment, uint256 createdAt, uint256 completedAt))",
  "function taskPrices(uint8 taskType) view returns (uint256)",
  "function getReputationSummary() external view returns (uint64 feedbackCount, int128 averageRating)",
  "event TaskRequested(uint256 indexed taskId, address indexed requester, uint8 taskType, uint256 payment)",
  "event TaskCompleted(uint256 indexed taskId, string outputURI, bytes32 outputHash)",
]);



function getFallbackPlan(goal: string): WorkflowStep[] {
  const normalized = goal.toLowerCase();
  if (normalized.includes("telemetry") || normalized.includes("weather") || normalized.includes("data-feed") || normalized.includes("subnet")) {
    return [
      {
        requiredCapability: "get_subnet_stats",
        prompt: "Request standard weather telemetry updates",
        trustThreshold: 40,
      }
    ];
  }
  if (normalized.includes("translate") || normalized.includes("translation")) {
    return [
      {
        requiredCapability: "translate_text",
        prompt: "Translate the input payload",
        trustThreshold: 40,
      }
    ];
  }
  if (normalized.includes("sandbox") || normalized.includes("verification") || normalized.includes("sybil")) {
    return [
      {
        requiredCapability: "flag_anomalies",
        prompt: "Execute sandbox verification check",
        trustThreshold: 20,
      }
    ];
  }
  if (normalized.includes("yield") || normalized.includes("finance") || normalized.includes("stake")) {
    // Scenario 1: DeFi Yield Hunt
    return [
      {
        requiredCapability: "compare_pools",
        prompt: "Compare yield rates and APYs for Benqi Liquid Staking (sAVAX) and Trader Joe AVAX/USDC pools.",
        trustThreshold: 40,
      },
      {
        requiredCapability: "read_contract_state",
        prompt: "Verify the contract state and check on-chain metrics for Benqi contract: {{output_0}}",
        trustThreshold: 40,
      },
      {
        requiredCapability: "write_newsletter",
        prompt: "Format a Yield Hunt newsletter summary detailing the rebalancing allocation: {{output_1}}",
        trustThreshold: 40,
      },
    ];
  }
  if (normalized.includes("governance") || normalized.includes("dao") || normalized.includes("proposal") || normalized.includes("voter")) {
    // Scenario 2: DAO Governance Sprint
    return [
      {
        requiredCapability: "summarize_text",
        prompt: "Summarize active proposals and comments regarding Parameter yield reduction.",
        trustThreshold: 40,
      },
      {
        requiredCapability: "scan_wallet_hist",
        prompt: "Scan voter wallet history to verify Sybil accounts: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8, 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        trustThreshold: 70, // High trust threshold for Sybil checking
      },
      {
        requiredCapability: "draft_announcement",
        prompt: "Draft a final announcement summarizing the proposals and voter risk assessment: {{output_0}} and {{output_1}}",
        trustThreshold: 40,
      },
    ];
  }
  // Scenario 3: Cross-Chain Deployment Audit
  return [
    {
      requiredCapability: "audit_contract",
      prompt: "Audit the new YieldOptimizer contract code for potential vulnerability patterns and safety flaws.",
      trustThreshold: 70, // Smart contract audits require high trust
    },
    {
      requiredCapability: "counterparty_risk",
      prompt: "Assess counterparty risk and security score for the deployment wallet: 0x15d34aaf54267db7d7c367839aaf71a00a2c6a65",
      trustThreshold: 70, // Security risk evaluation requires high trust
    },
    {
      requiredCapability: "generate_report",
      prompt: "Generate a markdown security report compiling the audit findings and counterparty risks: {{output_0}} and {{output_1}}",
      trustThreshold: 40,
    },
  ];
}

async function planWorkflow(
  goal: string,
  agents: any[],
  logger: any
): Promise<WorkflowStep[]> {
  if (!genAI) {
    logger.log("GEMINI_API_KEY not set. Using fallback static plan for goal: " + goal);
    return getFallbackPlan(goal);
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const agentDescriptions = agents.map(a => 
      `- Key: ${a.key}
       Name: ${a.profile.name}
       Capabilities: ${a.capabilities.join(", ")}
       Service Fee: ${Number(a.profile.serviceFee) / 1e18} AVAX`
    ).join("\n\n");

    const prompt = `You are the Lead Orchestrator Agent for TrustMesh.
You have a high-level user goal. Decompose this goal into a sequential pipeline of abstract steps.
For each step, specify:
1. "requiredCapability": The specific capability needed for this step. Choose from the available agent capability lists.
2. "prompt": The specific instruction/prompt to send to the chosen agent. If you need to refer to the output of a previous step, use the placeholder format "{{output_0}}" for the first step, "{{output_1}}" for the second step, etc.
3. "trustThreshold": The minimum trust score (0 to 100) required for this task. For instance, security scans/audits or Sybil-checking tasks require high trust (70), whereas standard translation/summarization tasks can use 40.

Available Specialist Agents & Capabilities:
${agentDescriptions}

User Goal: "${goal}"

Return ONLY a JSON array of objects with the keys "requiredCapability", "prompt", and "trustThreshold". Do not wrap it in markdown formatting other than pure JSON.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    let jsonText = text;
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.substring(7);
    }
    if (jsonText.endsWith("```")) {
      jsonText = jsonText.substring(0, jsonText.length - 3);
    }
    jsonText = jsonText.trim();

    const steps = JSON.parse(jsonText) as WorkflowStep[];
    return steps;
  } catch (error) {
    logger.error("Gemini planning failed, falling back:", error);
    return getFallbackPlan(goal);
  }
}

export async function runOrchestrator(
  dependencies: OrchestratorDependencies,
  goal?: string,
  scenario: OrchestratorScenario = "all",
): Promise<void> {
  const logger = dependencies.logger ?? console;

  // Resolve final high-level goal based on 3 scenarios
  let finalGoal = goal;
  if (!finalGoal) {
    if (scenario === "finance") {
      finalGoal = "Find the best DeFi yield pool, read subnet contract state to verify safety, publish newsletter report";
    } else if (scenario === "meetup" || scenario === "research") {
      finalGoal = "Summarize proposals, assess voter sentiment, flag Sybil voters, and draft announcement";
    } else {
      finalGoal = "Audit new contract, check on-chain metrics, assess counterparty risk, generate security report";
    }
  }

  logger.log(`\n==================================================`);
  logger.log(`Starting ERC-8004 On-Chain Orchestrator Planner`);
  logger.log(`Goal: "${finalGoal}"`);
  logger.log(`==================================================`);

  if (!deployed || !deployed.contracts.TaskAgent_DataFeedPro) {
    logger.error("Error: TaskAgent contracts not deployed. Run deploy-8004 script first.");
    return;
  }

  // Fetch agent parameters, EIP-8004 reputation, and live TrustRegistry score dynamically on-chain
  const agentsInfo = [];
  const keys = Object.keys(providerProfiles);

  const TrustRegistryABI = parseAbi([
    "function getCachedScore(address agentAddress) external view returns (uint8 score, bool unregistered, bool sybilFlagged, uint32 cachedAt)",
    "function getCompositeScore(address agentAddress) external returns (uint8 score, bool unregistered, bool sybilFlagged, uint32 cachedAt)"
  ]);

  for (const key of keys) {
    const profile = providerProfiles[key];
    const contractAddress = deployed.contracts[profile.contractName];

    let feedbackCount = 0n;
    let averageRating = 0n;
    let trustScore = profile.trustScore;
    let sybilFlagged = key === "suspiciousAgent";

    try {
      const repSummary = await dependencies.runtime.publicClient.readContract({
        address: contractAddress,
        abi: TaskAgentABI,
        functionName: "getReputationSummary",
      }) as [bigint, bigint];
      feedbackCount = repSummary[0];
      averageRating = repSummary[1];
    } catch (err) {
      // registry might not be seeded yet
    }

    try {
      // Fetch live score from TrustRegistry
      const cached = await dependencies.runtime.publicClient.readContract({
        address: deployed.contracts.TrustRegistry,
        abi: TrustRegistryABI,
        functionName: "getCachedScore",
        args: [profile.walletAddress],
      }) as any;
      trustScore = Number(cached[0] ?? cached.score);
      sybilFlagged = cached[2] ?? cached.sybilFlagged;
    } catch (err) {
      // fallback to profile if no cached score
    }

    agentsInfo.push({
      key,
      profile,
      contractAddress,
      feedbackCount: feedbackCount.toString(),
      averageRating: averageRating.toString(),
      trustScore,
      sybilFlagged,
      capabilities: profile.capabilities || []
    });
  }

  logger.log("\n[Lead Agent] Planning steps using Gemini based on available specialist profiles...");
  const steps = await planWorkflow(finalGoal, agentsInfo, logger);

  logger.log(`\n[Lead Agent] Planned workflow:`);
  steps.forEach((step, idx) => {
    logger.log(`  Step ${idx + 1}: Required capability [${step.requiredCapability}] (min trust: ${step.trustThreshold}) -> "${step.prompt}"`);
  });

  const stepOutputs: string[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    logger.log(`\n--------------------------------------------------`);
    logger.log(`Executing Step ${i + 1}/${steps.length}: resolving capability "${step.requiredCapability}"`);
    logger.log(`--------------------------------------------------`);

    // Dynamic routing: find all candidate agents that possess the matching capability
    const candidates = agentsInfo.filter(a => a.capabilities.includes(step.requiredCapability));
    if (candidates.length === 0) {
      throw new Error(`No agent found with capability: ${step.requiredCapability}`);
    }

    // Filter by trust score threshold and exclude Sybil flagged agents
    const qualified = candidates.filter(a => a.trustScore >= step.trustThreshold && !a.sybilFlagged);
    const finalCandidates = qualified.length > 0 ? qualified : candidates;

    // Sort by fee ascending to choose the cheapest agent (minimum AVAX spent)
    finalCandidates.sort((a, b) => Number(a.profile.serviceFee) - Number(b.profile.serviceFee));
    const chosen = finalCandidates[0];

    // Query PolicyEngine on-chain to decide the tier dynamically based on smart contract logic
    const tier = await dependencies.runtime.publicClient.readContract({
      address: deployed.contracts.PolicyEngine,
      abi: parseAbi([
        "function evaluateTier(address payee, uint256 amountAvax) external view returns (uint8)"
      ]),
      functionName: "evaluateTier",
      args: [chosen.profile.walletAddress, BigInt(chosen.profile.serviceFee)],
    }) as number;

    logger.log(`[Lead Agent] Dynamic routing resolved:`);
    logger.log(`  Candidates: ${candidates.map(c => `${c.key} (score: ${c.trustScore}, fee: ${Number(c.profile.serviceFee)/1e18} AVAX)`).join(", ")}`);
    logger.log(`  Chosen Agent: ${chosen.key} (Tier ${tier} resolved dynamically by PolicyEngine smart contract logic)`);

    // Resolve prompt placeholders (e.g. {{output_0}}, {{output_1}})
    let resolvedPrompt = step.prompt;
    for (let j = 0; j < stepOutputs.length; j++) {
      resolvedPrompt = resolvedPrompt.replace(new RegExp(`\\{\\{output_${j}\\}\\}`, "g"), stepOutputs[j]);
    }

    logger.log(`[Lead Agent] Prompt: "${resolvedPrompt}"`);
    const output = await executeOnChainStep(dependencies, chosen.key, chosen, resolvedPrompt, logger);
    stepOutputs.push(output);

    logger.log(`[Lead Agent] Output: ${output.slice(0, 150)}${output.length > 150 ? '...' : ''}`);
  }

  logger.log(`\n==================================================`);
  logger.log(`Workflow Execution Complete!`);
  logger.log(`==================================================`);
}

async function executeOnChainStep(
  dependencies: OrchestratorDependencies,
  agentKey: string,
  chosen: any,
  prompt: string,
  logger: any
): Promise<string> {
  const profile = chosen.profile;
  const amount = profile.serviceFee || "1000000000000000"; // 0.001 ether default
  const serviceUrl = `http://localhost:${profile.port}/request-service`;

  logger.log(`[Orchestrator] Routing payment via SDK client for ${agentKey}...`);

  const result = await dependencies.client.pay(
    profile.walletAddress,
    amount.toString(),
    serviceUrl,
    prompt
  );

  if (result.tier === 2 && result.status === "simulation_started") {
    logger.log(`\n⚠️  [Orchestrator] Tier 2 Safety Flag Triggered for ${agentKey}!`);
    logger.log(`   Simulation ID: ${result.simulationId}`);
    logger.log(`   Anomaly Flags: ${result.riskReport?.anomalyFlags.join(", ")}`);
    logger.log(`   Recommended Action: ${result.riskReport?.recommendedAction}`);
    
    logger.log(`\n[Orchestrator] 👥 Human-in-the-Loop Escalation Required.`);
    logger.log(`   Simulating human review...`);
    await new Promise(r => setTimeout(r, 3000));
    logger.log(`   [Human Admin] Decision: APPROVE execution for Validation Request ${result.simulationId}`);

    // Call on-chain PolicyEngine.humanApprove to approve the validation
    const txHash = await dependencies.runtime.walletClient.writeContract({
      address: dependencies.client.config.policyEngineAddress as `0x${string}`,
      abi: parseAbi(["function humanApprove(bytes32 requestHash, bool passed) external"]),
      functionName: "humanApprove",
      args: [result.simulationId as `0x${string}`, true],
    });
    logger.log(`   [Admin] Approval submitted on-chain: ${txHash}`);
    await dependencies.runtime.publicClient.waitForTransactionReceipt({ hash: txHash });
    logger.log(`   [Admin] Validation request officially approved.`);

    // Execute the agent directly now that validation is approved
    logger.log(`[Orchestrator] Invoking agent ${agentKey} directly after validation approval...`);
    const output = await profile.execute(1n);
    logger.log(`🟢 [Orchestrator] Task executed and completed by ${agentKey}!`);

    // Submit feedback to ReputationRegistry to complete the feedback loop
    try {
      logger.log(`[Orchestrator] Submitting reputation feedback for ${agentKey}...`);
      const identityRegistry = deployed.contracts.IdentityRegistry || deployed.contracts.AgentIdentityRegistry;
      const reputationRegistry = deployed.contracts.ReputationRegistry;
      const agentId = await dependencies.runtime.publicClient.readContract({
        address: identityRegistry as `0x${string}`,
        abi: parseAbi(["function getAgentIdByWallet(address who) external view returns (uint256)"]),
        functionName: "getAgentIdByWallet",
        args: [profile.walletAddress as `0x${string}`],
      }) as bigint;

      const feedbackHash = await dependencies.runtime.walletClient.writeContract({
        address: reputationRegistry as `0x${string}`,
        abi: parseAbi([
          "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string calldata tag1, string calldata tag2, string calldata endpoint, string calldata feedbackURI, bytes32 feedbackHash) external"
        ]),
        functionName: "giveFeedback",
        args: [
          agentId,
          3n, // rating value (3/5 for quarantined agent)
          0,
          "quarantine-passed",
          "",
          "",
          "",
          keccak256(toBytes(`Approved execution: ${result.simulationId}`)),
        ],
      });
      await dependencies.runtime.publicClient.waitForTransactionReceipt({ hash: feedbackHash });
      logger.log(`🟢 [Orchestrator] Reputation feedback submitted: ${feedbackHash}`);

      // Bust cache on-chain
      const bustHash = await dependencies.runtime.walletClient.writeContract({
        address: dependencies.client.config.trustRegistryAddress as `0x${string}`,
        abi: parseAbi([
          "function getCompositeScore(address agentAddress) external returns (uint8 score, bool unregistered, bool sybilFlagged, uint32 cachedAt)"
        ]),
        functionName: "getCompositeScore",
        args: [profile.walletAddress as `0x${string}`],
      });
      await dependencies.runtime.publicClient.waitForTransactionReceipt({ hash: bustHash });
      logger.log(`🟢 [Orchestrator] Cache busted for trust registry.`);
    } catch (err: any) {
      logger.log(`⚠️  [Orchestrator] Failed to submit feedback/bust cache: ${err.message}`);
    }

    return output;
  }

  if (result.tier === 1) {
    logger.log(`🟢 [Orchestrator] Task executed via Escrow (Tier 1) for ${agentKey}!`);
  } else if (result.tier === 0) {
    logger.log(`🟢 [Orchestrator] Task executed via Direct Pay (Tier 0) for ${agentKey}!`);
  }

  return result.output || "";
}

function getTaskTypeForAgentAndPrompt(agentKey: string, prompt: string): number {
  if (agentKey === "dataFeedPro" || agentKey === "priceOracle") {
    if (prompt.toLowerCase().includes("summarize") || prompt.toLowerCase().includes("agenda") || prompt.toLowerCase().includes("format")) {
      return 0; // TextSummarization
    }
    return 2; // DataAnalysis
  }
  if (agentKey === "newService" || agentKey === "summaryBot") {
    if (prompt.toLowerCase().includes("translate")) {
      return 3; // Translation
    }
    return 0; // TextSummarization
  }
  if (agentKey === "suspiciousAgent" || agentKey === "riskAssessor" || agentKey === "codeAuditor" || agentKey === "onChainIndexer") {
    if (prompt.toLowerCase().includes("review") || prompt.toLowerCase().includes("verify") || prompt.toLowerCase().includes("audit")) {
      return 1; // CodeReview
    }
    return 4; // Custom
  }
  return 4; // Custom default
}

function decodeInput(inputURI: string): string {
  if (inputURI.startsWith("data:")) {
    const match = inputURI.match(/data:[^,]*,(.+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }
  return inputURI;
}

export function parseScenarioFlag(argv: string[]): OrchestratorScenario {
  const scenarioArg = argv.find((entry) => entry.startsWith("--scenario="));
  const value = scenarioArg?.split("=")[1] ?? "all";

  if (value === "meetup" || value === "finance" || value === "research") {
    return value;
  }

  return "all";
}

export function parseGoalFlag(argv: string[]): string | undefined {
  const index = argv.findIndex((entry) => entry.startsWith("--goal="));
  if (index !== -1) {
    const firstPart = argv[index].substring("--goal=".length);
    const parts = [firstPart];
    for (let i = index + 1; i < argv.length; i++) {
      if (argv[i].startsWith("-")) {
        break;
      }
      parts.push(argv[i]);
    }
    return parts.join(" ").trim();
  }
  
  const index2 = argv.indexOf("--goal");
  if (index2 !== -1 && index2 + 1 < argv.length) {
    const parts = [];
    for (let i = index2 + 1; i < argv.length; i++) {
      if (argv[i].startsWith("-")) {
        break;
      }
      parts.push(argv[i]);
    }
    return parts.join(" ").trim();
  }
  
  return undefined;
}