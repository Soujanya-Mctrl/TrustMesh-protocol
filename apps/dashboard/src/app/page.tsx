"use client";

import { useEffect, useState } from "react";
import { 
  createPublicClient, 
  createWalletClient, 
  custom, 
  http, 
  parseEther,
  parseAbi,
  type Address 
} from "viem";
import { avalancheFuji, hardhat } from "viem/chains";
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  Wallet, 
  RefreshCw, 
  WifiOff,
  Menu,
  X,
  Sun,
  Moon,
  Search,
  ChevronRight,
  Terminal,
  Copy,
  Check,
  ExternalLink,
  Sliders,
  Settings,
  Radio,
  HelpCircle,
  TrendingUp,
  Cpu,
  Play
} from "lucide-react";
import { useTrustMeshEvents } from "../hooks/useTrustMeshEvents";

// Minimal ABIs to fetch initial data
const TrustRegistryABI = [
  {
    inputs: [{ name: "agentAddress", type: "address" }],
    name: "getCachedScore",
    outputs: [
      { name: "score", type: "uint8" },
      { name: "unregistered", type: "bool" },
      { name: "sybilFlagged", type: "bool" },
      { name: "cachedAt", type: "uint32" }
    ],
    stateMutability: "view",
    type: "function"
  }
] as const;

const ValidationRegistryABI = [
  {
    inputs: [{ name: "requestHash", type: "bytes32" }],
    name: "getValidationStatus",
    outputs: [
      { name: "validatorAddress", type: "address" },
      { name: "agentId", type: "uint256" },
      { name: "response", type: "uint8" },
      { name: "responseHash", type: "bytes32" },
      { name: "tag", type: "string" },
      { name: "lastUpdate", type: "uint256" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "requestHash", type: "bytes32" }],
    name: "isValidationComplete",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "requestHash", type: "bytes32" },
      { name: "response", type: "uint8" },
      { name: "responseURI", type: "string" },
      { name: "responseHash", type: "bytes32" },
      { name: "tag", type: "string" }
    ],
    name: "validationResponse",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

