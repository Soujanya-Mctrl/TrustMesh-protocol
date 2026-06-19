import { executeAgentTask } from "./server.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let deployed: any;
try {
  deployed = JSON.parse(readFileSync(resolve(process.cwd(), "deployed-addresses.json"), "utf8"));
} catch {
  deployed = JSON.parse(readFileSync(resolve(process.cwd(), "../../deployed-addresses.json"), "utf8"));
}

const contractAddress = deployed.contracts.TaskAgent_RiskAssessor;
const privateKey = (process.env.RISK_ASSESSOR_PRIVATE_KEY || "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e") as `0x${string}`;

const systemInstruction = 
  "You are RiskAssessor, a security and risk evaluation oracle. " +
  "Scan counterparties, wallets, and transaction histories for Sybil, anomaly flags, or malicious behaviors, and output a security score.";

export async function executeRiskAssessor(taskId: bigint): Promise<string> {
  return executeAgentTask(profile, taskId);
}

export const profile = {
  agentId: 6,
  key: "riskAssessor",
  name: "RiskAssessor",
  port: 3007,
  capabilities: ["counterparty_risk", "flag_anomalies", "scan_wallet_hist", "score_address"],
  contractName: "TaskAgent_RiskAssessor",
  trustScore: 78,
  tier: 0 as const,
  serviceUrl: "http://localhost:3007/request-service",
  correctDeliverable: true,
  walletAddress: "0x976ea74026e726554db657fa54763abd0c3a0aa9" as `0x${string}`,
  serviceFee: "1000000000000000", // 0.001 AVAX
  contractAddress,
  privateKey,
  systemInstruction,
  llmConfig: {
    provider: "gemini" as const,
    model: "gemini-2.5-flash",
  },
  execute: executeRiskAssessor,
};
