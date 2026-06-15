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

export async function initializeTbaAddresses(rpcUrl = "http://127.0.0.1:8545") {
  if (!deployed || !deployed.contracts.ERC6551Registry) {
    return;
  }

  const client = createPublicClient({
    transport: http(rpcUrl),
  });

  const REGISTRY_ABI = parseAbi([
    "function getAccount(address tokenContract, uint256 tokenId) external view returns (address)",
  ]);

  try {
    const registryAddr = deployed.contracts.ERC6551Registry as `0x${string}`;
    const tokenAddr = deployed.contracts.AgentIdentityRegistry as `0x${string}`;

    const tba0 = await client.readContract({
      address: registryAddr,
      abi: REGISTRY_ABI,
      functionName: "getAccount",
      args: [tokenAddr, 1n],
    }) as `0x${string}`;

    const tba1 = await client.readContract({
      address: registryAddr,
      abi: REGISTRY_ABI,
      functionName: "getAccount",
      args: [tokenAddr, 2n],
    }) as `0x${string}`;

    const tba2 = await client.readContract({
      address: registryAddr,
      abi: REGISTRY_ABI,
      functionName: "getAccount",
      args: [tokenAddr, 3n],
    }) as `0x${string}`;

    if (tba0 && tba0 !== "0x0000000000000000000000000000000000000000") {
      providerProfiles.dataFeedPro.walletAddress = tba0;
    }
    if (tba1 && tba1 !== "0x0000000000000000000000000000000000000000") {
      providerProfiles.newService.walletAddress = tba1;
    }
    if (tba2 && tba2 !== "0x0000000000000000000000000000000000000000") {
      providerProfiles.suspiciousAgent.walletAddress = tba2;
    }
  } catch (err) {
    console.error("Failed to query TBA addresses from registry:", err);
  }
}

export function listProviderProfiles(): ProviderProfile[] {
  return Object.values(providerProfiles);
}