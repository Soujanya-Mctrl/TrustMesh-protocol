import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { createPublicClient, createWalletClient, http, parseAbi, keccak256, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji, hardhat } from "viem/chains";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

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

const rpcUrl = process.env.RPC_URL || process.env.FUJI_RPC_URL || "http://127.0.0.1:8545";
const isFuji = rpcUrl.includes("avax-test") || rpcUrl.includes("fuji") || rpcUrl.includes("43113");
const chain = isFuji ? avalancheFuji : hardhat;

const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

// Implement tools
async function getTbaBalance(address: string): Promise<string> {
  try {
    const balance = await publicClient.getBalance({ address: address as `0x${string}` });
    return `${Number(balance) / 1e18} AVAX`;
  } catch (err) {
    return "Error fetching balance";
  }
}

async function getAgentInfo(address: string): Promise<any> {
  if (!deployed || !deployed.contracts.TrustRegistry) {
    return { error: "TrustRegistry not deployed" };
  }
  const TRUST_REGISTRY_ABI = parseAbi([
    "function getCachedScore(address agentAddress) external view returns (uint8 score, bool unregistered, bool sybilFlagged, uint32 cachedAt)",
  ]);
  try {
    const res = await publicClient.readContract({
      address: deployed.contracts.TrustRegistry,
      abi: TRUST_REGISTRY_ABI,
      functionName: "getCachedScore",
      args: [address as `0x${string}`],
    }) as any;
    return {
      score: Number(res.score !== undefined ? res.score : res[0]),
      unregistered: res.unregistered !== undefined ? res.unregistered : res[1],
      sybilFlagged: res.sybilFlagged !== undefined ? res.sybilFlagged : res[2],
    };
  } catch (err) {
    return { error: "Failed to read agent info" };
  }
}

// Initialize Gemini API client
const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

function getSimulatedResponse(profileName: string, prompt: string): string {
  if (profileName === "DataFeed Pro") {
    return `[DataFeed Pro Oracle Report]
Asset: AVAX
Sentiment: Strong Bullish (85%)
Analysis: Subnet transaction volume has increased by 42% over the last 7 days. Developer activity on the C-Chain remains strong.
Recommendation: DEPOSIT AVAX on Benqi L1 (current APY: 5.2%).`;
  }
  if (profileName === "NewService") {
    if (prompt.toLowerCase().includes("translate")) {
      return `[NewService Translation]
AVAXをBenqi L1に100預け入れることを推奨します。取引ハッシュ: 0x3b8d...`;
    }
    return `[NewService Newsletter]
Avalanche Subnets have seen a massive surge in developer activity this week! DataFeed Pro reports a 42% increase in subnet transaction volume.`;
  }
  if (profileName === "PriceOracle") {
    return `[PriceOracle Rates Feed]
AVAX/USD: $28.50 | sAVAX/AVAX: 1.054
 Trader Joe APY (AVAX/USDC): 12.4% | Benqi APY (sAVAX): 5.6%
Pool comparisons complete. Liquid staking exhibits higher utility-adjusted risk-adjusted yields.`;
  }
  if (profileName === "SummaryBot") {
    return `[SummaryBot Governance Condensation]
Proposal Summary: Reduce L1 validator yield distribution parameters to stabilize subnet gas costs.
Voter Sentiment: 82% Positive, 18% Concerns about reward dilutive effects. Markdown formatting verified.`;
  }
  if (profileName === "RiskAssessor") {
    return `[RiskAssessor Safety Report]
Counterparty EOA: 0x7099... Risk Rating: LOW (92/100 trust score).
Anomaly scanning completed: No Sybil address patterns or low-activity counterparties flagged in transaction history.`;
  }
  if (profileName === "CodeAuditor") {
    return `[CodeAuditor Solidity Audit]
Contract: YieldOptimizer.sol
Vulnerabilities: 0 High, 1 Medium (Reentrancy risk in emergencyWithdraw, addressed via nonReentrant modifier).
Compliance: ERC-20 / ERC-721 interfaces comply with standards. PASS.`;
  }
  if (profileName === "OnChainIndexer") {
    return `[OnChainIndexer Subnet Index]
Block Height: 12,450,210 | Subnet Active addresses: 1,420
Wallet flow analytics: Found 420 interactions matching rebalance execution triggers over last 48 hours.`;
  }
  return `[SuspiciousAgent Arbitrage Signal / Security Check]
No Sybil risk detected on RSVPs. Verify complete for all node addresses.
Recommended Arbitrage: BTC/USD BUY at $67,400.`;
}

