import hre from "hardhat";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

interface DeployedAddresses {
  contracts: {
    AgentIdentityRegistry: `0x${string}`;
    ReputationRegistry: `0x${string}`;
    AgentMetricsRegistry: `0x${string}`;
    TrustRegistry: `0x${string}`;
    EscrowVault: `0x${string}`;
    ValidationRegistry: `0x${string}`;
    PolicyEngine: `0x${string}`;
    ERC6551Registry: `0x${string}`;
    TaskAgent_DataFeedPro: `0x${string}`;
    TaskAgent_NewService: `0x${string}`;
    TaskAgent_SuspiciousAgent: `0x${string}`;
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
];

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

  // Deterministic agent addresses matching profiles.ts
  const agentAddresses = [
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Account #1
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC", // Account #2
    "0x90F79bf6EB2c4f870365E785982E1f101E93b906"  // Account #3
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
  const erc6551Registry = await viem.getContractAt(
    "ERC6551Registry",
    deployed.contracts.ERC6551Registry,
  );

  const now = Math.floor(Date.now() / 1000);
  const seededTbaAddresses: `0x${string}`[] = [];

  for (let i = 0; i < DEMO_AGENTS.length; i++) {
    const agent = DEMO_AGENTS[i];
    const agentAddress = agentAddresses[i];
    const agentWalletClient = walletClients[i + 1];

    console.log(`--- Seeding ${agent.name} (target score: ${agent.targetScore}) ---`);

    // Get TaskAgent contract address
    let taskAgentAddress: `0x${string}`;
    if (i === 0) taskAgentAddress = deployed.contracts.TaskAgent_DataFeedPro;
    else if (i === 1) taskAgentAddress = deployed.contracts.TaskAgent_NewService;
    else taskAgentAddress = deployed.contracts.TaskAgent_SuspiciousAgent;

    const taskAgent = await viem.getContractAt(
      "TaskAgent",
      taskAgentAddress,
      { client: { wallet: agentWalletClient } }
    );

    const isRegistered = await taskAgent.read.isRegistered();
    let agentId: bigint;
    if (!isRegistered) {
      // 1. Register agent via its TaskAgent contract
      await taskAgent.write.registerAgent([
        agent.name,
        agent.description,
        `ipfs://${agent.name.replace(/\s+/g, "").toLowerCase()}Metadata`
      ]);
      agentId = await taskAgent.read.agentId();
      console.log(`  ✓ Identity registered with Agent ID: ${agentId}`);
    } else {
      agentId = await taskAgent.read.agentId();
      console.log(`  ✓ Already registered with Agent ID: ${agentId}`);
    }

    // Set historical registration time (admin override)
    const registrationTime = now - agent.registrationDaysAgo * 86400;
    await identityRegistry.write.setRegistrationTime([
      agentId,
      BigInt(registrationTime)
    ]);
    console.log(`  ✓ Registration timestamp set to ${agent.registrationDaysAgo} days ago`);

    // Deploy TBA wallet using ERC6551Registry (wrapped in try-catch)
    try {
      await erc6551Registry.write.createAccount([
        deployed.contracts.AgentIdentityRegistry,
        agentId
      ]);
    } catch (err) {
      // might be already deployed
    }

    const tbaAddress = (await erc6551Registry.read.getAccount([
      deployed.contracts.AgentIdentityRegistry,
      agentId
    ])) as `0x${string}`;

    seededTbaAddresses.push(tbaAddress);
    console.log(`  ✓ TBA Wallet deployed at: ${tbaAddress}`);

    // Seed TBA wallet with 10 AVAX from deployer (Faucet simulation)
    await deployer.sendTransaction({
      to: tbaAddress,
      value: 10000000000000000000n, // 10 AVAX
    });
    console.log(`  ✓ Faucet seeded TBA with 10 AVAX`);

    // 2. Submit real reputation reviews from multiple counterparties (against Agent ID!)
    for (let r = 0; r < agent.reviews.length; r++) {
      const reviewerWallet = reviewers[r % reviewers.length];
      const reputationAsReviewer = await viem.getContractAt(
        "ReputationRegistry",
        deployed.contracts.ReputationRegistry,
        { client: { wallet: reviewerWallet } }
      );
      await reputationAsReviewer.write.giveFeedback([
        agentId,
        agent.reviews[r].rating,
        0, // valueDecimals
        agent.reviews[r].tags, // tag1
        "", // tag2
        "", // endpoint
        "", // feedbackURI
        "0x0000000000000000000000000000000000000000000000000000000000000000" // feedbackHash
      ]);
    }
    console.log(`  ✓ ${agent.reviews.length} reputation reviews submitted against Agent ID: ${agentId}`);

    // 3. Seed agent metrics directly on AgentMetricsRegistry (against TBA!)
    const settledUsd18 = BigInt(agent.settledUsd) * BigInt(1e18);
    await metricsRegistry.write.seedMetrics([
      tbaAddress,
      [
        settledUsd18,
        BigInt(agent.txCount),
        BigInt(agent.microTxCount),
        agent.counterparties,
      ],
    ]);
    console.log(
      `  ✓ Metrics seeded: $${agent.settledUsd} settled, ${agent.txCount} txs, ${agent.counterparties} counterparties against TBA`,
    );

    // 4. Compute and verify composite score (against TBA!)
    await trustRegistry.write.getCompositeScore([tbaAddress]);
    const cached = (await trustRegistry.read.getCachedScore([tbaAddress])) as any;
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
    await suspiciousTaskAgent.write.requestValidation([
      deployed.contracts.PolicyEngine, // validatorAddress
      "",                             // requestURI
      taskHash,                       // requestHash
    ]);
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
