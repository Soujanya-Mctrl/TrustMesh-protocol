"use client";

import { useEffect, useState } from "react";
import { 
  createPublicClient, 
  createWalletClient, 
  custom, 
  http, 
  formatEther, 
  type Address 
} from "viem";
import { avalancheFuji, hardhat } from "viem/chains";
import { 
  Shield, 
  Activity, 
  AlertTriangle, 
  Wallet, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ExternalLink,
  Star,
  Clock
} from "lucide-react";

// Minimal ABIs to fetch data
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

const ReputationRegistryABI = [
  {
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddresses", type: "address[]" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" }
    ],
    name: "getSummary",
    outputs: [
      { name: "count", type: "uint64" },
      { name: "summaryValue", type: "int128" },
      { name: "summaryValueDecimals", type: "uint8" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddress", type: "address" },
      { name: "feedbackIndex", type: "uint64" }
    ],
    name: "readFeedback",
    outputs: [
      { name: "value", type: "int128" },
      { name: "valueDecimals", type: "uint8" },
      { name: "tag1", type: "string" },
      { name: "tag2", type: "string" },
      { name: "isRevoked", type: "bool" }
    ],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [{ name: "agentId", type: "uint256" }],
    name: "getClients",
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
    type: "function"
  },
  {
    inputs: [
      { name: "agentId", type: "uint256" },
      { name: "clientAddress", type: "address" }
    ],
    name: "getLastIndex",
    outputs: [{ name: "", type: "uint64" }],
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

const AgentMetricsRegistryABI = [
  {
    inputs: [{ name: "agent", type: "address" }],
    name: "getMetrics",
    outputs: [
      {
        components: [
          { name: "settledVolumeUsd18", type: "uint256" },
          { name: "totalSettledTransactions", type: "uint64" },
          { name: "microTransactionCount", type: "uint64" },
          { name: "distinctCounterpartyCount", type: "uint32" }
        ],
        name: "",
        type: "tuple"
      }
    ],
    stateMutability: "view",
    type: "function"
  }
] as const;

interface AgentState {
  id: number;
  name: string;
  address: Address;
  description: string;
  score: number;
  unregistered: boolean;
  sybilFlagged: boolean;
  settledVolume: string;
  txCount: number;
  microTxCount: number;
  counterparties: number;
  feedbackCount: number;
  averageRating: number;
}

const AGENTS_METADATA = [
  {
    id: 1,
    name: "DataFeed Pro",
    address: "0x70997970C51812dc3A010C7d01b50e0d17dc79C8" as Address,
    description: "Premium high-frequency market data feed provider."
  },
  {
    id: 2,
    name: "NewService",
    address: "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC" as Address,
    description: "Recently launched localization and translation service."
  },
  {
    id: 3,
    name: "SuspiciousAgent",
    address: "0x90F79bf6EB2c4f870365E785982E1f101E93b906" as Address,
    description: "Algorithmic trader performing arbitrage and analysis."
  }
];

// Seeded pending review details
const PENDING_VALIDATION_HASH = "0x9f8e7d6c5b4a3f2e1d0c9b8a7f6e5d4c3b2a1f0e9d8c7b6a5f4e3d2c1b0a9f8e" as `0x${string}`;

export default function DashboardPage() {
  const [deployed, setDeployed] = useState<any>(null);
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [pendingValidation, setPendingValidation] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [account, setAccount] = useState<Address | null>(null);
  const [networkType, setNetworkType] = useState<string>("localhost");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load deployed addresses from api
  useEffect(() => {
    async function loadAddresses() {
      try {
        const res = await fetch("/api/addresses");
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setDeployed(data);
      } catch (err: any) {
        setErrorMessage(`Addresses file error: ${err.message}`);
        setLoading(false);
      }
    }
    loadAddresses();
  }, []);

  // Fetch all contract states
  async function fetchBlockchainData() {
    if (!deployed) return;
    setLoading(true);
    setErrorMessage(null);

    try {
      const isFuji = deployed.network === "fuji" || window.ethereum !== undefined; 
      setNetworkType(deployed.network ?? "localhost");

      // Setup Public Client
      const rpcUrl = deployed.network === "fuji" 
        ? "https://api.avax-test.network/ext/bc/C/rpc"
        : "http://127.0.0.1:8545";

      const chain = deployed.network === "fuji" ? avalancheFuji : hardhat;
      const client = createPublicClient({
        chain,
        transport: http(rpcUrl),
      });

      // 1. Fetch Agents metrics, scores, reviews
      const updatedAgents: AgentState[] = [];
      const allFeedback: any[] = [];

      for (const meta of AGENTS_METADATA) {
        // Read Trust Score
        let score = 100;
        let sybilFlagged = false;
        let unregistered = false;

        try {
          const cached = await client.readContract({
            address: deployed.contracts.TrustRegistry,
            abi: TrustRegistryABI,
            functionName: "getCachedScore",
            args: [meta.address],
          });
          score = Number(cached[0]);
          unregistered = cached[1];
          sybilFlagged = cached[2];
        } catch (err) {
          console.warn(`Failed reading score for ${meta.name}`, err);
        }

        // Read metrics
        let settledVolume = "0";
        let txCount = 0;
        let microTxCount = 0;
        let counterparties = 0;

        try {
          const m = await client.readContract({
            address: deployed.contracts.AgentMetricsRegistry,
            abi: AgentMetricsRegistryABI,
            functionName: "getMetrics",
            args: [meta.address],
          });
          settledVolume = formatEther(m.settledVolumeUsd18);
          txCount = Number(m.totalSettledTransactions);
          microTxCount = Number(m.microTransactionCount);
          counterparties = m.distinctCounterpartyCount;
        } catch (err) {
          console.warn(`Failed reading metrics for ${meta.name}`, err);
        }

        // Read reputation summary
        let feedbackCount = 0;
        let averageRating = 0;

        try {
          const summary = await client.readContract({
            address: deployed.contracts.ReputationRegistry,
            abi: ReputationRegistryABI,
            functionName: "getSummary",
            args: [BigInt(meta.id), [], "", ""],
          });
          feedbackCount = Number(summary[0]);
          averageRating = Number(summary[1]);
        } catch (err) {
          console.warn(`Failed reading reputation for ${meta.name}`, err);
        }

        // Fetch detailed feedback entries for feedback feed
        try {
          const clients = await client.readContract({
            address: deployed.contracts.ReputationRegistry,
            abi: ReputationRegistryABI,
            functionName: "getClients",
            args: [BigInt(meta.id)]
          }) as Address[];

          for (const cl of clients) {
            const lastIdx = await client.readContract({
              address: deployed.contracts.ReputationRegistry,
              abi: ReputationRegistryABI,
              functionName: "getLastIndex",
              args: [BigInt(meta.id), cl]
            }) as bigint;

            for (let f = 1n; f <= lastIdx; f++) {
              const fb = await client.readContract({
                address: deployed.contracts.ReputationRegistry,
                abi: ReputationRegistryABI,
                functionName: "readFeedback",
                args: [BigInt(meta.id), cl, f]
              }) as any;

              if (!fb[4]) { // not revoked
                allFeedback.push({
                  agentName: meta.name,
                  client: cl,
                  rating: Number(fb[0]),
                  tag: fb[2],
                  comment: fb[3],
                });
              }
            }
          }
        } catch (err) {
          console.warn(`Failed detailed reviews fetch for ${meta.name}`, err);
        }

        updatedAgents.push({
          ...meta,
          score,
          unregistered,
          sybilFlagged,
          settledVolume,
          txCount,
          microTxCount,
          counterparties,
          feedbackCount,
          averageRating
        });
      }

      setAgents(updatedAgents);
      setReviews(allFeedback);

      // 2. Fetch pending validation request dynamically for PolicyEngine
      try {
        const requests = await client.readContract({
          address: deployed.contracts.ValidationRegistry,
          abi: [
            {
              inputs: [{ name: "validatorAddress", type: "address" }],
              name: "getValidatorRequests",
              outputs: [{ name: "requestHashes", type: "bytes32[]" }],
              stateMutability: "view",
              type: "function"
            }
          ] as const,
          functionName: "getValidatorRequests",
          args: [deployed.contracts.PolicyEngine],
        }) as `0x${string}`[];

        let activeHash = PENDING_VALIDATION_HASH;
        let isComplete = false;

        // Loop from the end to find the first incomplete one
        for (let idx = requests.length - 1; idx >= 0; idx--) {
          const rHash = requests[idx];
          const complete = await client.readContract({
            address: deployed.contracts.ValidationRegistry,
            abi: ValidationRegistryABI,
            functionName: "isValidationComplete",
            args: [rHash],
          }) as boolean;

          if (!complete) {
            activeHash = rHash;
            isComplete = false;
            break;
          }
        }

        // If no incomplete requests, just show the latest request
        if (requests.length > 0 && activeHash === PENDING_VALIDATION_HASH) {
          const latestHash = requests[requests.length - 1];
          const complete = await client.readContract({
            address: deployed.contracts.ValidationRegistry,
            abi: ValidationRegistryABI,
            functionName: "isValidationComplete",
            args: [latestHash],
          }) as boolean;
          activeHash = latestHash;
          isComplete = complete;
        }

        const valStatus = await client.readContract({
          address: deployed.contracts.ValidationRegistry,
          abi: ValidationRegistryABI,
          functionName: "getValidationStatus",
          args: [activeHash],
        }) as any;

        setPendingValidation({
          hash: activeHash,
          validator: valStatus[0],
          agentId: Number(valStatus[1]),
          response: valStatus[2],
          lastUpdate: Number(valStatus[5]),
          isComplete,
        });
      } catch (err) {
        console.warn("Failed reading pending validation status", err);
      }

    } catch (err: any) {
      setErrorMessage(`Network connection error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (deployed) {
      fetchBlockchainData();
    }
  }, [deployed]);

  // Connect Web3 Wallet
  async function connectWallet() {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("Please install MetaMask or another Web3 wallet provider.");
      return;
    }

    try {
      const client = createWalletClient({
        chain: deployed?.network === "fuji" ? avalancheFuji : hardhat,
        transport: custom(window.ethereum),
      });

      const [address] = await client.requestAddresses();
      setAccount(address || null);
    } catch (err: any) {
      alert(`Wallet connection failed: ${err.message}`);
    }
  }

  // Resolve Human Review validation response
  async function resolveValidation(passed: boolean) {
    if (!account) {
      alert("Please connect your wallet first.");
      return;
    }
    if (!deployed) return;

    setSubmitting(true);
    try {
      // Connect as Wallet Client
      const walletClient = createWalletClient({
        account,
        chain: deployed.network === "fuji" ? avalancheFuji : hardhat,
        transport: custom(window.ethereum),
      });

      // Submit on-chain response
      const scoreResponse = passed ? 100 : 0;
      console.log(`Submitting validation response: ${scoreResponse}`);

      const hash = await walletClient.writeContract({
        address: deployed.contracts.ValidationRegistry,
        abi: ValidationRegistryABI,
        functionName: "validationResponse",
        args: [
          pendingValidation.hash,
          scoreResponse,
          "",
          "0x0000000000000000000000000000000000000000000000000000000000000000",
          passed ? "APPROVED" : "REJECTED"
        ],
      });

      alert(`Validation transaction submitted! Hash: ${hash}`);

      // Wait 3 seconds and reload status
      setTimeout(() => {
        fetchBlockchainData();
        setSubmitting(false);
      }, 4000);

    } catch (err: any) {
      alert(`Transaction failed: ${err.message}`);
      setSubmitting(false);
    }
  }

  // Helper to color scores
  function getScoreColorClass(score: number): string {
    if (score >= 70) return "text-emerald-400 border-emerald-500 bg-emerald-500/10";
    if (score >= 40) return "text-amber-400 border-amber-500 bg-amber-500/10";
    return "text-rose-400 border-rose-500 bg-rose-500/10";
  }

  return (
    <div className="min-h-screen p-6 md:p-12 max-w-7xl mx-auto flex flex-col gap-8">
      {/* Header bar */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-sky-950/40 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3">
            <Shield className="w-8 h-8 text-sky-400 animate-pulse" />
            <span className="gradient-text">TrustMesh</span> Dashboard
          </h1>
          <p className="text-slate-400 text-sm mt-1">ERC-8004 Agent Trust Engine & Policy Registry</p>
        </div>

        <div className="flex items-center gap-3 self-stretch md:self-auto justify-end">
          <div className="badge badge-green">
            <Activity className="w-3.5 h-3.5" />
            Connected Network: {networkType.toUpperCase()}
          </div>

          <button 
            onClick={connectWallet}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <Wallet className="w-4 h-4 text-sky-400" />
            {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Connect Wallet"}
          </button>

          <button 
            onClick={fetchBlockchainData}
            disabled={loading}
            className="p-2.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition text-sky-400"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      {errorMessage && (
        <div className="glass-card border-rose-500/30 bg-rose-500/5 text-rose-300 p-4 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="text-sm">{errorMessage}</div>
        </div>
      )}

      {/* Global stats overview */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in delay-1">
        <div className="glass-card flex items-center gap-5">
          <div className="p-4 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Settled Volume</div>
            <div className="text-2xl font-bold mt-1 text-sky-300">
              ${agents.reduce((sum, a) => sum + parseFloat(a.settledVolume), 0).toLocaleString(undefined, {maximumFractionDigits:2})} USD
            </div>
          </div>
        </div>

        <div className="glass-card flex items-center gap-5">
          <div className="p-4 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Escrow Count</div>
            <div className="text-2xl font-bold mt-1 text-purple-300">
              {agents.reduce((sum, a) => sum + a.txCount, 0)} Transactions
            </div>
          </div>
        </div>

        <div className="glass-card flex items-center gap-5">
          <div className="p-4 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Active Sybil Flags</div>
            <div className="text-2xl font-bold mt-1 text-amber-300">
              {agents.filter(a => a.sybilFlagged).length} Registered Alerts
            </div>
          </div>
        </div>
      </section>

      {/* Agents Identity Grid */}
      <section className="flex flex-col gap-4 animate-fade-in delay-2">
        <h2 className="text-xl font-bold text-slate-200">Registered Autonomous Agents</h2>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {loading && agents.length === 0 ? (
            <div className="col-span-3 text-center py-12 text-slate-400">Loading agent credentials from registries...</div>
          ) : (
            agents.map((agent) => (
              <article key={agent.id} className="glass-card flex flex-col justify-between gap-6 relative overflow-hidden">
                {agent.sybilFlagged && (
                  <div className="absolute top-0 right-0 left-0 bg-rose-500/10 border-b border-rose-500/20 py-1.5 px-4 text-rose-300 text-xs font-semibold flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                    High Sybil Risk Detected (Suspicious Micro-Transactions)
                  </div>
                )}

                <div className={`flex justify-between items-start gap-4 ${agent.sybilFlagged ? "mt-6" : ""}`}>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100">{agent.name}</h3>
                    <p className="text-xs text-slate-400 mt-1">{agent.description}</p>
                  </div>

                  <div className={`w-14 h-14 rounded-full border-2 flex flex-col items-center justify-center font-bold text-lg shrink-0 ${getScoreColorClass(agent.score)}`}>
                    {agent.score}%
                    <span className="text-[8px] font-medium tracking-tight text-slate-400">Trust</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2.5 bg-slate-950/40 p-4 rounded-xl border border-white/5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Agent Wallet:</span>
                    <span className="font-mono text-slate-300">{`${agent.address.slice(0, 8)}...${agent.address.slice(-6)}`}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Settled Volume:</span>
                    <span className="font-semibold text-sky-400">${parseFloat(agent.settledVolume).toLocaleString()} USD</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Total Transactions:</span>
                    <span className="font-semibold text-slate-300">{agent.txCount} ({agent.microTxCount} micro)</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Distinct Counterparties:</span>
                    <span className="font-semibold text-slate-300">{agent.counterparties}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Feedback Count:</span>
                    <span className="font-semibold text-slate-300">{agent.feedbackCount} reviews</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <a 
                    href={`https://testnet.snowtrace.io/address/${agent.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary text-xs flex-1 justify-center py-2 hover:text-sky-300"
                  >
                    Explorer <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {/* Human in the loop reviews & Feedbacks */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in delay-3">
        {/* Human Reviews review panel */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-slate-200">Policy Engine Review Queue</h2>
          
          {pendingValidation ? (
            <div className="glass-card flex flex-col justify-between gap-6 border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start gap-4">
                <div className="p-3.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                  <Clock className="w-6 h-6 animate-pulse" />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-slate-100">Review Required: SuspiciousAgent</h3>
                    <span className={`badge ${pendingValidation.isComplete ? "badge-green" : "badge-amber"}`}>
                      {pendingValidation.isComplete ? "COMPLETE" : "PENDING REVIEW"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1.5">
                    The policy engine routed this agent to Tier 2 (Human Verification Required) because its trust score dropped below 40% (current: 24%) due to suspected Sybil behavior.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col gap-2 font-mono text-xs text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Request Hash:</span>
                  <span className="text-sky-400 truncate ml-4" title={pendingValidation.hash}>{pendingValidation.hash}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Designated Reviewer:</span>
                  <span className="truncate ml-4">{pendingValidation.validator}</span>
                </div>
                {pendingValidation.isComplete && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Resolution Score:</span>
                    <span className={pendingValidation.response === 100 ? "text-emerald-400" : "text-rose-400"}>
                      {pendingValidation.response} ({pendingValidation.response === 100 ? "APPROVED" : "REJECTED"})
                    </span>
                  </div>
                )}
              </div>

              {!pendingValidation.isComplete ? (
                <div className="flex flex-col sm:flex-row gap-3">
                  <button 
                    onClick={() => resolveValidation(true)}
                    disabled={submitting || !account}
                    className="btn-primary flex-1 justify-center py-3 bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-500/20"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve Agent
                  </button>

                  <button 
                    onClick={() => resolveValidation(false)}
                    disabled={submitting || !account}
                    className="btn-primary flex-1 justify-center py-3 bg-gradient-to-r from-rose-500 to-red-600 shadow-rose-500/20"
                  >
                    <XCircle className="w-4 h-4" /> Reject Agent
                  </button>
                </div>
              ) : (
                <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" /> This validation request has been successfully resolved on-chain!
                </div>
              )}

              {!account && !pendingValidation.isComplete && (
                <p className="text-[10px] text-center text-rose-400 font-medium">
                  * Connect your wallet (MetaMask) to sign and broadcast the review decision.
                </p>
              )}
            </div>
          ) : (
            <div className="glass-card text-center py-12 text-slate-400 text-sm border border-dashed border-sky-950/60">
              No validation alerts in queue. System is fully healthy.
            </div>
          )}
        </div>

        {/* Reputation reviews feed */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold text-slate-200">Live Agent Feedback Logs</h2>
          <div className="glass-card flex flex-col gap-4 max-h-[360px] overflow-y-auto pr-2">
            {reviews.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-sm">No reviews submitted on-chain yet.</div>
            ) : (
              reviews.map((rev, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-950/40 border border-white/5 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{rev.agentName}</span>
                      <span className="text-[10px] text-slate-400 font-mono">from {rev.client.slice(0, 6)}...</span>
                    </div>

                    <div className="flex gap-0.5 text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3 h-3 ${i < rev.rating ? "fill-amber-400" : "text-slate-600"}`} 
                        />
                      ))}
                    </div>
                  </div>

                  <p className="text-xs text-slate-300">"{rev.comment || "No comment provided."}"</p>
                  
                  {rev.tag && (
                    <div className="flex gap-1.5 flex-wrap mt-1">
                      {rev.tag.split(",").map((t: string, i: number) => (
                        <span key={i} className="text-[9px] bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2 py-0.5 rounded">
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
      </section>
    </div>
  );
}
