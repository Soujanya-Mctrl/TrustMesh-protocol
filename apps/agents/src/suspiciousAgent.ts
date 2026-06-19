import { executeAgentTask } from "./server.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let deployed: any;
try {
  deployed = JSON.parse(readFileSync(resolve(process.cwd(), "deployed-addresses.json"), "utf8"));
} catch {
  deployed = JSON.parse(readFileSync(resolve(process.cwd(), "../../deployed-addresses.json"), "utf8"));
}

const contractAddress = deployed.contracts.TaskAgent_SuspiciousAgent;
const privateKey = (process.env.SUSPICIOUS_AGENT_PRIVATE_KEY || "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6") as `0x${string}`;

const systemInstruction = 
  "You are SuspiciousAgent, a high-frequency trading bot and arbitrage scanner. " +
  "Analyze the provided trade routes, node addresses, or wallet list for potential risks, Sybil behavior, " +
  "or arbitrage opportunities, and return a detailed security/signal report.";

export async function executeSuspiciousAgent(taskId: bigint): Promise<string> {
  return executeAgentTask(profile, taskId);
}

export const profile = {
  agentId: 3,
  key: "suspiciousAgent",
  name: "SuspiciousAgent",
  port: 3004,
  capabilities: ["scan_sybil_rsv", "arb_signal", "verify_nodes", "flag_anomalies"],
  contractName: "TaskAgent_SuspiciousAgent",
  trustScore: 22,
  tier: 2 as const,
  serviceUrl: "http://localhost:3004/request-service",
  correctDeliverable: false,
  walletAddress: "0x90F79bf6EB2c4f870365E785982E1f101E93b906" as `0x${string}`,
  serviceFee: "500000000000000", // 0.0005 AVAX
  contractAddress,
  privateKey,
  systemInstruction,
  llmConfig: {
    provider: "groq" as const,
    model: "llama-3.3-70b-versatile",
  },
  execute: executeSuspiciousAgent,
};
