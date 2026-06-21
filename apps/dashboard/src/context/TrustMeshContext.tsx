"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
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
import { useTrustMeshEvents } from "../hooks/useTrustMeshEvents";

// Minimal ABIs to fetch initial data
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
  },
  {
    inputs: [
      { name: "requestHash", type: "bytes32" },
      { name: "decision", type: "uint8" },
      { name: "human", type: "address" }
    ],
    name: "recordHumanDecision",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function"
  }
] as const;

interface TrustMeshContextType {
  // Web3 Connection
  account: Address | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  isConnected: boolean;
  errorMessage: string | null;
  setErrorMessage: (msg: string | null) => void;
  submitting: boolean;
  
  // Contracts and Configuration
  deployed: any;
  isFuji: boolean;
  networkName: string;
  theme: "light" | "dark";
  setTheme: (t: "light" | "dark") => void;
  toggleTheme: () => void;
  sidebarOpen: boolean;
  setSidebarOpen: (o: boolean) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  copiedAgentId: number | null;
  handleCopyText: (text: string, agentId: number) => void;
  activeTab: string;
  
  // Documentations
  activeDocTopic: string;
  setActiveDocTopic: (t: string) => void;
  activeSubTopic: string;
  setActiveSubTopic: (t: string) => void;
  showDocAssistant: boolean;
  setShowDocAssistant: (s: boolean) => void;
  docAssistantMessages: Array<{ sender: "user" | "ai"; text: string }>;
  setDocAssistantMessages: React.Dispatch<React.SetStateAction<Array<{ sender: "user" | "ai"; text: string }>>>;
  docAssistantInput: string;
  setDocAssistantInput: (i: string) => void;
  isAiTyping: boolean;
  handleSendDocAssistant: () => void;

  // Real-time events & Agent profiles
  events: any[];
  providers: any[];
  setProviders: React.Dispatch<React.SetStateAction<any[]>>;
  activeEscalation: any | null;
  
  // Orchestrator Console
  orchestratorPrompt: string;
  setOrchestratorPrompt: (p: string) => void;
  executingOrchestrator: boolean;
  orchestratorLog: string;
  setOrchestratorLog: React.Dispatch<React.SetStateAction<string>>;
  logContainerRef: React.RefObject<HTMLDivElement | null>;
  handleRunOrchestrator: () => Promise<void>;
  logStartTimeRef: React.MutableRefObject<number>;
  
  // Balances & Funding
  walletBalance: string;
  orchestratorBalance: string;
  showFundModal: boolean;
  setShowFundModal: (s: boolean) => void;
  fundAmountInput: string;
  setFundAmountInput: (a: string) => void;
  fundingOrchestrator: boolean;
  fundingStatusMessage: string | null;
  fundingError: string | null;
  executeFunding: () => Promise<void>;
  refreshBalances: () => Promise<void>;

  // Reputation Modal
  selectedAgent: any | null;
  setSelectedAgent: (a: any | null) => void;
  loadingMetrics: boolean;
  agentMetrics: any | null;
  onChainReviews: any[];
  loadingReviews: boolean;
  handleOpenReputationModal: (agent: any) => Promise<void>;

  // Simulators
  calcTrustScore: number;
  setCalcTrustScore: (s: number) => void;
  calcAmount: string;
  setCalcAmount: (a: string) => void;
  escrows: any[];
  setEscrows: React.Dispatch<React.SetStateAction<any[]>>;
  validationRequests: any[];
  setValidationRequests: React.Dispatch<React.SetStateAction<any[]>>;

  // simulator handlers
  handleSimulateRelease: (id: number) => void;
  handleSimulateRefund: (id: number) => void;
  handleTriggerMockValidation: () => void;
  handleAdminResolveValidation: (hash: string, decision: "ApproveDirect" | "ApproveEscrow" | "Reject") => void;
  handleRequestService: (agentId: number) => Promise<void>;
  resolveValidation: (decision: number) => Promise<void>;
  prompts: Record<number, string>;
  setPrompts: React.Dispatch<React.SetStateAction<Record<number, string>>>;
  executingAgentId: number | null;
  executionResult: Record<number, any>;
}

const TrustMeshContext = createContext<TrustMeshContextType | undefined>(undefined);

export const useTrustMeshContext = () => {
  const context = useContext(TrustMeshContext);
  if (!context) throw new Error("useTrustMeshContext must be used within a TrustMeshProvider");
  return context;
};