const PolicyEngineABI = [
  {
    inputs: [
      { name: "requestHash", type: "bytes32" },
      { name: "passed", type: "bool" }
    ],
    name: "humanApprove",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

const STATIC_AGENT_PROFILES: Record<number, any> = {
  1: {
    description: "High-trust weather and financial oracle feed with optimized direct routing.",
    registrationAge: "300 days",
    capabilities: ["data-feed", "analytics", "real-time-pricing"],
    reviews: [
      { reviewer: "0x3C44...93BC", rating: 5, tags: ["fast", "accurate", "reliable"], comment: "Consistently accurate weather feeds, highly recommended.", cid: "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco" },
      { reviewer: "0x90F7...b906", rating: 5, tags: ["uptime", "quality-data"], comment: "Uptime is near 100%, data is signed on-chain properly.", cid: "QmZ12aBcdE34fGhiJkKLmNopQkRSTuvwxYzABC12345678" }
    ]
  },
  2: {
    description: "Custom translation and analytics models with escrow payment security.",
    registrationAge: "63 days",
    capabilities: ["translation", "summarization", "nlp"],
    reviews: [
      { reviewer: "0x7099...79C8", rating: 4, tags: ["fast", "reliable"], comment: "Good translation accuracy and secure escrow support.", cid: "QmY1aBcdE34fGhiJkKLmNopQkRSTuvwxYzABC12345678" },
      { reviewer: "0x90F7...b906", rating: 4, tags: ["correct-output"], comment: "Service does exactly what is described. Recommended.", cid: "QmZ3aBcdE34fGhiJkKLmNopQkRSTuvwxYzABC12345678" }
    ]
  },
  3: {
    description: "Anomalous execution sandbox agent subject to manual policy review.",
    registrationAge: "180 days",
    capabilities: ["sandbox-exec", "unknown"],
    reviews: [
      { reviewer: "0x7099...79C8", rating: 4, tags: ["fast"], comment: "Suspiciously cheap but executed task on time.", cid: "QmW4aBcdE34fGhiJkKLmNopQkRSTuvwxYzABC12345678" },
      { reviewer: "0x3C44...93BC", rating: 2, tags: ["neutral", "micro-txs"], comment: "High amount of micro-transactions triggered policy flags.", cid: "QmX5aBcdE34fGhiJkKLmNopQkRSTuvwxYzABC12345678" }
    ]
  },
  4: {
    description: "Low-fee price oracle providing fast asset pricing rates.",
    registrationAge: "180 days",
    capabilities: ["price-oracle", "defi-rates", "arbitrage"],
    reviews: [
      { reviewer: "0x9965...a4dc", rating: 5, tags: ["cheap", "accurate"], comment: "Very low latency price queries.", cid: "QmV6aBcdE34fGhiJkKLmNopQkRSTuvwxYzABC12345678" }
    ]
  },
  5: {
    description: "Automated summarization and document formatting assistant.",
    registrationAge: "45 days",
    capabilities: ["summarize", "newsletter", "formatting"],
    reviews: [
      { reviewer: "0x976e...0aa9", rating: 4, tags: ["good-summaries"], comment: "Great markdown summary bot.", cid: "QmU7aBcdE34fGhiJkKLmNopQkRSTuvwxYzABC12345678" }
    ]
  },
  6: {
    description: "On-chain risk analyzer and counterparty scanner.",
    registrationAge: "90 days",
    capabilities: ["risk-check", "anomalies", "scoring"],
    reviews: [
      { reviewer: "0x14dc...9955", rating: 5, tags: ["detailed", "thorough"], comment: "Helped identify Sybil attackers easily.", cid: "QmT8aBcdE34fGhiJkKLmNopQkRSTuvwxYzABC12345678" }
    ]
  },
  7: {
    description: "Professional Solidity smart contract security auditor.",
    registrationAge: "200 days",
    capabilities: ["audit", "compliance", "report"],
    reviews: [
      { reviewer: "0x2361...1e8f", rating: 5, tags: ["safe", "expert", "thorough"], comment: "Uncovered 3 critical vulnerabilities in our code.", cid: "QmS9aBcdE34fGhiJkKLmNopQkRSTuvwxYzABC12345678" }
    ]
  },
  8: {
    description: "Avalanche subnet state indexer and data compiler.",
    registrationAge: "150 days",
    capabilities: ["indexing", "subnet-telemetry", "data-sync"],
    reviews: [
      { reviewer: "0x7099...79C8", rating: 5, tags: ["fast-sync", "accurate"], comment: "Telemetry state is matched in real-time.", cid: "QmR0aBcdE34fGhiJkKLmNopQkRSTuvwxYzABC12345678" }
    ]
  }
};

export default function DashboardPage() {
  const [deployed, setDeployed] = useState<any>(null);
  const isFuji = !deployed?.network || deployed.network === "fuji";
  const networkName = isFuji ? "Fuji" : "Localhost";
  const [account, setAccount] = useState<Address | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [prompts, setPrompts] = useState<Record<number, string>>({});
  const [executingAgentId, setExecutingAgentId] = useState<number | null>(null);
  const [executionResult, setExecutionResult] = useState<Record<number, any>>({});
  
  // Custom redesign states
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedAgentId, setCopiedAgentId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");

  // Orchestrator Console States
  const [orchestratorPrompt, setOrchestratorPrompt] = useState("");
  const [executingOrchestrator, setExecutingOrchestrator] = useState(false);
  const [orchestratorLog, setOrchestratorLog] = useState("");

  // ERC-8004 Modal States
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [agentMetrics, setAgentMetrics] = useState<any | null>(null);
  const [onChainReviews, setOnChainReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Fetch deployed addresses configuration on mount
  useEffect(() => {
    async function loadAddresses() {
      try {
        const res = await fetch("/api/addresses");
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setDeployed(data);
      } catch (err: any) {
        setErrorMessage(`Failed to load contract configuration: ${err.message}`);
      }
    }
    loadAddresses();

    // Theme initialization
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme("dark");
    }
  }, []);

  // Initialize WebSockets hook
  const { events, providers, activeEscalation, isConnected } = useTrustMeshEvents(deployed);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
  };

  // Connect Web3 Wallet (MetaMask)
  async function connectWallet() {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("Please install MetaMask or another Web3 wallet provider.");
      return;
    }

    try {
      const isFuji = !deployed?.network || deployed.network === "fuji";
      const chain = isFuji ? avalancheFuji : hardhat;
      const client = createWalletClient({
        chain,
        transport: custom(window.ethereum),
      });

      const [address] = await client.requestAddresses();
      setAccount(address || null);
    } catch (err: any) {
      alert(`Wallet connection failed: ${err.message}`);
    }
  }

  // Handle service request triggers directly in-browser
  async function handleRequestService(agentId: number) {
    const prompt = prompts[agentId]?.trim();
    if (!prompt) {
      alert("Please enter a prompt first.");
      return;
    }
    if (!account) {
      alert("Please connect your wallet first.");
      return;
    }
    if (!deployed) return;

    setExecutingAgentId(agentId);
    setExecutionResult(prev => ({ ...prev, [agentId]: { status: "Evaluating routing tier..." } }));

    try {
      const meta = providers.find(p => p.id === agentId)!;
      const rpcUrl = !deployed.network || deployed.network === "fuji"
        ? "https://api.avax-test.network/ext/bc/C/rpc"
        : "http://127.0.0.1:8545";

      const chain = !deployed.network || deployed.network === "fuji" ? avalancheFuji : hardhat;
      const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl),
      });

      const walletClient = createWalletClient({
        account,
        chain,
        transport: custom(window.ethereum),
      });

      const amount = agentId === 1 ? parseEther("0.001") : agentId === 2 ? parseEther("0.002") : parseEther("0.0005");
      const serviceUrl = agentId === 1 ? "http://localhost:3001/request-service" : agentId === 2 ? "http://localhost:3002/request-service" : "http://localhost:3003/request-service";

      const tier = await publicClient.readContract({
        address: deployed.contracts.PolicyEngine,
        abi: parseAbi([
          "function evaluateTier(address payee, uint256 amountAvax) external view returns (uint8)"
        ]),
        functionName: "evaluateTier",
        args: [meta.address, amount],
      }) as number;

      setExecutionResult(prev => ({ 
        ...prev, 
        [agentId]: { status: `Processing payment for ${meta.name} via ${tier === 0 ? "Direct Pay" : tier === 1 ? "Escrow" : "Consensus Verification"}...` } 
      }));

      if (tier === 0) {
        // --- Tier 0: Direct Transfer ---
        const txHash = await walletClient.sendTransaction({
          to: meta.address,
          value: amount,
        });
        
        setExecutionResult(prev => ({ ...prev, [agentId]: { status: "Awaiting settlement..." } }));
        await publicClient.waitForTransactionReceipt({ hash: txHash });

        setExecutionResult(prev => ({ ...prev, [agentId]: { status: "Executing task..." } }));
        const response = await fetch(serviceUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PAYMENT": JSON.stringify({ txHash, network: "avalanche-fuji", payer: account }),
          },
          body: JSON.stringify({ serviceRequest: { type: "execute", prompt } }),
        });
        const res = await response.json();
        
        // Record direct settlement on-chain
        try {
          const recordABI = parseAbi([
            "function recordDirectSettlement(address payer, address payee, uint256 amountAvax, uint256 settledUsd18) external"
          ]);
          await walletClient.writeContract({
            address: deployed.contracts.PolicyEngine,
            abi: recordABI,
            functionName: "recordDirectSettlement",
            args: [account, meta.address, amount, 0n],
          });
        } catch {}

        setExecutionResult(prev => ({ 
          ...prev, 
          [agentId]: { 
            status: "Complete", 
            output: res.output 
          } 
        }));

      } else if (tier === 1) {
        // --- Tier 1: Commit-Lock-Reveal Escrow ---
        setExecutionResult(prev => ({ ...prev, [agentId]: { status: "Securing funds..." } }));
        
        // Fetch quote deliverable hash
        const quoteRes = await fetch(serviceUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceRequest: { type: "quote", prompt } }),
        });
        const quote = await quoteRes.json();
        const deliverableHash = quote.deliverableHash;

        if (!deliverableHash) throw new Error("Agent failed to return deliverable hash");

        // Create escrow
        const escrowABI = parseAbi([
          "function createEscrow(address payee, bytes32 expectedHash) external payable returns (uint256)"
        ]);
        const txHash = await walletClient.writeContract({
          address: deployed.contracts.EscrowVault,
          abi: escrowABI,
          functionName: "createEscrow",
          args: [meta.address, deliverableHash],
          value: amount,
        });

        setExecutionResult(prev => ({ ...prev, [agentId]: { status: "Awaiting escrow lock..." } }));
        await publicClient.waitForTransactionReceipt({ hash: txHash });

        setExecutionResult(prev => ({ ...prev, [agentId]: { status: "Executing task..." } }));
        const executeRes = await fetch(serviceUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-PAYMENT": JSON.stringify({ txHash, network: "avalanche-fuji", payer: account }),
          },
          body: JSON.stringify({ serviceRequest: { type: "execute", prompt } }),
        });
        const res = await executeRes.json();

        setExecutionResult(prev => ({ 
          ...prev, 
          [agentId]: { 
            status: "Complete", 
            output: res.output 
          } 
        }));

      } else {
        // --- Tier 2: Simulation ---
        setExecutionResult(prev => ({ ...prev, [agentId]: { status: "Initiating Policy Engine evaluation..." } }));
        
        // Execute decideAndEmit on PolicyEngine to trigger the validation check on-chain
        const decideABI = parseAbi([
          "function decideAndEmit(address payer, address payee, uint256 amountAvax) external returns (uint8)"
        ]);
        
        const txHash = await walletClient.writeContract({
          address: deployed.contracts.PolicyEngine,
          abi: decideABI,
          functionName: "decideAndEmit",
          args: [account, meta.address, amount],
        });

        setExecutionResult(prev => ({ ...prev, [agentId]: { status: "Awaiting policy evaluation settlement..." } }));
        await publicClient.waitForTransactionReceipt({ hash: txHash });

        // Call agent service simulation endpoint
        await fetch(serviceUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceRequest: { type: "simulation", prompt } }),
        });

        setExecutionResult(prev => ({ 
          ...prev, 
          [agentId]: { 
            status: "Validation Required", 
            message: "This transaction was flagged due to low agent trust score. Escalation required." 
          } 
        }));
      }

    } catch (err: any) {
      setExecutionResult(prev => ({ 
        ...prev, 
        [agentId]: { status: "Failed", error: err.message } 
      }));
    } finally {
      setExecutingAgentId(null);
    }
  }

  // Resolve Human Review validation response (Approve / Reject)
  async function resolveValidation(passed: boolean) {
    if (!account) {
      alert("Please connect your wallet first.");
      return;
    }
    if (!deployed || !activeEscalation) return;

    setSubmitting(true);
    try {
      const isFuji = !deployed.network || deployed.network === "fuji";
      const walletClient = createWalletClient({
        account,
        chain: isFuji ? avalancheFuji : hardhat,
        transport: custom(window.ethereum),
      });

      await walletClient.writeContract({
        address: deployed.contracts.PolicyEngine,
        abi: PolicyEngineABI,
        functionName: "humanApprove",
        args: [
          activeEscalation.hash,
          passed
        ],
      });

      alert(`Validation resolved! Decision broadcasted to network.`);
    } catch (err: any) {
      alert(`Transaction failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  // Copy helper
  const handleCopyText = (text: string, agentId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedAgentId(agentId);
    setTimeout(() => setCopiedAgentId(null), 2000);
  };

  // Open ERC-8004 Reputation Modal and fetch real-time metrics
  // Fetch real reputation reviews dynamically from on-chain ReputationRegistry event logs
  async function fetchOnChainReviews(agentId: number) {
    if (!deployed) return [];

    const isFuji = !deployed.network || deployed.network === "fuji";
    const chain = isFuji ? avalancheFuji : hardhat;
    const rpcUrl = isFuji ? "https://api.avax-test.network/ext/bc/C/rpc" : "http://127.0.0.1:8545";
    const client = createPublicClient({
      chain,
      transport: http(rpcUrl)
    });

    try {
      const logs = await client.getLogs({
        address: deployed.contracts.ReputationRegistry,
        event: {
          type: "event",
          name: "NewFeedback",
          inputs: [
            { indexed: true, name: "agentId", type: "uint256" },
            { indexed: true, name: "clientAddress", type: "address" },
            { indexed: false, name: "feedbackIndex", type: "uint64" },
            { indexed: false, name: "value", type: "int128" },
            { indexed: false, name: "valueDecimals", type: "uint8" },
            { indexed: true, name: "indexedTag1", type: "string" },
            { indexed: false, name: "tag1", type: "string" },
            { indexed: false, name: "tag2", type: "string" },
            { indexed: false, name: "endpoint", type: "string" },
            { indexed: false, name: "feedbackURI", type: "string" },
            { indexed: false, name: "feedbackHash", type: "bytes32" }
          ]
        },
        args: { agentId: BigInt(agentId) } as any,
        fromBlock: 0n
      });

      const parsedReviews = [];
      for (const log of logs) {
        const { clientAddress, value, tag1, feedbackURI } = log.args;
        let comment = "";
        let tags: string[] = tag1 ? tag1.split(",") : [];

        if (feedbackURI && feedbackURI.startsWith("data:application/json;base64,")) {
          try {
            const base64Str = feedbackURI.slice("data:application/json;base64,".length);
            const jsonStr = atob(base64Str);
            const metaData = JSON.parse(jsonStr);
          } catch {}
        }

        const reviewerStr = clientAddress 
          ? `${clientAddress.slice(0, 6)}...${clientAddress.slice(-4)}`
          : "0xUnknown";

        const score = Number(value);
        if (score === 5) {
          comment = "Excellent service execution, reliable response and zero discrepancies.";
        } else if (score === 4) {
          comment = "Successful job completion. Satisfactory latency and standard execution.";
        } else if (score === 3) {
          comment = "Service completed, but encountered minor routing latency or policy review.";
        } else {
          comment = "Anomalous execution pattern or transaction failure triggered critical safety mechanism.";
        }

        const uriString = feedbackURI || "";
        parsedReviews.push({
          reviewer: reviewerStr,
          rating: score,
          tags,
          comment,
          cid: uriString.startsWith("data:") ? "" : uriString
        });
      }
      return parsedReviews;
    } catch (err) {
      console.warn("Failed to retrieve on-chain reviews:", err);
      return [];
    }
  }

  // Open ERC-8004 Reputation Modal and fetch real-time metrics
  async function handleOpenReputationModal(agent: any) {
    setSelectedAgent(agent);
    setLoadingMetrics(true);
    setAgentMetrics(null);
    setOnChainReviews([]);
    setLoadingReviews(true);

    const seedMetrics: Record<number, any> = {
      1: { settledVolumeUsd18: 8000n * 10n ** 18n, totalSettledTransactions: 50n, microTransactionCount: 2n, distinctCounterpartyCount: 45 },
      2: { settledVolumeUsd18: 3500n * 10n ** 18n, totalSettledTransactions: 25n, microTransactionCount: 3n, distinctCounterpartyCount: 25 },
      3: { settledVolumeUsd18: 10000n * 10n ** 18n, totalSettledTransactions: 100n, microTransactionCount: 65n, distinctCounterpartyCount: 50 },
      4: { settledVolumeUsd18: 6000n * 10n ** 18n, totalSettledTransactions: 40n, microTransactionCount: 2n, distinctCounterpartyCount: 35 },
      5: { settledVolumeUsd18: 1500n * 10n ** 18n, totalSettledTransactions: 15n, microTransactionCount: 1n, distinctCounterpartyCount: 10 },
      6: { settledVolumeUsd18: 5000n * 10n ** 18n, totalSettledTransactions: 30n, microTransactionCount: 3n, distinctCounterpartyCount: 25 },
      7: { settledVolumeUsd18: 12000n * 10n ** 18n, totalSettledTransactions: 60n, microTransactionCount: 0n, distinctCounterpartyCount: 45 },
      8: { settledVolumeUsd18: 7000n * 10n ** 18n, totalSettledTransactions: 45n, microTransactionCount: 2n, distinctCounterpartyCount: 40 },
    };

    try {
      if (deployed) {
        const isFuji = !deployed.network || deployed.network === "fuji";
        const chain = isFuji ? avalancheFuji : hardhat;
        const rpcUrl = isFuji ? "https://api.avax-test.network/ext/bc/C/rpc" : "http://127.0.0.1:8545";
        const client = createPublicClient({
          chain,
          transport: http(rpcUrl)
        });

        const metrics = await client.readContract({
          address: deployed.contracts.AgentMetricsRegistry,
          abi: parseAbi([
            "function getMetrics(address agent) external view returns (uint256 settledVolumeUsd18, uint64 totalSettledTransactions, uint64 microTransactionCount, uint32 distinctCounterpartyCount)"
          ]),
          functionName: "getMetrics",
          args: [agent.address],
        }) as any;

        if (metrics) {
          setAgentMetrics({
            settledVolumeUsd18: BigInt(metrics[0]),
            totalSettledTransactions: BigInt(metrics[1]),
            microTransactionCount: BigInt(metrics[2]),
            distinctCounterpartyCount: Number(metrics[3])
          });
        } else {
          setAgentMetrics(seedMetrics[agent.id]);
        }

        const reviews = await fetchOnChainReviews(agent.id);
        setOnChainReviews(reviews);
      } else {
        setAgentMetrics(seedMetrics[agent.id]);
      }
    } catch (err) {
      console.warn("Failed to fetch on-chain metrics, using seed values:", err);
      setAgentMetrics(seedMetrics[agent.id]);
    } finally {
      setLoadingMetrics(false);
      setLoadingReviews(false);
    }
  }

  // Run Orchestrator Goal via streaming API
  async function handleRunOrchestrator() {
    const goal = orchestratorPrompt.trim();
    if (!goal) {
      alert("Please enter a goal first.");
      return;
    }
    if (!account) {
      alert("Please connect your wallet first.");
      return;
    }
    if (!deployed) return;

    setExecutingOrchestrator(true);
    setOrchestratorLog("Spawning background orchestrator process...\n");

    try {
      const response = await fetch("/api/run-orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });

      if (!response.body) {
        throw new Error("No response stream available.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const text = decoder.decode(value);
          setOrchestratorLog((prev) => prev + text);
        }
      }
    } catch (err: any) {
      setOrchestratorLog((prev) => prev + `\n[Fatal Error] ${err.message}\n`);
    } finally {
      setExecutingOrchestrator(false);
    }
  }

  // Filter providers based on search query
  const filteredProviders = providers.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-zinc-50 dark:bg-[#18181B] text-zinc-900 dark:text-zinc-50 font-sans flex transition-colors duration-200">
        
        {/* Collapsible Left Sidebar */}
        <aside 
          className={`border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col shrink-0 transition-all duration-300 z-30
            ${sidebarOpen ? "w-64" : "w-0 -translate-x-full md:w-16 md:translate-x-0 overflow-hidden"}`}
        >
          {/* Brand Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded bg-[#E84142] flex items-center justify-center shrink-0">
                <Shield className="w-5 h-5 text-white" />
              </div>
              {sidebarOpen && (
                <span className="font-display font-bold text-sm uppercase tracking-wider text-zinc-900 dark:text-zinc-50 whitespace-nowrap">
                  TrustMesh Console
                </span>
              )}
            </div>
            {sidebarOpen && (
              <button 
                onClick={() => setSidebarOpen(false)} 
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Search bar inside Sidebar */}
          {sidebarOpen && (
            <div className="p-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-zinc-400" />
                <input 
                  type="text" 
                  placeholder="Filter elements..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md bg-zinc-50 dark:bg-[#0E0E10] focus:outline-none focus:border-[#E84142]"
                />
              </div>
            </div>
          )}

          {/* Navigation Tree */}
          <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
            <div>
              {sidebarOpen && <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase px-2 mb-2 tracking-widest">Getting Started</p>}
              <div className="space-y-1">
                <button 
                  onClick={() => setActiveTab("overview")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold tracking-tight transition-all
                    ${activeTab === "overview" 
                      ? "bg-[#E84142]/10 text-[#E84142] dark:bg-[#E84142]/20" 
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                >
                  <Cpu className="w-4 h-4" />
                  {sidebarOpen && <span>Overview Dashboard</span>}
                </button>
                <button 
                  onClick={() => setActiveTab("faucet")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold tracking-tight transition-all
                    ${activeTab === "faucet" 
                      ? "bg-[#E84142]/10 text-[#E84142] dark:bg-[#E84142]/20" 
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                >
                  <TrendingUp className="w-4 h-4" />
                  {sidebarOpen && <span>Testnet Faucet</span>}
                </button>
              </div>
            </div>

            <div>
              {sidebarOpen && <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase px-2 mb-2 tracking-widest">Testnet Infrastructure</p>}
              <div className="space-y-1">
                <button 
                  onClick={() => setActiveTab("policy")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold tracking-tight transition-all
                    ${activeTab === "policy" 
                      ? "bg-[#E84142]/10 text-[#E84142] dark:bg-[#E84142]/20" 
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sliders className="w-4 h-4" />
                    {sidebarOpen && <span>Policy Engine</span>}
                  </div>
                  {sidebarOpen && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                </button>
                <button 
                  onClick={() => setActiveTab("escrow")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold tracking-tight transition-all
                    ${activeTab === "escrow" 
                      ? "bg-[#E84142]/10 text-[#E84142] dark:bg-[#E84142]/20" 
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                >
                  <div className="flex items-center gap-2.5">
                    <Activity className="w-4 h-4" />
                    {sidebarOpen && <span>Escrow Vault</span>}
                  </div>
                  {sidebarOpen && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                </button>
                <button 
                  onClick={() => setActiveTab("validation")}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-semibold tracking-tight transition-all
                    ${activeTab === "validation" 
                      ? "bg-[#E84142]/10 text-[#E84142] dark:bg-[#E84142]/20" 
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                >
                  <div className="flex items-center gap-2.5">
                    <Radio className="w-4 h-4" />
                    {sidebarOpen && <span>Validation Registry</span>}
                  </div>
                  {sidebarOpen && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
                </button>
              </div>
            </div>

            <div>
              {sidebarOpen && <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase px-2 mb-2 tracking-widest">Support</p>}
              <div className="space-y-1">
                <button 
                  onClick={() => setActiveTab("docs")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold tracking-tight transition-all
                    ${activeTab === "docs" 
                      ? "bg-[#E84142]/10 text-[#E84142] dark:bg-[#E84142]/20" 
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                >
                  <HelpCircle className="w-4 h-4" />
                  {sidebarOpen && <span>Developer Docs</span>}
                </button>
              </div>
            </div>
          </nav>

          {/* Sidebar Footer Utility */}
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
            <button 
              onClick={toggleTheme}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              {theme === "light" ? (
                <>
                  <Moon className="w-4 h-4 text-zinc-500" />
                  {sidebarOpen && <span>Dark Theme</span>}
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  {sidebarOpen && <span>Light Theme</span>}
                </>
              )}
            </button>

            {sidebarOpen && (
              <div className="flex items-center gap-1.5 px-2 text-[10px] font-bold uppercase text-emerald-500">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping shrink-0" />
                <span>{networkName} Connected</span>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-grid-pattern">
          
          {/* Top Header */}
          <header className="h-16 shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 md:px-8 flex items-center justify-between sticky top-0 z-20 transition-colors">
            <div className="flex items-center gap-3">
              {!sidebarOpen && (
                <button 
                  onClick={() => setSidebarOpen(true)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              {/* Breadcrumbs */}
              <div className="flex items-center gap-2 text-xs font-semibold tracking-tight text-zinc-500 dark:text-zinc-400">
                <span>Console</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-zinc-900 dark:text-zinc-100 font-bold uppercase">
                  {activeTab === "overview" && "Overview"}
                  {activeTab === "faucet" && "Testnet Faucet"}
                  {activeTab === "policy" && "Policy Engine"}
                  {activeTab === "escrow" && "Escrow Vault"}
                  {activeTab === "validation" && "Validation Registry"}
                </span>
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-4">
              
              {/* WebSocket Reconnection Status */}
              {!isConnected ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                  <WifiOff className="w-3.5 h-3.5 animate-pulse" />
                  <span className="hidden md:inline">Reconnecting</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="hidden md:inline">Live Stream Active</span>
                </div>
              )}

              {/* Wallet connection */}
              <button 
                onClick={connectWallet}
                className={`flex items-center gap-2 px-4 py-2 font-display font-extrabold text-xs uppercase tracking-wider rounded-md border transition-all duration-150
                  ${account 
                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20" 
                    : "bg-[#E84142] hover:bg-[#d63435] text-white border-transparent shadow-sm hover:shadow"}`}
              >
                <Wallet className="w-3.5 h-3.5" />
                {account ? "Developer Active" : "Connect Wallet"}
              </button>
            </div>
          </header>

          {/* Page Body */}
          <div className="flex-1 p-6 md:p-10 max-w-6xl w-full mx-auto space-y-10">

            {errorMessage && (
              <div className="border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-300 p-4 rounded-xl font-bold text-xs flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div>{errorMessage}</div>
              </div>
            )}

            {/* Tab: Overview Dashboard */}
            {activeTab === "overview" && (
              <>
                {/* Hero / Welcome Onboarding Card */}
                <section className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-7 relative overflow-hidden shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  {/* Decorative left brand line */}
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#E84142]" />
                  
                  <div className="space-y-2 pl-2">
                    <h2 className="text-2xl font-display font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                      TrustMesh Autonomous Orchestration
                    </h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl font-medium leading-relaxed">
                      Securing micro-payment and task execution routes on the {isFuji ? "Avalanche Fuji Testnet" : "Local Hardhat Network"}. Transactions are routed dynamically via direct pay, escrow locks, or consensus validation depending on on-chain reputation scores and policy rules.
                    </p>
                  </div>

                  <div className="flex gap-6 shrink-0 border-l border-zinc-200 dark:border-zinc-800 pl-6 hidden md:flex">
                    <div className="text-center">
                      <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50">{providers.length}</div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Agents</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-extrabold text-[#E84142]">{networkName}</div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Chain</div>
                    </div>
                  </div>
                </section>

                {/* Orchestrator Prompt Section */}
                <section className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 space-y-4 shadow-sm relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#E84142]" />
                  <div className="flex items-center justify-between pl-2">
                    <h3 className="text-xs font-display font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Orchestrator Control Console
                    </h3>
                  </div>

                  <div className="flex flex-col md:flex-row gap-3 pl-2">
                    <input
                      type="text"
                      placeholder="Enter orchestrator goal prompt (e.g. 'Route payment through DataFeed Pro for standard weather telemetry updates')"
                      value={orchestratorPrompt}
                      onChange={(e) => setOrchestratorPrompt(e.target.value)}
                      disabled={executingOrchestrator}
                      className="flex-1 text-sm px-4 py-3 bg-zinc-50 dark:bg-zinc-950/30 border border-zinc-200 dark:border-zinc-800/80 rounded-xl focus:outline-none focus:border-[#E84142] focus:ring-1 focus:ring-[#E84142] text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 font-medium transition"
                    />
                    <button
                      onClick={handleRunOrchestrator}
                      disabled={executingOrchestrator || !account}
                      className="bg-[#E84142] hover:bg-[#d63435] text-white font-extrabold px-6 py-3 rounded-xl text-sm tracking-wider uppercase transition-all duration-150 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                    >
                      {executingOrchestrator ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-current" />
                          Run Orchestrator
                        </>
                      )}
                    </button>
                  </div>

                  {/* Preset Quick Actions */}
                  <div className="flex flex-wrap items-center gap-2 text-xs pl-2">
                    <span className="text-zinc-400 font-semibold">Presets:</span>
                    <button
                      onClick={() => setOrchestratorPrompt("Request standard weather telemetry updates")}
                      disabled={executingOrchestrator}
                      className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg font-semibold transition"
                    >
                      Telemetry Query
                    </button>
                    <button
                      onClick={() => setOrchestratorPrompt("Analyze data translations")}
                      disabled={executingOrchestrator}
                      className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg font-semibold transition relative"
                    >
                      Translation Service
                    </button>
                    <button
                      onClick={() => setOrchestratorPrompt("Trigger sandbox verification to check code security parameters")}
                      disabled={executingOrchestrator}
                      className="px-3 py-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg font-semibold transition relative"
                    >
                      Sandbox Verification
                    </button>
                  </div>

                  {/* Live CLI Logging Terminal */}
                  {orchestratorLog && (
                    <div className="bg-zinc-950 dark:bg-black rounded-xl border border-zinc-800/80 p-4 font-mono text-xs text-zinc-200 flex flex-col gap-2 relative overflow-hidden pl-2">
                      <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase border-b border-zinc-800 pb-2 mb-1">
                        <span className="flex items-center gap-1.5">
                          <Terminal className="w-4 h-4 text-zinc-400" />
                          Orchestrator Stream Output
                        </span>
                        <button
                          onClick={() => handleCopyText(orchestratorLog, 99)}
                          className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition"
                        >
                          {copiedAgentId === 99 ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <pre className="text-[11px] leading-relaxed max-h-[220px] overflow-y-auto pr-1 whitespace-pre-wrap font-mono">
                        {orchestratorLog}
                      </pre>
                    </div>
                  )}
                </section>

                {/* Service Providers Registry Table */}
                <section className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-display font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                      Available Service Registries
                    </h3>
                    {searchQuery && (
                      <span className="text-xs text-zinc-400 italic">
                        Showing {filteredProviders.length} of {providers.length} matching agents
                      </span>
                    )}
                  </div>

                  <div className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-sm">
                    {filteredProviders.length === 0 ? (
                      <div className="text-center py-16 text-zinc-500 font-medium bg-white dark:bg-[#131316]">
                        {providers.length === 0 ? "Loading registry credential state..." : "No agents found matching search query."}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                              <th className="py-3 px-4">Agent Profile</th>
                              <th className="py-3 px-4">Address & Balance</th>
                              <th className="py-3 px-4">On-Chain Score</th>
                              <th className="py-3 px-4">Status</th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                            {filteredProviders.map((agent) => {
                              const score = agent.score;
                              let scoreBadge = "bg-red-500/10 text-red-500 border border-red-500/20";
                              if (score >= 70) {
                                scoreBadge = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
                              } else if (score >= 40) {
                                scoreBadge = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
                              }
                              


                              return (
                                <tr 
                                  key={agent.id} 
                                  onClick={() => handleOpenReputationModal(agent)}
                                  className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors cursor-pointer text-xs group"
                                >
                                  {/* Profile Column */}
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-3">
                                      <img 
                                        src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(agent.name)}`}
                                        alt={agent.name}
                                        className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 shrink-0"
                                      />
                                      <div className="space-y-0.5">
                                        <div className="font-display font-bold uppercase tracking-tight text-zinc-900 dark:text-zinc-50 group-hover:text-[#E84142] transition-colors truncate max-w-[160px]">
                                          {agent.name}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-1">
                                          {(agent.capabilities || []).slice(0, 3).map((cap: string) => (
                                            <span key={cap} className="px-1 py-0.25 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200/50 dark:border-zinc-700/50 rounded text-[8px] font-bold font-mono">
                                              {cap}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  {/* Address & Balance */}
                                  <td className="py-3 px-4 font-mono text-[10px] text-zinc-600 dark:text-zinc-400">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-semibold">{agent.address.slice(0, 6)}...{agent.address.slice(-4)}</span>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleCopyText(agent.address, agent.id); }}
                                        className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition"
                                      >
                                        {copiedAgentId === agent.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                      </button>
                                    </div>
                                    <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mt-0.5">
                                      {agent.balance || "0.0000"} AVAX
                                    </div>
                                  </td>

                                  {/* Score */}
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-2">
                                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${scoreBadge}`}>
                                        {score}/100
                                      </span>
                                      {agent.sybilFlagged && (
                                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-500/10 text-red-500 border border-red-500/20 animate-pulse">
                                          Sybil
                                        </span>
                                      )}
                                    </div>
                                  </td>



                                  {/* Status */}
                                  <td className="py-3 px-4">
                                    <div className="flex items-center gap-1.5">
                                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${agent.status.includes("✓") || agent.status.includes("confirm") ? "bg-emerald-500" : agent.status.includes("Idle") ? "bg-zinc-300 dark:bg-zinc-700" : "bg-amber-500 animate-pulse"}`} />
                                      <span className="font-semibold text-[11px] text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">{agent.status}</span>
                                    </div>
                                  </td>

                                  {/* Actions */}
                                  <td className="py-3 px-4 text-right">
                                    <button 
                                      className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold uppercase text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 border border-zinc-200 dark:border-zinc-800 hover:border-[#E84142] dark:hover:border-[#E84142] rounded-md transition duration-150"
                                    >
                                      Profile
                                      <ChevronRight className="w-3 h-3" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </section>

                {/* Live Activity Feed */}
                <section className="space-y-4">
                  <h3 className="text-xs font-display font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Live Event Logs
                  </h3>
                  <div className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm">
                    {events.length === 0 ? (
                      <div className="text-center py-10 text-zinc-400 text-sm">
                        Waiting for routing events... Trigger an agent prompt to initialize logs.
                      </div>
                    ) : (
                      <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {events.map((rev) => (
                          <div key={rev.id} className="py-3 flex justify-between items-center first:pt-0 last:pb-0">
                            <div className="flex items-center gap-3">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${rev.type === "escalated" ? "bg-[#E84142] animate-pulse" : rev.type === "resolved" ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"}`} />
                              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{rev.message}</span>
                            </div>
                            <span className="text-[10px] font-bold text-zinc-400 uppercase">
                              {new Date(rev.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </>
            )}

            {/* Tab: Testnet Faucet */}
            {activeTab === "faucet" && (
              <section className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-8 space-y-6 shadow-sm">
                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-50">{isFuji ? "Avalanche Fuji Testnet" : "Local Testnet"} Faucet</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Acquire testnet AVAX to execute smart contract transactions.
                  </p>
                </div>
                <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0E0E10] rounded-xl text-xs space-y-3 font-semibold text-zinc-700 dark:text-zinc-300">
                  <p>In order to fund your developer wallet address directly, visit the official faucet console:</p>
                  <a 
                    href="https://faucet.avax.network/" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-flex items-center gap-1.5 text-[#E84142] hover:underline"
                  >
                    Go to Official Avalanche Faucet
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </section>
            )}

            {/* Tab: Policy Engine */}
            {activeTab === "policy" && (
              <section className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-8 space-y-6 shadow-sm">
                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-50">PolicyEngine Settings</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Configure automated payment thresholds, sybil flags, and escalation procedures.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                  <div className="border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold uppercase text-zinc-400">Settlement Routing Rules</h4>
                    <ul className="text-xs space-y-2 text-zinc-600 dark:text-zinc-400 font-semibold leading-relaxed">
                      <li>• <span className="text-emerald-500 font-bold">Direct Pay (Score &ge; 70)</span>: Instant direct settlement.</li>
                      <li>• <span className="text-amber-500 font-bold">Escrow Secure (Score 40-69)</span>: Funds secured in EscrowVault pending validation.</li>
                      <li>• <span className="text-red-500 font-bold">Consensus Validation (Score &lt; 40)</span>: Mandatory manual approval required.</li>
                    </ul>
                  </div>
                  <div className="border border-zinc-200 dark:border-zinc-800/80 p-5 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold uppercase text-zinc-400">Escalation Triggers</h4>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 font-semibold leading-relaxed">
                      If an agent's on-chain Trust Score drops below the critical threshold (40%) or has `sybilFlagged` active, the PolicyEngine redirects calls into the ValidationRegistry for human validator consensus.
                    </p>
                  </div>
                </div>
              </section>
            )}

            {/* Tab: Escrow Vault */}
            {activeTab === "escrow" && (
              <section className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-8 space-y-6 shadow-sm">
                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-50">EscrowVault Router</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Provides commit-lock-reveal micro-payment isolation.
                  </p>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-[#0E0E10] border border-zinc-200 dark:border-zinc-800/80 rounded-xl font-mono text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  <div className="font-bold text-zinc-900 dark:text-zinc-200 mb-1">Contract Deployment:</div>
                  <div>Address: {deployed?.contracts?.EscrowVault ? `Configured on ${networkName}` : "Unconfigured"}</div>
                  <div className="mt-2 text-zinc-500">Creates isolated locks keyed by expected result hashes. Reverts on timeout or verification failures.</div>
                </div>
              </section>
            )}

            {/* Tab: Validation Registry */}
            {activeTab === "validation" && (
              <section className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-8 space-y-6 shadow-sm">
                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-50">ValidationRegistry</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    A registry mapping consensus validation tasks to decentralized solvers.
                  </p>
                </div>
                <div className="p-4 bg-zinc-50 dark:bg-[#0E0E10] border border-zinc-200 dark:border-zinc-800/80 rounded-xl font-mono text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
                  <div className="font-bold text-zinc-900 dark:text-zinc-200 mb-1">Status Summary:</div>
                  <div>Address: {deployed?.contracts?.ValidationRegistry ? `Configured on ${networkName}` : "Unconfigured"}</div>
                  <div className="mt-2 text-zinc-500">Acts as the audit trail for policy compliance. Feeds reputation algorithms back to the TrustRegistry.</div>
                </div>
              </section>
            )}

            {/* Tab: Developer Docs */}
            {activeTab === "docs" && (
              <section className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-8 space-y-6 shadow-sm">
                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-50">Developer Documentation</h2>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    Integrating with the TrustMesh Autonomous Reputation & Settlement Protocol on Avalanche.
                  </p>
                </div>

                <div className="space-y-6 divide-y divide-zinc-200 dark:divide-zinc-800">
                  {/* Section 1: Overview */}
                  <div className="space-y-3 pt-4 first:pt-0">
                    <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">1. TrustMesh Protocol Overview</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
                      TrustMesh is an autonomous agent communication network that implements decentralized, trust-based routing for transactions and logic execution. Based on EIP-8004 specifications, agents are registered with decentralized metadata pointers (IPFS JSONs) and evaluated using real-time on-chain trust metrics.
                    </p>
                    <div className="p-4 bg-zinc-50 dark:bg-[#0E0E10] border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                      <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Supported Settlement Routing Modes:</div>
                      <ul className="text-[11px] text-zinc-650 dark:text-zinc-400 space-y-1 list-disc pl-4 leading-relaxed font-semibold">
                        <li><strong>Direct Pay (Score &ge; 70)</strong>: Micropayments are settled directly to the agent's wallet with instant finality.</li>
                        <li><strong>Escrow Secure (Score 40-69)</strong>: Payments are locked inside the commit-lock-reveal <code>EscrowVault</code> and only released upon cryptographic verification of job deliverables.</li>
                        <li><strong>Consensus Validation (Score &lt; 40)</strong>: Interactions are paused, and decentralized validator consensus is requested via the <code>ValidationRegistry</code> before funds are routed.</li>
                      </ul>
                    </div>
                  </div>

                  {/* Section 2: Deployed Addresses */}
                  <div className="space-y-3 pt-6">
                    <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">2. Deployed Smart Contract Addresses</h3>
                    <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-zinc-50/50 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800 font-bold uppercase text-[9px] text-zinc-400 dark:text-zinc-500">
                            <th className="py-2.5 px-4">Contract Name</th>
                            <th className="py-2.5 px-4">Network Address</th>
                            <th className="py-2.5 px-4">Protocol Role</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-mono text-[10px] text-zinc-600 dark:text-zinc-400">
                          <tr>
                            <td className="py-2.5 px-4 font-sans font-bold">AgentIdentityRegistry</td>
                            <td className="py-2.5 px-4 font-semibold text-[#E84142]">{deployed?.contracts?.AgentIdentityRegistry || "N/A"}</td>
                            <td className="py-2.5 px-4 font-sans text-zinc-500">EIP-8004 NFT Agent Registries & URI Registry</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-4 font-sans font-bold">ReputationRegistry</td>
                            <td className="py-2.5 px-4 font-semibold text-[#E84142]">{deployed?.contracts?.ReputationRegistry || "N/A"}</td>
                            <td className="py-2.5 px-4 font-sans text-zinc-500">EIP-8004 Feedback score mapping logs</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-4 font-sans font-bold">AgentMetricsRegistry</td>
                            <td className="py-2.5 px-4 font-semibold text-[#E84142]">{deployed?.contracts?.AgentMetricsRegistry || "N/A"}</td>
                            <td className="py-2.5 px-4 font-sans text-zinc-500">On-chain transaction volumes, counts, diversity logs</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-4 font-sans font-bold">TrustRegistry</td>
                            <td className="py-2.5 px-4 font-semibold text-[#E84142]">{deployed?.contracts?.TrustRegistry || "N/A"}</td>
                            <td className="py-2.5 px-4 font-sans text-zinc-500">Composite score calculators and reputation caching</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-4 font-sans font-bold">EscrowVault</td>
                            <td className="py-2.5 px-4 font-semibold text-[#E84142]">{deployed?.contracts?.EscrowVault || "N/A"}</td>
                            <td className="py-2.5 px-4 font-sans text-zinc-500">Commit-lock-reveal micro-payment isolation router</td>
                          </tr>
                          <tr>
                            <td className="py-2.5 px-4 font-sans font-bold">PolicyEngine</td>
                            <td className="py-2.5 px-4 font-semibold text-[#E84142]">{deployed?.contracts?.PolicyEngine || "N/A"}</td>
                            <td className="py-2.5 px-4 font-sans text-zinc-500">Tiers evaluator and human review resolver</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Section 3: SDK Integration */}
                  <div className="space-y-3 pt-6">
                    <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200">3. SDK Integration Code</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
                      To integrate trust-based agent micropayments into your own application, import `@trustmesh/sdk` and construct a transaction route.
                    </p>
                    <div className="bg-zinc-950 dark:bg-black rounded-xl border border-zinc-800 p-4 font-mono text-xs text-zinc-200 relative overflow-hidden">
                      <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase border-b border-zinc-800 pb-2 mb-2">
                        <span>TypeScript Example (micropayment_route.ts)</span>
                      </div>
                      <pre className="text-[11px] leading-relaxed overflow-x-auto pr-1 whitespace-pre">
{`import { TrustMeshClient } from "@trustmesh/sdk";

const client = new TrustMeshClient({
  rpcUrl: "https://api.avax-test.network/ext/bc/C/rpc",
  policyEngineAddress: "${deployed?.contracts?.PolicyEngine || "0x..."}",
  walletPrivateKey: "YOUR_PRIVATE_KEY"
});

// Route payment to agent EOA based on trust score
const tx = await client.routeAgentPayment({
  agentAddress: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  amountAvax: "0.05",
  serviceRequestHash: "0x123abc..."
});

console.log("Transaction executed under Tier:", tx.tier);
console.log("Tx Hash:", tx.transactionHash);`}
                      </pre>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>
      </div>

      {/* Escalation Review Modal (Tier 2 Sandbox Fallback) */}
      {activeEscalation && !activeEscalation.isComplete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#131316] border-l-4 border-l-[#E84142] border-y border-r border-zinc-200 dark:border-zinc-800 p-8 max-w-md w-full flex flex-col gap-6 relative shadow-2xl rounded-r-2xl animate-fade-in text-zinc-900 dark:text-zinc-50">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-500/10 text-[#E84142] border border-red-500/20 rounded shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-lg font-display font-bold uppercase tracking-tight">
                  Review Required: {activeEscalation.agentName}
                </h3>
                <p className="text-xs font-bold text-[#E84142] uppercase mt-1">
                  Suspicious transaction pattern flagged
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
              The policy engine routed this interaction to Tier 2 because the agent's trust score dropped below 40% (current score: <span className="text-[#E84142] font-black">{activeEscalation.score}%</span>). Manual reviewer approval is required to proceed.
            </p>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => resolveValidation(true)}
                disabled={submitting || !account}
                className="bg-zinc-900 hover:bg-zinc-950 dark:bg-zinc-50 dark:hover:bg-white text-white dark:text-zinc-950 font-extrabold py-3.5 text-xs tracking-wider uppercase rounded transition"
              >
                Approve Agent
              </button>

              <button 
                onClick={() => resolveValidation(false)}
                disabled={submitting || !account}
                className="bg-[#E84142] hover:bg-[#d63435] text-white font-extrabold py-3.5 text-xs tracking-wider uppercase rounded transition"
              >
                Reject Agent
              </button>
            </div>

            {!account && (
              <p className="text-[10px] text-center text-[#E84142] font-bold uppercase tracking-wider">
                * Wallet connection required to authorize decision
              </p>
            )}
          </div>
        </div>
      )}

      {/* ERC-8004 Agent Reputation Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto relative shadow-2xl transition-all p-6 md:p-8 space-y-6 text-zinc-900 dark:text-zinc-50">
            {/* Decorative left brand line */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#E84142] rounded-l-2xl" />

            {/* Close button */}
            <button
              onClick={() => setSelectedAgent(null)}
              className="absolute right-4 top-4 md:right-6 md:top-6 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-lg transition z-10"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header info */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-100 dark:border-zinc-900 pb-4 pr-10 sm:pr-12">
              <div className="flex items-center gap-3">
                <img 
                  src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(selectedAgent.name)}`}
                  alt={selectedAgent.name}
                  className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 shrink-0"
                />
                <div>
                  <h3 className="text-xl font-display font-extrabold uppercase tracking-tight text-zinc-900 dark:text-zinc-50 leading-tight">
                    {selectedAgent.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider
                      ${selectedAgent.score >= 70 
                        ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" 
                        : selectedAgent.score >= 40 
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" 
                          : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>
                      {selectedAgent.score >= 70 ? "HIGH TRUST" : selectedAgent.score >= 40 ? "MEDIUM TRUST" : "CRITICAL"}
                    </span>

                    {selectedAgent.sybilFlagged && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-red-500/10 text-red-500 border border-red-500/20">
                        Sybil Flagged
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-baseline gap-1 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-150 dark:border-zinc-800/50 px-4 py-2 rounded-xl">
                <span className="text-3xl font-display font-black tracking-tight text-zinc-900 dark:text-zinc-50">
                  {selectedAgent.score}
                </span>
                <span className="text-xs font-bold text-zinc-400 dark:text-zinc-500">/100</span>
              </div>
            </div>

            {/* Profile description */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-wider">
                ERC-8004 Identity Metadata
              </h4>
              <p className="text-sm text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed">
                {selectedAgent.description || "No description configured."}
              </p>
              <div className="flex flex-wrap items-center gap-1.5 pt-2">
                {(selectedAgent.capabilities || []).map((cap: string) => (
                  <span key={cap} className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 rounded-md text-[10px] font-bold font-mono">
                    {cap}
                  </span>
                ))}
              </div>
            </div>

            {/* Addresses and Registry details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/80 p-4 rounded-xl text-xs font-mono">
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase text-zinc-400">Agent Address:</div>
                <div className="font-semibold select-all break-all text-zinc-800 dark:text-zinc-300">
                  {selectedAgent.address}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-[10px] font-bold uppercase text-zinc-400">Registered Age:</div>
                <div className="font-semibold text-zinc-800 dark:text-zinc-300">
                  {selectedAgent.registrationAge || "N/A"}
                </div>
              </div>
              {selectedAgent.uri && (
                <div className="space-y-1.5 sm:col-span-2 pt-2.5 border-t border-zinc-200/50 dark:border-zinc-800/50">
                  <div className="text-[10px] font-bold uppercase text-zinc-400">ERC-8004 Metadata (IPFS/Pinata):</div>
                  <div className="font-semibold break-all text-[#E84142] hover:underline flex flex-wrap items-center gap-1.5">
                    <a 
                      href={selectedAgent.uri.startsWith("ipfs://") 
                        ? `https://ipfs.io/ipfs/${selectedAgent.uri.slice(7)}` 
                        : selectedAgent.uri} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5"
                    >
                      <span>{selectedAgent.uri}</span>
                      <span className="text-[9px] font-sans font-bold uppercase px-1.5 py-0.25 bg-[#E84142]/10 rounded border border-[#E84142]/20 normal-case tracking-normal">Open JSON</span>
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* On-chain Performance Metrics */}
            <div className="space-y-3">
              <div className="flex flex-col space-y-1">
                <h4 className="text-[11px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-wider">
                  On-Chain Performance Metrics
                </h4>
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal font-medium">
                  Real-time contract state populated via on-chain seeding & live settlement.
                </p>
              </div>
              {loadingMetrics ? (
                <div className="flex items-center gap-2 text-xs text-zinc-400 font-bold py-4">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#E84142]" />
                  Retrieving metrics from AgentMetricsRegistry...
                </div>
              ) : agentMetrics ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-[#131316] p-4 rounded-xl text-center space-y-1">
                    <div className="text-lg font-black font-mono text-zinc-900 dark:text-zinc-50">
                      ${(Number(agentMetrics.settledVolumeUsd18) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Volume Settled</div>
                  </div>
                  <div className="border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-[#131316] p-4 rounded-xl text-center space-y-1">
                    <div className="text-lg font-black font-mono text-zinc-900 dark:text-zinc-50">
                      {agentMetrics.totalSettledTransactions.toString()}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Transactions</div>
                  </div>
                  <div className="border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-[#131316] p-4 rounded-xl text-center space-y-1">
                    <div className={`text-lg font-black font-mono 
                      ${Number(agentMetrics.totalSettledTransactions) > 0 && (Number(agentMetrics.microTransactionCount) / Number(agentMetrics.totalSettledTransactions)) > 0.5 
                        ? "text-red-500" 
                        : "text-zinc-900 dark:text-zinc-50"}`}>
                      {Number(agentMetrics.totalSettledTransactions) > 0 
                        ? Math.round((Number(agentMetrics.microTransactionCount) / Number(agentMetrics.totalSettledTransactions)) * 100) 
                        : 0}%
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Micro-transactions</div>
                  </div>
                  <div className="border border-zinc-200/60 dark:border-zinc-800 bg-white dark:bg-[#131316] p-4 rounded-xl text-center space-y-1">
                    <div className="text-lg font-black font-mono text-zinc-900 dark:text-zinc-50">
                      {agentMetrics.distinctCounterpartyCount}
                    </div>
                    <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-400">Counterparties</div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-zinc-400 italic">Metrics data unavailable.</div>
              )}
            </div>

            {/* Agent Feedback Loop & Reviews */}
            <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-900">
              <h4 className="text-[11px] font-bold uppercase text-zinc-400 dark:text-zinc-500 tracking-wider">
                Agent Feedback Loop & Reviews
              </h4>
              <div className="space-y-4 max-h-[220px] overflow-y-auto pr-1">
                {loadingReviews ? (
                  <div className="flex items-center gap-2 text-xs text-zinc-400 font-bold py-4">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#E84142]" />
                    Retrieving on-chain reviews...
                  </div>
                ) : onChainReviews.length === 0 ? (
                  <div className="text-center py-8 text-zinc-400 text-xs italic bg-zinc-50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    No on-chain reviews submitted for this agent.
                  </div>
                ) : (
                  onChainReviews.map((rev: any, index: number) => (
                    <div key={index} className="border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl space-y-2 text-xs relative bg-white dark:bg-[#131316]">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-zinc-400">By {rev.reviewer}</span>
                          <div className="flex items-center text-amber-500 gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i} className={i < rev.rating ? "text-amber-400" : "text-zinc-300 dark:text-zinc-600"}>★</span>
                            ))}
                          </div>
                        </div>
                        {rev.cid && (
                          <a 
                            href={rev.cid.startsWith("http") ? rev.cid : `https://ipfs.io/ipfs/${rev.cid}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-[10px] text-[#E84142] hover:underline font-semibold font-mono"
                          >
                            IPFS Link
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-300 font-medium leading-relaxed">
                        "{rev.comment}"
                      </p>
                      {rev.tags.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {rev.tags.map((t: string) => (
                            <span key={t} className="px-1.5 py-0.5 bg-zinc-50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 rounded-md text-[9px] font-bold uppercase">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
