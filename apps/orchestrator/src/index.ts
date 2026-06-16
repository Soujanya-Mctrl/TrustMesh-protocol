import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  providerProfiles,
  executeDataFeedPro,
  executeNewService,
  executeSuspiciousAgent
} from "@trustmesh/agents";
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
  agentKey: "dataFeedPro" | "newService" | "suspiciousAgent";
  prompt: string;
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
  if (normalized.includes("meetup")) {
    return [
      {
        agentKey: "dataFeedPro",
        prompt: "What are the top 3 trending DeFi themes in Avalanche C-Chain for a developer meetup agenda?",
      },
      {
        agentKey: "newService",
        prompt: "Translate this meetup invite to Japanese: 'Join us for our upcoming Avalanche Developer Meetup on June 18th to discuss: {{output_0}}'",
      },
      {
        agentKey: "suspiciousAgent",
        prompt: "Analyze the following RSVPs for sybil accounts: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8, 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC, 0x90F79bf6EB2c4f870365E785982E1f101E93b906",
      },
    ];
  }
  if (normalized.includes("yield") || normalized.includes("finance") || normalized.includes("stake")) {
    return [
      {
        agentKey: "dataFeedPro",
        prompt: "Fetch current yield options and APYs for Benqi Liquid Staking (sAVAX) and Trader Joe AVAX/USDC pools.",
      },
      {
        agentKey: "newService",
        prompt: "Generate a rebalancing script to allocate 60% of funds to sAVAX and 40% to Trader Joe pools based on these rates: {{output_0}}",
      },
      {
        agentKey: "suspiciousAgent",
        prompt: "Scan for arbitrage opportunities on the proposed rebalancing routes: {{output_1}}",
      },
    ];
  }
  // default/research fallback
  return [
    {
      agentKey: "dataFeedPro",
      prompt: "Summarize the active addresses, transactions, and gas fees across primary Avalanche Subnets over the last 24 hours.",
    },
    {
      agentKey: "newService",
      prompt: "Write a professional developer newsletter in markdown summarizing these subnet statistics: {{output_0}}",
    },
    {
      agentKey: "suspiciousAgent",
      prompt: "Verify the security status and verify links for the following subnet nodes: {{output_1}}",
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
       TaskAgent Contract Address: ${a.contractAddress}
       ERC-8004 Feedback Reviews: ${a.feedbackCount}
       ERC-8004 Average Rating: ${a.averageRating}
       Capabilities: ${a.capabilities}`
    ).join("\n\n");

    const prompt = `You are the Lead Orchestrator Agent for TrustMesh.
You have a high-level user goal, and you must plan a sequence of steps to achieve it by calling the available specialist agents via their on-chain TaskAgent contracts.

Available Specialist Agents:
${agentDescriptions}

User Goal: "${goal}"

Decompose this goal into a sequential pipeline of steps.
For each step, specify:
1. "agentKey": The key of the agent to call ("dataFeedPro", "newService", or "suspiciousAgent").
2. "prompt": The specific instruction/prompt to send to that agent. If you need to refer to the output of a previous step, use the placeholder format "{{output_0}}" for the first step, "{{output_1}}" for the second step, etc.

Return ONLY a JSON array of objects with the keys "agentKey" and "prompt". Do not wrap it in markdown formatting other than pure JSON.
Example response:
[
  {
    "agentKey": "dataFeedPro",
    "prompt": "Analyze AVAX token on Avalanche."
  },
  {
    "agentKey": "newService",
    "prompt": "Translate this report: {{output_0}} to Japanese."
  }
]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    
    // Strip markdown code block if present
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

  // Resolve final high-level goal
  let finalGoal = goal;
  if (!finalGoal) {
    if (scenario === "meetup") {
      finalGoal = "Plan a developer meetup in Japan discussing Avalanche trends and RSVPs";
    } else if (scenario === "finance") {
      finalGoal = "Optimize DeFi yields by rebalancing sAVAX and Trader Joe pools";
    } else if (scenario === "research") {
      finalGoal = "Compile a research newsletter summarizing Avalanche subnet statistics and cross-checking facts";
    } else {
      finalGoal = "Analyze Avalanche C-Chain developer trends, translate the results to Japanese for a developer meetup invite, and check node addresses and RSVPs for Sybil risk";
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

  // Fetch agent parameters and EIP-8004 reputation summary dynamically on-chain
  const agentsInfo = [];
  const keys: ("dataFeedPro" | "newService" | "suspiciousAgent")[] = ["dataFeedPro", "newService", "suspiciousAgent"];

  for (const key of keys) {
    const profile = providerProfiles[key];
    
    let contractAddress: `0x${string}`;
    if (key === "dataFeedPro") contractAddress = deployed.contracts.TaskAgent_DataFeedPro;
    else if (key === "newService") contractAddress = deployed.contracts.TaskAgent_NewService;
    else contractAddress = deployed.contracts.TaskAgent_SuspiciousAgent;

    let feedbackCount = 0n;
    let averageRating = 0n;

    try {
      const repSummary = await dependencies.runtime.publicClient.readContract({
        address: contractAddress,
        abi: TaskAgentABI,
        functionName: "getReputationSummary",
      }) as [bigint, bigint];
      feedbackCount = repSummary[0];
      averageRating = repSummary[1];
    } catch (err) {
      // registry might not be seeded/feedback not given yet
    }

    agentsInfo.push({
      key,
      profile,
      contractAddress,
      feedbackCount: feedbackCount.toString(),
      averageRating: averageRating.toString(),
      capabilities: key === "dataFeedPro" 
        ? "DeFi market analysis, data feeds, on-chain metrics retrieval."
        : key === "newService"
        ? "Translation, localization, writing, markdown editing/newsletter generation."
        : "High-frequency trading signals, security scanning, Sybil RSVP checking, arbitrage detection."
    });
  }

  logger.log("\n[Lead Agent] Planning steps using Gemini based on available specialist profiles...");
  const steps = await planWorkflow(finalGoal, agentsInfo, logger);

  logger.log(`\n[Lead Agent] Planned workflow:`);
  steps.forEach((step, idx) => {
    logger.log(`  Step ${idx + 1}: [${step.agentKey}] -> "${step.prompt}"`);
  });

  const stepOutputs: string[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    logger.log(`\n--------------------------------------------------`);
    logger.log(`Executing Step ${i + 1}/${steps.length}: calling ${step.agentKey}`);
    logger.log(`--------------------------------------------------`);

    // Resolve prompt placeholders (e.g. {{output_0}}, {{output_1}})
    let resolvedPrompt = step.prompt;
    for (let j = 0; j < stepOutputs.length; j++) {
      resolvedPrompt = resolvedPrompt.replace(new RegExp(`\\{\\{output_${j}\\}\\}`, "g"), stepOutputs[j]);
    }

    let contractAddress: `0x${string}`;
    if (step.agentKey === "dataFeedPro") contractAddress = deployed.contracts.TaskAgent_DataFeedPro;
    else if (step.agentKey === "newService") contractAddress = deployed.contracts.TaskAgent_NewService;
    else contractAddress = deployed.contracts.TaskAgent_SuspiciousAgent;

    logger.log(`[Lead Agent] Prompt: "${resolvedPrompt}"`);
    const output = await executeOnChainStep(dependencies.runtime, step.agentKey, contractAddress, resolvedPrompt, logger);
    stepOutputs.push(output);

    logger.log(`[Lead Agent] Output: ${output.slice(0, 150)}${output.length > 150 ? '...' : ''}`);
  }

  logger.log(`\n==================================================`);
  logger.log(`Workflow Execution Complete!`);
  logger.log(`==================================================`);
}

async function executeOnChainStep(
  runtime: ViemRuntime,
  agentKey: string,
  contractAddress: `0x${string}`,
  prompt: string,
  logger: any
): Promise<string> {
  const taskType = getTaskTypeForAgentAndPrompt(agentKey, prompt);
  
  // 1. Get task price
  const price = await runtime.publicClient.readContract({
    address: contractAddress,
    abi: TaskAgentABI,
    functionName: "taskPrices",
    args: [taskType],
  }) as bigint;

  logger.log(`[SDK] Task price for ${agentKey} is ${Number(price) / 1e18} AVAX.`);

  // 2. Submit task
  const inputURI = `data:text/plain,${encodeURIComponent(prompt)}`;
  const inputHash = keccak256(toBytes(prompt));

  logger.log(`[SDK] Submitting requestTask on-chain at ${contractAddress}...`);
  
  const txHash = await runtime.walletClient.writeContract({
    address: contractAddress,
    abi: TaskAgentABI,
    functionName: "requestTask",
    args: [taskType, inputURI, inputHash],
    value: price,
  });

  const receipt = await runtime.publicClient.waitForTransactionReceipt({ hash: txHash });
  
  // Find taskId from TaskRequested event log
  // event TaskRequested(uint256 indexed taskId, address indexed requester, uint8 taskType, uint256 payment)
  const log = receipt.logs[0];
  const taskId = BigInt(log?.topics[1] ?? "1");

  logger.log(`[SDK] Task requested! Transaction hash: ${txHash}. Task ID: ${taskId}`);

  // 3. Invoke the agent on-demand
  logger.log(`[Orchestrator] Invoking agent ${agentKey} directly for Task #${taskId}...`);
  let output: string;
  if (agentKey === "dataFeedPro") {
    output = await executeDataFeedPro(taskId);
  } else if (agentKey === "newService") {
    output = await executeNewService(taskId);
  } else if (agentKey === "suspiciousAgent") {
    output = await executeSuspiciousAgent(taskId);
  } else {
    throw new Error(`Unknown agent key: ${agentKey}`);
  }

  logger.log(`🟢 [Orchestrator] Task #${taskId} executed and completed on-chain by ${agentKey}!`);
  return output;
}

function getTaskTypeForAgentAndPrompt(agentKey: string, prompt: string): number {
  if (agentKey === "dataFeedPro") {
    if (prompt.toLowerCase().includes("summarize") || prompt.toLowerCase().includes("agenda")) {
      return 0; // TextSummarization
    }
    return 2; // DataAnalysis
  }
  if (agentKey === "newService") {
    return 3; // Translation
  }
  if (agentKey === "suspiciousAgent") {
    if (prompt.toLowerCase().includes("review") || prompt.toLowerCase().includes("verify")) {
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