export const TrustMeshProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const activeTab = pathname === "/" ? "overview" : pathname.slice(1).split("/")[0];

  const [deployed, setDeployed] = useState<any>(null);
  const isFuji = !deployed?.network || deployed.network === "fuji";
  const networkName = isFuji ? "Fuji" : "Localhost";
  const [account, setAccount] = useState<Address | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [prompts, setPrompts] = useState<Record<number, string>>({});
  const [executingAgentId, setExecutingAgentId] = useState<number | null>(null);
  const [executionResult, setExecutionResult] = useState<Record<number, any>>({});
  
  // UI states
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedAgentId, setCopiedAgentId] = useState<number | null>(null);
  const [activeDocTopic, setActiveDocTopic] = useState<string>("overview");
  const [activeSubTopic, setActiveSubTopic] = useState<string>("intro");
  
  // Docs Assistant
  const [showDocAssistant, setShowDocAssistant] = useState<boolean>(false);
  const [docAssistantMessages, setDocAssistantMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    { sender: "ai", text: "Hi! I'm the TrustMesh AI Assistant. Ask me anything about the Developer Docs!" }
  ]);
  const [docAssistantInput, setDocAssistantInput] = useState<string>("");
  const [isAiTyping, setIsAiTyping] = useState<boolean>(false);

  // Orchestrator Console
  const [orchestratorPrompt, setOrchestratorPrompt] = useState("");
  const [executingOrchestrator, setExecutingOrchestrator] = useState(false);
  const [orchestratorLog, setOrchestratorLog] = useState("");
  const logContainerRef = useRef<HTMLDivElement>(null);
  const logStartTimeRef = useRef<number>(Date.now());

  // Balance and Funding
  const [walletBalance, setWalletBalance] = useState<string>("0.0000");
  const [orchestratorBalance, setOrchestratorBalance] = useState<string>("0.0000");
  const [fundingOrchestrator, setFundingOrchestrator] = useState<boolean>(false);
  const [showFundModal, setShowFundModal] = useState<boolean>(false);
  const [fundAmountInput, setFundAmountInput] = useState<string>("0.1");
  const [fundingStatusMessage, setFundingStatusMessage] = useState<string | null>(null);
  const [fundingError, setFundingError] = useState<string | null>(null);

  // Identity Modal
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);
  const [agentMetrics, setAgentMetrics] = useState<any | null>(null);
  const [onChainReviews, setOnChainReviews] = useState<any[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Simulator
  const [calcTrustScore, setCalcTrustScore] = useState<number>(75);
  const [calcAmount, setCalcAmount] = useState<string>("0.05");

  // Escrows
  const [escrows, setEscrows] = useState([
    { id: 0, client: "0x3C44...93BC", agent: "DataFeed Pro", agentId: 1, expectedHash: "0x19dfa5392bc87ef6725890df930c78a9c1e7aef12d098e723bef329ef8a29a1b", value: "0.0010", status: "Released", timeout: "Expired" },
    { id: 1, client: "0x90F7...b906", agent: "NewService", agentId: 2, expectedHash: "0x5d9e18bca48721ef69bc872a9df67a12b9067f92023bf7a9c672b123acde1278", value: "0.0020", status: "Locked", timeout: "11h 45m remaining" },
    { id: 2, client: "0x7099...79C8", agent: "SuspiciousAgent", agentId: 3, expectedHash: "0xbe8c7d912fa6b3ef9a781be0a9df36e781bc09a3cf1209b7c8e9f2cd3a10bf88", value: "0.0005", status: "Refunded", timeout: "Expired" }
  ]);

  // Validation Requests
  const [validationRequests, setValidationRequests] = useState([
    { hash: "0x4e9ba8c1e92d04a9cfb589a1c22bc87a12b90b8c7e9f3b123ac1de782bcfa5e9", agent: "SuspiciousAgent", agentId: 3, risk: "High Micro-Tx Rate (65% pattern)", status: "Approved (Direct)", resolvedBy: "0x76d7...2498 (Admin)", date: "10 minutes ago" },
    { hash: "0x91fae2d30bc589a1c22bc87a9df67a12b907f8c92023bf7a9c672b123acde127", agent: "SuspiciousAgent", agentId: 3, risk: "Sybil Address Cluster Match", status: "Rejected & Refunded", resolvedBy: "0x76d7...2498 (Admin)", date: "1 hour ago" },
    { hash: "0xbc8877aaf2a3c7ef69bc872a9df67a12b907f9c92023bf7a9c672b123acde38a", agent: "NewService", agentId: 2, risk: "Trust Score Dropped to 38%", status: "Approved (With Escrow)", resolvedBy: "0x76d7...2498 (Admin)", date: "1 day ago" }
  ]);

  // Load configuration and theme on mount
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

    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme("dark");
    }
  }, []);

  // Sync theme with document element for Tailwind dark mode selector
  useEffect(() => {
    if (typeof window !== "undefined") {
      const root = window.document.documentElement;
      if (theme === "dark") {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
  }, [theme]);


  // Web3 Events
  const { events, providers, activeEscalation, isConnected, setProviders } = useTrustMeshEvents(deployed);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("theme", nextTheme);
  };

  const handleCopyText = (text: string, agentId: number) => {
    navigator.clipboard.writeText(text);
    setCopiedAgentId(agentId);
    setTimeout(() => setCopiedAgentId(null), 2000);
  };

  const handleSendDocAssistant = () => {
    const text = docAssistantInput.trim();
    if (!text) return;

    const newMsgs = [...docAssistantMessages, { sender: "user" as const, text }];
    setDocAssistantMessages(newMsgs);
    setDocAssistantInput("");
    setIsAiTyping(true);

    setTimeout(() => {
      let reply = "I'm here to help! The TrustMesh protocol allows secure agent micropayments via EIP-8004. Let me know if you want to know about our PolicyEngine, TrustRegistry, or EscrowVault.";
      const query = text.toLowerCase();
      if (query.includes("consensus") || query.includes("snowman")) {
        reply = "Snowman consensus is a linear, chain-based consensus protocol used on Fuji. It leverages repeated random sub-sampling to reach consensus with sub-second finality.";
      } else if (query.includes("policy")) {
        reply = "The Policy Engine (PolicyEngine.sol) checks agent reputation score. Under 40%, it routes transactions to Tier 2 (Quarantine/Admin Review). Above 70%, it routes to Tier 0 (Direct Pay). Otherwise it routes to Tier 1 (Escrow).";
      } else if (query.includes("trust") || query.includes("score")) {
        reply = "The Trust Registry (TrustRegistry.sol) dynamically computes composite scores out of 100 based on counterparty diversity, volume, and registration age. It implements a 60-second caching TTL to save gas.";
      } else if (query.includes("escrow") || query.includes("vault")) {
        reply = "The Escrow Vault (EscrowVault.sol) implements a commit-lock-reveal pattern. Payer locks AVAX with a hash, and the agent must present the matching pre-image deliverable on-chain to claim it.";
      } else if (query.includes("sandbox") || query.includes("subnet") || query.includes("l1")) {
        reply = "You can run a local sandbox using 'avalanche network clean --hard' and 'avalanche blockchain deploy trustmesh --local'. Then run 'npm run l1:setup' to seed reputations and review data.";
      } else if (query.includes("github") || query.includes("repo")) {
        reply = "The codebase is hosted at https://github.com/Soujanya-Mctrl/TrustMesh-protocol. It is structured as a monorepo containing contracts, sdk, dashboard, and agent services.";
      }
      setDocAssistantMessages(prev => [...prev, { sender: "ai" as const, text: reply }]);
      setIsAiTyping(false);
    }, 600);
  };

  const handleSimulateRelease = (id: number) => {
    setEscrows(prev => prev.map(esc => esc.id === id ? { ...esc, status: "Released", timeout: "Expired" } : esc));
  };

  const handleSimulateRefund = (id: number) => {
    setEscrows(prev => prev.map(esc => esc.id === id ? { ...esc, status: "Refunded", timeout: "Expired" } : esc));
  };

  const handleTriggerMockValidation = () => {
    const mockHashes = [
      "0xab774c100bc87ef6725890df930c78a9c1e7aef12d098e723bef329ef8a29a3c",
      "0x89fd18bca48721ef69bc872a9df67a12b9067f92023bf7a9c672b123acde1278",
      "0x55aa7d912fa6b3ef9a781be0a9df36e781bc09a3cf1209b7c8e9f2cd3a10bf11"
    ];
    const randomHash = mockHashes[Math.floor(Math.random() * mockHashes.length)];
    const newReq = {
      hash: randomHash,
      agent: "SuspiciousAgent",
      agentId: 3,
      risk: "Reputation score 22% (below threshold)",
      status: "Quarantined",
      resolvedBy: "Pending Admin Audit",
      date: "Just now"
    };
    if (!validationRequests.some(r => r.hash === randomHash)) {
      setValidationRequests(prev => [newReq, ...prev]);
    }
  };

  const handleAdminResolveValidation = (hash: string, decision: "ApproveDirect" | "ApproveEscrow" | "Reject") => {
    setValidationRequests(prev => prev.map(req => {
      if (req.hash === hash) {
        let status = "Quarantined";
        if (decision === "ApproveDirect") status = "Approved (Direct)";
        else if (decision === "ApproveEscrow") status = "Approved (With Escrow)";
        else if (decision === "Reject") status = "Rejected & Refunded";
        return {
          ...req,
          status,
          resolvedBy: "0x76d7...2498 (Admin)"
        };
      }
      return req;
    }));
  };

  async function fetchBalances(connectedAccount: Address | null) {
    if (!deployed) return;
    try {
      const isFuji = !deployed.network || deployed.network === "fuji";
      const rpcUrl = isFuji ? "https://api.avax-test.network/ext/bc/C/rpc" : "http://127.0.0.1:8545";
      const chain = isFuji ? avalancheFuji : hardhat;
      const client = createPublicClient({
        chain,
        transport: http(rpcUrl),
      });

      if (connectedAccount) {
        const bal = await client.getBalance({ address: connectedAccount });
        setWalletBalance((Number(bal) / 1e18).toFixed(4));
      } else {
        setWalletBalance("0.0000");
      }

      const orchestratorAddress = "0x76d77c42A5CC94b81B7954aD31336E49aeaa2498";
      const orchBal = await client.getBalance({ address: orchestratorAddress });
      setOrchestratorBalance((Number(orchBal) / 1e18).toFixed(4));
    } catch (err) {
      console.warn("Failed to fetch balances:", err);
    }
  }

  const refreshBalances = async () => {
    await fetchBalances(account);
  };

  async function executeFunding() {
    if (!account) {
      setFundingError("Please connect your wallet first.");
      return;
    }
    const amountStr = fundAmountInput.trim();
    if (!amountStr) {
      setFundingError("Please enter a valid amount.");
      return;
    }
    const amount = Number(amountStr);
    if (isNaN(amount) || amount <= 0) {
      setFundingError("Please enter a valid positive amount.");
      return;
    }
    if (amount > Number(walletBalance)) {
      setFundingError("Insufficient wallet balance.");
      return;
    }

    setFundingOrchestrator(true);
    setFundingError(null);
    setFundingStatusMessage("Initiating transfer transaction in your wallet...");

    try {
      const isFuji = !deployed.network || deployed.network === "fuji";
      const chain = isFuji ? avalancheFuji : hardhat;
      const walletClient = createWalletClient({
        account,
        chain,
        transport: custom(window.ethereum),
      });

      const orchestratorAddress = "0x76d77c42A5CC94b81B7954aD31336E49aeaa2498";
      const txHash = await walletClient.sendTransaction({
        to: orchestratorAddress,
        value: parseEther(amountStr),
      });

      setFundingStatusMessage(`Transaction submitted: ${txHash.slice(0, 8)}...${txHash.slice(-6)}. Waiting for confirmation...`);

      const rpcUrl = isFuji ? "https://api.avax-test.network/ext/bc/C/rpc" : "http://127.0.0.1:8545";
      const publicClient = createPublicClient({
        chain,
        transport: http(rpcUrl),
      });
      await publicClient.waitForTransactionReceipt({ hash: txHash });

      setFundingStatusMessage("Orchestrator funded successfully!");
      fetchBalances(account);
      setTimeout(() => {
        setShowFundModal(false);
        setFundingStatusMessage(null);
      }, 1500);
    } catch (err: any) {
      setFundingError(`Funding failed: ${err.message || err}`);
      setFundingStatusMessage(null);
    } finally {
      setFundingOrchestrator(false);
    }
  }

  useEffect(() => {
    if (deployed) {
      fetchBalances(account);
      const interval = setInterval(() => fetchBalances(account), 8000);
      return () => clearInterval(interval);
    }
  }, [account, deployed]);

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
      if (address) {
        fetchBalances(address);
      }
    } catch (err: any) {
      alert(`Wallet connection failed: ${err.message}`);
    }
  }

  function disconnectWallet() {
    setAccount(null);
    setWalletBalance("0.0000");
  }

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

    logStartTimeRef.current = Date.now();
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
        [agentId]: { status: `Processing payment for ${meta.name} via ${tier === 0 ? "Direct Pay" : tier === 1 ? "Escrow" : "Admin Review"}...` } 
      }));

      if (tier === 0) {
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
        setExecutionResult(prev => ({ ...prev, [agentId]: { status: "Securing funds..." } }));
        
        const quoteRes = await fetch(serviceUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ serviceRequest: { type: "quote", prompt } }),
        });
        const quote = await quoteRes.json();
        const deliverableHash = quote.deliverableHash;

        if (!deliverableHash) throw new Error("Agent failed to return deliverable hash");

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
        setExecutionResult(prev => ({ ...prev, [agentId]: { status: "Initiating Policy Engine evaluation..." } }));
        
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

  async function resolveValidation(decision: number) {
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

      const decisionHash = await walletClient.writeContract({
        address: deployed.contracts.PolicyEngine,
        abi: PolicyEngineABI,
        functionName: "recordHumanDecision",
        args: [
          activeEscalation.hash,
          decision,
          account
        ],
      });

      const rpcUrl = isFuji ? "https://api.avax-test.network/ext/bc/C/rpc" : "http://127.0.0.1:8545";
      const publicClient = createPublicClient({
        chain: isFuji ? avalancheFuji : hardhat,
        transport: http(rpcUrl),
      });
      await publicClient.waitForTransactionReceipt({ hash: decisionHash });

      const rating = decision === 2 ? 5n : decision === 1 ? 4n : 1n;
      const tag1 = decision === 2 ? "direct-approved" : decision === 1 ? "escrow-approved" : "rejected";
      
      const repABI = parseAbi([
        "function giveFeedback(uint256 agentId, int128 value, uint8 valueDecimals, string calldata tag1, string calldata tag2, string calldata endpoint, string calldata feedbackURI, bytes32 feedbackHash) external"
      ]);
      
      const feedbackTxHash = await walletClient.writeContract({
        address: deployed.contracts.ReputationRegistry,
        abi: repABI,
        functionName: "giveFeedback",
        args: [
          BigInt(activeEscalation.agentId),
          rating,
          0,
          tag1,
          "",
          "",
          "",
          activeEscalation.hash
        ]
      });
      await publicClient.waitForTransactionReceipt({ hash: feedbackTxHash });

      const providerAddress = providers.find(p => p.id === activeEscalation.agentId)?.address;
      if (providerAddress) {
        const trustABI = parseAbi([
          "function getCompositeScore(address agentAddress) external returns (uint8 score, bool unregistered, bool sybilFlagged, uint32 cachedAt)"
        ]);
        const bustTxHash = await walletClient.writeContract({
          address: deployed.contracts.TrustRegistry,
          abi: trustABI,
          functionName: "getCompositeScore",
          args: [providerAddress]
        });
        await publicClient.waitForTransactionReceipt({ hash: bustTxHash });
      }

      alert(`Validation resolved and reputation updated!`);
    } catch (err: any) {
      alert(`Transaction failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  // Auto-scroll logic container on stream updates
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [orchestratorLog, events]);

  return (
    <TrustMeshContext.Provider value={{
      account,
      connectWallet,
      disconnectWallet,
      isConnected,
      errorMessage,
      setErrorMessage,
      submitting,
      
      deployed,
      isFuji,
      networkName,
      theme,
      setTheme,
      toggleTheme,
      sidebarOpen,
      setSidebarOpen,
      searchQuery,
      setSearchQuery,
      copiedAgentId,
      handleCopyText,
      activeTab,
      
      activeDocTopic,
      setActiveDocTopic,
      activeSubTopic,
      setActiveSubTopic,
      showDocAssistant,
      setShowDocAssistant,
      docAssistantMessages,
      setDocAssistantMessages,
      docAssistantInput,
      setDocAssistantInput,
      isAiTyping,
      handleSendDocAssistant,

      events,
      providers,
      setProviders,
      activeEscalation,
      
      orchestratorPrompt,
      setOrchestratorPrompt,
      executingOrchestrator,
      orchestratorLog,
      setOrchestratorLog,
      logContainerRef,
      handleRunOrchestrator,
      logStartTimeRef,
      
      walletBalance,
      orchestratorBalance,
      showFundModal,
      setShowFundModal,
      fundAmountInput,
      setFundAmountInput,
      fundingOrchestrator,
      fundingStatusMessage,
      fundingError,
      executeFunding,
      refreshBalances,

      selectedAgent,
      setSelectedAgent,
      loadingMetrics,
      agentMetrics,
      onChainReviews,
      loadingReviews,
      handleOpenReputationModal,

      calcTrustScore,
      setCalcTrustScore,
      calcAmount,
      setCalcAmount,
      escrows,
      setEscrows,
      validationRequests,
      setValidationRequests,

      handleSimulateRelease,
      handleSimulateRefund,
      handleTriggerMockValidation,
      handleAdminResolveValidation,
      handleRequestService,
      resolveValidation,
      prompts,
      setPrompts,
      executingAgentId,
      executionResult
    }}>
      {children}
    </TrustMeshContext.Provider>
  );
};
