import { executeAgentTask } from "./server.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

let deployed: any;
try {
  deployed = JSON.parse(readFileSync(resolve(process.cwd(), "deployed-addresses.json"), "utf8"));
} catch {
  deployed = JSON.parse(readFileSync(resolve(process.cwd(), "../../deployed-addresses.json"), "utf8"));
}

const contractAddress = deployed.contracts.TaskAgent_CodeAuditor;
const privateKey = (process.env.CODE_AUDITOR_PRIVATE_KEY || "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356") as `0x${string}`;

const systemInstruction = 
  "You are CodeAuditor, a smart contract vulnerability scanner. " +
  "Audit Solidity code, check for known vulnerability patterns, verify ERC standard compliance, and generate a security report.";

export async function executeCodeAuditor(taskId: bigint, prompt?: string): Promise<string> {
  return executeAgentTask(profile, taskId, prompt);
}

export const profile = {
  agentId: 7,
  key: "codeAuditor",
  name: "CodeAuditor",
  port: 3008,
  capabilities: ["audit_contract", "check_vuln_patterns", "verify_erc_comply", "generate_report"],
  contractName: "TaskAgent_CodeAuditor",
  trustScore: 95,
  tier: 0 as const,
  serviceUrl: "http://localhost:3008/request-service",
  correctDeliverable: true,
  walletAddress: "0x14dc79964da2c08b23698b3d3cc7ca32193d9955" as `0x${string}`,
  serviceFee: "3000000000000000", // 0.003 AVAX
  contractAddress,
  privateKey,
  systemInstruction,
  llmConfig: {
    provider: "gemini" as const,
    model: "gemini-2.5-flash",
  },
  execute: executeCodeAuditor,
};
