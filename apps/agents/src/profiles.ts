import type { ProviderProfile } from "@trustmesh/shared";
import { createPublicClient, http, parseAbi } from "viem";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

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

// Demo agent wallets — these are deterministic Hardhat test accounts
const HARDHAT_ACCOUNTS = {
  account1: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as `0x${string}`,
  account2: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as `0x${string}`,
  account3: "0x90F79bf6EB2c4f870365E785982E1f101E93b906" as `0x${string}`,
};

export const providerProfiles: Record<string, ProviderProfile> = {
  dataFeedPro: {
    name: "DataFeed Pro",
    trustScore: 92,
    tier: 0,
    serviceUrl: "http://localhost:3001/request-service",
    correctDeliverable: true,
    walletAddress: HARDHAT_ACCOUNTS.account1,
    serviceFee: "1000000000000000", // 0.001 AVAX
  },
  newService: {
    name: "NewService",
    trustScore: 55,
    tier: 1,
    serviceUrl: "http://localhost:3002/request-service",
    correctDeliverable: true,
    walletAddress: HARDHAT_ACCOUNTS.account2,
    serviceFee: "2000000000000000", // 0.002 AVAX
  },
  suspiciousAgent: {
    name: "SuspiciousAgent",
    trustScore: 22,
    tier: 2,
    serviceUrl: "http://localhost:3003/request-service",
    correctDeliverable: false,
    walletAddress: HARDHAT_ACCOUNTS.account3,
    serviceFee: "500000000000000", // 0.0005 AVAX
  },
};


export function listProviderProfiles(): ProviderProfile[] {
  return Object.values(providerProfiles);
}