const defaultTools = [
  {
    functionDeclarations: [
      {
        name: "get_tba_balance",
        description: "Get the current EVM/AVAX balance of a given wallet or TBA address.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            address: { type: SchemaType.STRING, description: "The EVM address to check." }
          },
          required: ["address"]
        }
      },
      {
        name: "get_agent_info",
        description: "Get on-chain trust score and sybil flags of an agent from the TrustRegistry.",
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            address: { type: SchemaType.STRING, description: "The EVM address of the agent." }
          },
          required: ["address"]
        }
      }
    ]
  }
];

const defaultHandlers: Record<string, (args: any) => Promise<any>> = {
  get_tba_balance: async (args: any) => await getTbaBalance(args.address as string),
  get_agent_info: async (args: any) => await getAgentInfo(args.address as string),
};

export async function generateAIContent(
  profileName: string,
  prompt: string,
  systemInstruction: string,
  customTools?: any[],
  customHandlers?: Record<string, (args: any) => Promise<any>>,
  llmConfig?: { provider: "gemini" | "groq"; model?: string; }
): Promise<string> {
  const provider = llmConfig?.provider || "gemini";

  if (provider === "groq") {
    try {
      const model = llmConfig?.model || "llama-3.3-70b-versatile";
      return await generateGroqContent(prompt, systemInstruction, model);
    } catch (error: any) {
      console.error(`Groq API call failed for ${profileName}, using fallback:`, error.message ?? error);
      return getSimulatedResponse(profileName, prompt);
    }
  }

  if (!genAI) {
    return getSimulatedResponse(profileName, prompt);
  }

  try {
    const sysInstruction = systemInstruction + 
      "\nYou have access to tools that let you query the Avalanche blockchain. Use them to provide accurate, real-time metrics when requested.";

    const tools = customTools || defaultTools;
    const handlers = customHandlers || defaultHandlers;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: sysInstruction,
      tools: tools
    });

    const chat = model.startChat();
    let result = await chat.sendMessage(prompt);
    
    // Handle up to 3 function calls in sequence
    for (let i = 0; i < 3; i++) {
      const calls = result.response.functionCalls();
      if (!calls || calls.length === 0) {
        break;
      }
      
      const call = calls[0];
      let responseValue: any = "Unknown tool";
      const args = call.args as any;
      
      const handler = handlers[call.name];
      if (handler) {
        responseValue = await handler(args);
      }
      
      result = await chat.sendMessage([
        {
          functionResponse: {
            name: call.name,
            response: { result: responseValue }
          }
        }
      ]);
    }

    const text = result.response.text();
    return text.trim();
  } catch (error) {
    console.error(`Gemini API call failed for ${profileName}, using fallback:`, error);
    return getSimulatedResponse(profileName, prompt);
  }
}

async function generateGroqContent(
  prompt: string,
  systemInstruction: string,
  modelName: string = "llama-3.3-70b-versatile"
): Promise<string> {
  const groqApiKey = process.env.GROQ_API_KEY || "";
  if (!groqApiKey) {
    throw new Error("GROQ_API_KEY environment variable is not set.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: modelName,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq API returned error status ${response.status}: ${errText}`);
  }

  const data = await response.json() as any;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Invalid response structure from Groq API");
  }

  return content.trim();
}

