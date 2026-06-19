import hre from "hardhat";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { keccak256, toBytes } from "viem";


interface DeployedAddresses {
  contracts: {
    AgentIdentityRegistry: `0x${string}`;
    ReputationRegistry: `0x${string}`;
    AgentMetricsRegistry: `0x${string}`;
    TrustRegistry: `0x${string}`;
    EscrowVault: `0x${string}`;
    ValidationRegistry: `0x${string}`;
    PolicyEngine: `0x${string}`;
    TaskAgent_DataFeedPro: `0x${string}`;
    TaskAgent_NewService: `0x${string}`;
    TaskAgent_SuspiciousAgent: `0x${string}`;
    TaskAgent_PriceOracle: `0x${string}`;
    TaskAgent_SummaryBot: `0x${string}`;
    TaskAgent_RiskAssessor: `0x${string}`;
    TaskAgent_CodeAuditor: `0x${string}`;
    TaskAgent_OnChainIndexer: `0x${string}`;
  };
}

// Demo agent profiles with deterministic trust targets
const DEMO_AGENTS = [
  {
    name: "DataFeed Pro",
    targetScore: 92,
    tier: 0 as const,
    description: "High-trust data feed provider with extensive track record",
    reputationRating: 5n,
    registrationDaysAgo: 300,
    settledUsd: 8000,
    txCount: 50,
    microTxCount: 2,
    counterparties: 45,
    capabilities: ["data-feed", "analytics", "real-time-pricing"],
    reviews: [
      { rating: 5n, tags: "fast,accurate,reliable" },
      { rating: 5n, tags: "good-uptime,quality-data" },
      { rating: 5n, tags: "highly-recommended" }
    ]
  },
  {
    name: "NewService",
    targetScore: 55,
    tier: 1 as const,
    description: "Recently launched service provider building reputation",
    reputationRating: 4n,
    registrationDaysAgo: 63,
    settledUsd: 3500,
    txCount: 25,
    microTxCount: 3,
    counterparties: 25,
    capabilities: ["translation", "summarization"],
    reviews: [
      { rating: 4n, tags: "fast,reliable" },
      { rating: 4n, tags: "correct-output,good" },
      { rating: 4n, tags: "satisfactory" }
    ]
  },
  {
    name: "SuspiciousAgent",
    targetScore: 22,
    tier: 2 as const,
    description: "Low-trust agent with suspicious transaction patterns",
    reputationRating: 4n,
    registrationDaysAgo: 180,
    settledUsd: 10000,
    txCount: 100,
    microTxCount: 65, // 65% micro-txs -> Sybil flagged!
    counterparties: 50,
    capabilities: ["unknown"],
    reviews: [
      { rating: 4n, tags: "fast,good" },
      { rating: 4n, tags: "average" },
      { rating: 4n, tags: "neutral" }
    ]
  },
  {
    name: "PriceOracle",
    targetScore: 88,
    tier: 0 as const,
    description: "Low-fee price oracle providing fast asset pricing rates",
    reputationRating: 5n,
    registrationDaysAgo: 180,
    settledUsd: 6000,
    txCount: 40,
    microTxCount: 2,
    counterparties: 35,
    capabilities: ["price-oracle", "defi-rates", "token-balance", "arbitrage"],
    reviews: [
      { rating: 5n, tags: "cheap,accurate" },
      { rating: 4n, tags: "fast" }
    ]
  },
  {
    name: "SummaryBot",
    targetScore: 64,
    tier: 1 as const,
    description: "Automated summarization and document formatting assistant",
    reputationRating: 4n,
    registrationDaysAgo: 45,
    settledUsd: 1500,
    txCount: 15,
    microTxCount: 1,
    counterparties: 10,
    capabilities: ["summarize", "newsletter", "entities", "formatting"],
    reviews: [
      { rating: 4n, tags: "good" },
      { rating: 4n, tags: "readable" }
    ]
  },
  {
    name: "RiskAssessor",
    targetScore: 78,
    tier: 0 as const,
    description: "On-chain risk analyzer and counterparty scanner",
    reputationRating: 5n,
    registrationDaysAgo: 90,
    settledUsd: 5000,
    txCount: 30,
    microTxCount: 3,
    counterparties: 25,
    capabilities: ["risk-check", "anomalies", "wallet-history", "scoring"],
    reviews: [
      { rating: 5n, tags: "detailed" },
      { rating: 4n, tags: "thorough" }
    ]
  },
  {
    name: "CodeAuditor",
    targetScore: 95,
    tier: 0 as const,
    description: "Professional Solidity smart contract security auditor",
    reputationRating: 5n,
    registrationDaysAgo: 200,
    settledUsd: 12000,
    txCount: 60,
    microTxCount: 0,
    counterparties: 45,
    capabilities: ["audit", "vulnerabilities", "compliance", "report"],
    reviews: [
      { rating: 5n, tags: "safe,expert" },
      { rating: 5n, tags: "professional" }
    ]
  },
  {
    name: "OnChainIndexer",
    targetScore: 82,
    tier: 0 as const,
    description: "Avalanche subnet state indexer and data compiler",
    reputationRating: 5n,
    registrationDaysAgo: 150,
    settledUsd: 7000,
    txCount: 45,
    microTxCount: 2,
    counterparties: 35,
    capabilities: ["indexer", "state-read", "analytics", "tx-history"],
    reviews: [
      { rating: 4n, tags: "accurate" },
      { rating: 5n, tags: "complete" }
    ]
  },
];

