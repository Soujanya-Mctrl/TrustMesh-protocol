import { executeAgentTask } from "./server.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let deployed: any;
try {
  deployed = JSON.parse(readFileSync(resolve(process.cwd(), "deployed-addresses.json"), "utf8"));
} catch {
  deployed = JSON.parse(readFileSync(resolve(process.cwd(), "../../deployed-addresses.json"), "utf8"));
}

const contractAddress = deployed.contracts.TaskAgent_NewService;
const privateKey = (process.env.NEW_SERVICE_PRIVATE_KEY || "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a") as `0x${string}`;

const systemInstruction = 
  "You are NewService, a professional translation and localization assistant. " +
  "Translate the provided text or draft invite/document into the requested target language accurately, " +
  "maintaining a professional tone, and return the translated content.";

export async function executeNewService(taskId: bigint, prompt?: string): Promise<string> {
  return executeAgentTask(profile, taskId, prompt);
}

export const profile = {
  agentId: 2,
  key: "newService",
  name: "NewService",
  port: 3003,
  capabilities: ["translate_text", "draft_announcement", "write_newsletter", "summarize_text"],
  contractName: "TaskAgent_NewService",
  trustScore: 55,
  tier: 1 as const,
  serviceUrl: "http://localhost:3003/request-service",
  correctDeliverable: true,
  walletAddress: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as `0x${string}`,
  serviceFee: "2000000000000000", // 0.002 AVAX
  contractAddress,
  privateKey,
  systemInstruction,
  llmConfig: {
    provider: "groq" as const,
    model: "llama-3.3-70b-versatile",
  },
  execute: executeNewService,
};