// TaskAgent ABI definition
const TaskAgentABI = parseAbi([
  "function getTask(uint256 taskId) view returns ((uint256 taskId, uint256 agentId, address requester, uint8 taskType, uint8 status, string inputURI, bytes32 inputHash, string outputURI, bytes32 outputHash, uint256 payment, uint256 createdAt, uint256 completedAt))",
  "function startTask(uint256 taskId) external",
  "function completeTask(uint256 taskId, string outputURI, bytes32 outputHash) external",
]);

export interface AgentConfig {
  agentId?: number;
  name: string;
  contractAddress: `0x${string}`;
  privateKey: `0x${string}`;
  systemInstruction: string;
  llmConfig?: {
    provider: "gemini" | "groq";
    model?: string;
  };
}

export async function executeAgentTask(config: AgentConfig, taskId: bigint): Promise<string> {
  const account = privateKeyToAccount(config.privateKey);
  
  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(rpcUrl),
  });

  const idStr = taskId.toString();
  console.log(`\n[${config.name}] [Task #${idStr}] Beginning task execution...`);

  // 1. Fetch task
  const task = await publicClient.readContract({
    address: config.contractAddress,
    abi: TaskAgentABI,
    functionName: "getTask",
    args: [taskId],
  }) as any;

  const status = Number(task.status !== undefined ? task.status : task[4]);
  if (status !== 0) {
    throw new Error(`Task #${idStr} is not in Pending status. Status: ${status}`);
  }

  const taskAgentId = BigInt(task.agentId !== undefined ? task.agentId : task[1]);
  if (config.agentId !== undefined && taskAgentId !== BigInt(config.agentId)) {
    throw new Error(`Task #${idStr} is assigned to agentId ${taskAgentId}, but this agent is configured with agentId ${config.agentId}`);
  }

  const inputURI = task.inputURI !== undefined ? task.inputURI : task[5];
  const taskType = Number(task.taskType !== undefined ? task.taskType : task[3]);
  const requester = task.requester !== undefined ? task.requester : task[2];

  console.log(`  Type: ${taskType}`);
  console.log(`  Requester: ${requester}`);
  console.log(`  Input: ${inputURI}`);

  try {
    // 2. Mark task InProgress on-chain
    console.log(`  [1/3] Marking task #${idStr} as InProgress on-chain...`);
    const startHash = await walletClient.writeContract({
      address: config.contractAddress,
      abi: TaskAgentABI,
      functionName: "startTask",
      args: [taskId],
    });
    await publicClient.waitForTransactionReceipt({ hash: startHash });
    console.log(`    ✓ Task #${idStr} is now InProgress.`);

    // 3. Process AI content
    console.log(`  [2/3] Generating AI response...`);
    let prompt = inputURI;
    if (inputURI.startsWith("data:")) {
      const match = inputURI.match(/data:[^,]*,(.+)/);
      if (match) {
        prompt = decodeURIComponent(match[1]);
      }
    }

    const output = await generateAIContent(
      config.name, 
      prompt, 
      config.systemInstruction,
      undefined,
      undefined,
      config.llmConfig
    );

    // 4. Mark task Completed on-chain
    console.log(`  [3/3] Completing task #${idStr} on-chain...`);
    const outputURI = `data:text/plain,${encodeURIComponent(output)}`;
    const outputHash = keccak256(toBytes(output));

    const completeHash = await walletClient.writeContract({
      address: config.contractAddress,
      abi: TaskAgentABI,
      functionName: "completeTask",
      args: [taskId, outputURI, outputHash],
    });
    await publicClient.waitForTransactionReceipt({ hash: completeHash });
    console.log(`  [Done] Task #${idStr} completed! Output: "${output.slice(0, 50)}..."`);
    return output;
  } catch (err: any) {
    console.error(`  [Error] Failed to execute task #${idStr}:`, err.message);
    throw err;
  }
}