function getAgentServiceEndpoint(name: string): string {
  const nameLower = name.toLowerCase().replace(/\s+/g, "");
  if (nameLower === "datafeedpro") return "http://localhost:3001/request-service";
  if (nameLower === "priceoracle") return "http://localhost:3002/request-service";
  if (nameLower === "newservice") return "http://localhost:3003/request-service";
  if (nameLower === "suspiciousagent") return "http://localhost:3004/request-service";
  if (nameLower === "summarybot") return "http://localhost:3006/request-service";
  if (nameLower === "riskassessor") return "http://localhost:3007/request-service";
  if (nameLower === "codeauditor") return "http://localhost:3008/request-service";
  if (nameLower === "onchainindexer") return "http://localhost:3009/request-service";
  return "http://localhost:3000/request-service";
}

async function uploadToPinata(metadata: any, agentName: string): Promise<string | null> {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    console.log(`  ⚠ PINATA_JWT not configured. Skipping IPFS upload for ${agentName}.`);
    return null;
  }

  try {
    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${jwt}`
      },
      body: JSON.stringify({
        pinataContent: metadata,
        pinataMetadata: {
          name: `${agentName.replace(/\s+/g, "-").toLowerCase()}-metadata`
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn(`  ⚠ Pinata upload failed for ${agentName}: ${response.status} ${response.statusText} - ${errText}`);
      return null;
    }

    const resJson = (await response.json()) as any;
    if (resJson && resJson.IpfsHash) {
      console.log(`  ✓ Successfully pinned metadata to IPFS via Pinata: ipfs://${resJson.IpfsHash}`);
      return `ipfs://${resJson.IpfsHash}`;
    }

    return null;
  } catch (error: any) {
    console.warn(`  ⚠ Pinata upload error for ${agentName}:`, error.message || error);
    return null;
  }
}

