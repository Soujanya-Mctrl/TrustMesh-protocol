import type { ProviderProfile } from "@trustmesh/shared";
import { privateKeyToAccount } from "viem/accounts";
import { profile as dataFeedPro } from "./dataFeedPro.js";
import { profile as newService } from "./newService.js";
import { profile as suspiciousAgent } from "./suspiciousAgent.js";
import { profile as priceOracle } from "./priceOracle.js";
import { profile as summaryBot } from "./summaryBot.js";
import { profile as riskAssessor } from "./riskAssessor.js";
import { profile as codeAuditor } from "./codeAuditor.js";
import { profile as onChainIndexer } from "./onChainIndexer.js";

export interface AgentProfile extends ProviderProfile {
  agentId: number;
  key: string;
  port: number;
  capabilities: string[];
  contractName: string;
  privateKey: `0x${string}`;
  contractAddress: `0x${string}`;
  systemInstruction: string;
  llmConfig?: {
    provider: "gemini" | "groq";
    model?: string;
  };
  execute: (taskId: bigint, prompt?: string) => Promise<string>;
}

export const providerProfiles: Record<string, AgentProfile> = {
  dataFeedPro,
  newService,
  suspiciousAgent,
  priceOracle,
  summaryBot,
  riskAssessor,
  codeAuditor,
  onChainIndexer,
};

// Dynamically derive walletAddress from privateKey for all 8 profiles to support custom Fuji keys
for (const key of Object.keys(providerProfiles)) {
  const profile = providerProfiles[key];
  if (profile.privateKey) {
    try {
      const account = privateKeyToAccount(profile.privateKey);
      profile.walletAddress = account.address;
    } catch (err) {
      console.error(`Failed to derive address for agent ${profile.name}:`, err);
    }
  }
}

export function listProviderProfiles(): AgentProfile[] {
  return Object.values(providerProfiles);
}