async function main() {
  console.log("=== TrustMesh Seeding ===\n");

  // Read deployed addresses
  const addressesPath = resolve(process.cwd(), "deployed-addresses.json");
  const deployed: DeployedAddresses = JSON.parse(
    readFileSync(addressesPath, "utf8"),
  );

  const { viem } = await hre.network.getOrCreate();
  const walletClients = await viem.getWalletClients();
  const deployer = walletClients[0];
  const publicClient = await viem.getPublicClient();

  async function waitTx(hash: `0x${string}`) {
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === "reverted") {
      throw new Error(`Transaction reverted: ${hash}`);
    }
    return receipt;
  }

  // Deterministic agent addresses matching profiles.ts
  const agentAddresses = [
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Account #1 (DataFeed Pro)
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Account #2 (NewService)
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906", // Account #3 (SuspiciousAgent)
    "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65", // Account #4 (PriceOracle)
    "0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc", // Account #5 (SummaryBot)
    "0x976ea74026e726554db657fa54763abd0c3a0aa9", // Account #6 (RiskAssessor)
    "0x14dc79964da2c08b23698b3d3cc7ca32193d9955", // Account #7 (CodeAuditor)
    "0x23618e81e3f5cdf7f54c3d65f7fbc0abf5b21e8f", // Account #8 (OnChainIndexer)
  ];

  // Reviewers: use local hardhat accounts if available, fallback to deployer
  const reviewer1 = walletClients.length >= 5 ? walletClients[4] : deployer;
  const reviewer2 = walletClients.length >= 6 ? walletClients[5] : deployer;
  const reviewers = [reviewer1, reviewer2, deployer];

  // Get contract instances
  const identityRegistry = await viem.getContractAt(
    "IdentityRegistry",
    deployed.contracts.AgentIdentityRegistry,
    { client: { wallet: deployer } }
  );
  const reputationRegistry = await viem.getContractAt(
    "ReputationRegistry",
    deployed.contracts.ReputationRegistry,
  );
  const trustRegistry = await viem.getContractAt(
    "TrustRegistry",
    deployed.contracts.TrustRegistry,
  );
  const metricsRegistry = await viem.getContractAt(
    "AgentMetricsRegistry",
    deployed.contracts.AgentMetricsRegistry,
  );
  const now = Math.floor(Date.now() / 1000);

  for (let i = 0; i < DEMO_AGENTS.length; i++) {
    const agent = DEMO_AGENTS[i];
    const agentAddress = agentAddresses[i] as `0x${string}`;
    const agentWalletClient = walletClients[i + 1];

    console.log(`--- Seeding ${agent.name} (target score: ${agent.targetScore}) ---`);

    // Get TaskAgent contract address
    let taskAgentAddress: `0x${string}`;
    if (i === 0) taskAgentAddress = deployed.contracts.TaskAgent_DataFeedPro;
    else if (i === 1) taskAgentAddress = deployed.contracts.TaskAgent_NewService;
    else if (i === 2) taskAgentAddress = deployed.contracts.TaskAgent_SuspiciousAgent;
    else if (i === 3) taskAgentAddress = deployed.contracts.TaskAgent_PriceOracle;
    else if (i === 4) taskAgentAddress = deployed.contracts.TaskAgent_SummaryBot;
    else if (i === 5) taskAgentAddress = deployed.contracts.TaskAgent_RiskAssessor;
    else if (i === 6) taskAgentAddress = deployed.contracts.TaskAgent_CodeAuditor;
    else taskAgentAddress = deployed.contracts.TaskAgent_OnChainIndexer;

    const taskAgent = await viem.getContractAt(
      "TaskAgent",
      taskAgentAddress,
      { client: { wallet: agentWalletClient } }
    );

    const isRegistered = await taskAgent.read.isRegistered();
    let agentId: bigint;
    if (!isRegistered) {
      // 1. Resolve chain ID and registry address for standard ERC-8004 registrations
      const chainId = await publicClient.getChainId();
      const registryAddress = identityRegistry.address;
      
      // 2. Predict the agentId based on total supply + 1
      const totalSupply = await identityRegistry.read.totalAgents() as bigint;
      const predictedAgentId = totalSupply + 1n;

      // Prepare ERC-8004 metadata matching EIP-8004 spec exactly
      const serviceEndpoint = getAgentServiceEndpoint(agent.name);
      const meta = {
        type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
        name: agent.name,
        description: agent.description,
        image: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(agent.name)}`,
        services: [
          {
            name: "web",
            endpoint: serviceEndpoint
          }
        ],
        capabilities: agent.capabilities, // Included as custom profile extension (allowed by spec)
        x402Support: true,
        active: true,
        registrations: [
          {
            agentId: Number(predictedAgentId),
            agentRegistry: `eip155:${chainId}:${registryAddress}`
          }
        ],
        supportedTrust: ["reputation", "crypto-economic"]
      };

      let agentURI = await uploadToPinata(meta, agent.name);
      if (!agentURI) {
        // Fallback to inline base64 data URI
        const base64Meta = Buffer.from(JSON.stringify(meta)).toString("base64");
        agentURI = `data:application/json;base64,${base64Meta}`;
        console.log(`  ✓ Generated inline base64 data URI for ${agent.name}`);
      }

      // 1. Register agent via its TaskAgent contract (3 arguments)
      const tx = await taskAgent.write.registerAgent([
        agent.name,
        agent.description,
        agentURI
      ]);
      await waitTx(tx);
      agentId = (await taskAgent.read.agentId()) as bigint;
      console.log(`  ✓ Identity registered with Agent ID: ${agentId}`);
    } else {
      agentId = (await taskAgent.read.agentId()) as bigint;
      console.log(`  ✓ Already registered with Agent ID: ${agentId}`);
    }

    // Set historical registration time (admin override)
    const registrationTime = now - agent.registrationDaysAgo * 86400;
    const regTx = await identityRegistry.write.setRegistrationTime([
      agentId,
      BigInt(registrationTime)
    ]);
    await waitTx(regTx);
    console.log(`  ✓ Registration timestamp set to ${agent.registrationDaysAgo} days ago`);

    console.log(`  ✓ Agent Wallet registered at EOA: ${agentAddress}`);

    // Seed agent wallet with AVAX from deployer (Faucet simulation)
    const networkName = (hre.network as any).name;
    const faucetValue = networkName === "fuji" ? 200000000000000000n : 10000000000000000000n; // 0.2 AVAX for Fuji, 10 AVAX for local
    const deployerBalance = await publicClient.getBalance({ address: deployer.account.address });

    if (deployerBalance > faucetValue + 50000000000000000n) { // include buffer for gas
      const faucetTx = await deployer.sendTransaction({
        to: agentAddress,
        value: faucetValue,
      });
      await waitTx(faucetTx);
      console.log(`  ✓ Faucet seeded EOA with ${networkName === "fuji" ? "0.2" : "10"} AVAX`);
    } else {
      console.log(`  ⚠ Faucet skip: deployer balance too low (${Number(deployerBalance) / 1e18} AVAX)`);
    }

    // 2. Submit real reputation reviews from multiple counterparties (against Agent ID!)
    for (let r = 0; r < agent.reviews.length; r++) {
      let reviewerWallet = reviewers[r % reviewers.length];
      if (reviewerWallet.account.address.toLowerCase() === agentAddress.toLowerCase()) {
        reviewerWallet = reviewers[(r + 1) % reviewers.length];
        if (reviewerWallet.account.address.toLowerCase() === agentAddress.toLowerCase()) {
          reviewerWallet = deployer;
        }
      }
      const reputationAsReviewer = await viem.getContractAt(
        "ReputationRegistry",
        deployed.contracts.ReputationRegistry,
        { client: { wallet: reviewerWallet } }
      );
      // 1. Resolve chain ID and registry address for feedback metadata
      const chainId = await publicClient.getChainId();
      const registryAddress = identityRegistry.address;

      const feedbackMeta = {
        agentRegistry: `eip155:${chainId}:${registryAddress}`,
        agentId: Number(agentId),
        clientAddress: `eip155:${chainId}:${reviewerWallet.account.address}`,
        createdAt: new Date(now * 1000).toISOString(),
        value: Number(agent.reviews[r].rating),
        valueDecimals: 0,
        tag1: agent.reviews[r].tags,
        tag2: "",
        proofOfPayment: {
          fromAddress: reviewerWallet.account.address,
          toAddress: agentAddress,
          chainId: chainId.toString(),
          txHash: "0x0000000000000000000000000000000000000000000000000000000000000000"
        }
      };

      let feedbackURI = await uploadToPinata(feedbackMeta, `${agent.name}-feedback-${r}`);
      let feedbackHash = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;
      if (feedbackURI) {
        feedbackHash = keccak256(toBytes(JSON.stringify(feedbackMeta)));
      } else {
        // Fallback to inline base64 data URI
        const base64Meta = Buffer.from(JSON.stringify(feedbackMeta)).toString("base64");
        feedbackURI = `data:application/json;base64,${base64Meta}`;
        feedbackHash = keccak256(toBytes(JSON.stringify(feedbackMeta)));
        console.log(`  ✓ Generated inline base64 feedback data URI for review #${r}`);
      }

      const fbTx = await reputationAsReviewer.write.giveFeedback([
        agentId,
        agent.reviews[r].rating,
        0, // valueDecimals
        agent.reviews[r].tags, // tag1
        "", // tag2
        "", // endpoint
        feedbackURI,
        feedbackHash
      ]);
      await waitTx(fbTx);
    }
    console.log(`  ✓ ${agent.reviews.length} reputation reviews submitted against Agent ID: ${agentId}`);

    // 3. Seed agent metrics directly on AgentMetricsRegistry (against Agent EOA Address!)
    const settledUsd18 = BigInt(agent.settledUsd) * BigInt(1e18);
    const metricsTx = await metricsRegistry.write.seedMetrics([
      agentAddress,
      [
        settledUsd18,
        BigInt(agent.txCount),
        BigInt(agent.microTxCount),
        agent.counterparties,
      ],
    ]);
    await waitTx(metricsTx);
    console.log(
      `  ✓ Metrics seeded: $${agent.settledUsd} settled, ${agent.txCount} txs, ${agent.counterparties} counterparties against EOA`,
    );

    // 4. Compute and verify composite score (against Agent EOA Address!)
    const scoreTx = await trustRegistry.write.getCompositeScore([agentAddress]);
    await waitTx(scoreTx);
    const cached = (await trustRegistry.read.getCachedScore([agentAddress])) as any;
    const score = Number(cached.score !== undefined ? cached.score : cached[0]);
    console.log(`  ✓ Composite score: ${score} (target: ${agent.targetScore})`);
    console.log("");
  }

  // 5. Seed a pending validation request for SuspiciousAgent
  console.log("--- Seeding validation request for SuspiciousAgent ---");
  const suspiciousAgentWallet = walletClients[3];
  const suspiciousTaskAgent = await viem.getContractAt(
    "TaskAgent",
    deployed.contracts.TaskAgent_SuspiciousAgent,
    { client: { wallet: suspiciousAgentWallet } }
  );
  const taskHash = "0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e" as `0x${string}`;
  
  try {
    const valTx = await suspiciousTaskAgent.write.requestValidation([
      deployed.contracts.PolicyEngine, // validatorAddress
      "",                             // requestURI
      taskHash,                       // requestHash
    ]);
    await waitTx(valTx);
    console.log(`  ✓ Pending Validation requested (Task Hash: ${taskHash})`);
  } catch (err) {
    console.log(`  ✓ Validation request already exists or skipped: ${(err as any).message ?? err}`);
  }

  console.log("\n=== Seeding Complete ===");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
