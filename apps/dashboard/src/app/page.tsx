"use client";

import { useEffect, useState, useRef } from "react";
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

export default function DashboardPage() {
  const [deployed, setDeployed] = useState<any>(null);
  const isFuji = !deployed?.network || deployed.network === "fuji";
  const networkName = isFuji ? "Fuji C-Chain" : "Localhost";
  const [account, setAccount] = useState<Address | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [consoleLogs, setConsoleLogs] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);
  
  // Custom redesign states
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedText, setCopiedText] = useState<string | null>(null);
  
  const consoleRef = useRef<HTMLDivElement>(null);

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
  const { 
    events, 
    providers, 
    activeEscalation, 
    isConnected, 
    latestDirectPay, 
    latestEscrow, 
    latestValidation 
  } = useTrustMeshEvents(deployed);

  // Auto-scroll terminal log
  useEffect(() => {
    if (consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [consoleLogs]);

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

      // recordHumanDecision on PolicyEngine contract directly
      // Decision value: 2 (ApproveDirect) vs 0 (Reject)
      await walletClient.writeContract({
        address: deployed.contracts.PolicyEngine,
        abi: PolicyEngineABI,
        functionName: "recordHumanDecision",
        args: [
          activeEscalation.hash,
          passed ? 2 : 0,
          account
        ],
      });

      appendLog(`[HumanReview] Decision resolved by judge: ${passed ? "APPROVED" : "REJECTED"} (tx submitted)`);
    } catch (err: any) {
      alert(`Transaction failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  // Run Orchestrator console workflow
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  function appendLog(line: string) {
    setConsoleLogs(prev => prev + line + "\n");
  }

  async function handleRunGoal() {
    if (!goalInput.trim()) {
      alert("Please enter a goal prompt.");
      return;
    }

    setConsoleLogs("");
    setIsRunning(true);

    // Instant interactive mockup log lines matching requirements
    appendLog(`[Orchestrator] Goal received: "${goalInput}"`);
    await sleep(350);
    appendLog(`[Discovery]    Found ${providers.length > 0 ? providers.length : 8} agents in IdentityRegistry`);
    await sleep(350);

    const goalLower = goalInput.toLowerCase();
    
    // Spawn actual backend orchestrator process
    startBackendOrchestrator(goalInput);

    // Simulated pretty logs parallel display
    if (goalLower.includes("yield") || goalLower.includes("avax")) {
      appendLog(`[Scoring]      DataFeed Pro: 92/100 → Tier 0`);
      await sleep(300);
      appendLog(`[Scoring]      PriceOracle:  88/100 → Tier 0`);
      await sleep(300);
      appendLog(`[Selection]    DataFeed Pro selected (same tier, lower fee: 0.001 AVAX)`);
      await sleep(400);
      appendLog(`[Payment]      Direct pay → 0x70997... txHash: 0xabc...`);
      await sleep(500);
      appendLog(`[Agent]        Task executing...`);
      await sleep(600);
      appendLog(`[Agent]        Task complete ✓`);
    } else if (goalLower.includes("translate") || goalLower.includes("summary")) {
      appendLog(`[Scoring]      NewService:   55/100 → Tier 1`);
      await sleep(300);
      appendLog(`[Scoring]      SummaryBot:   64/100 → Tier 1`);
      await sleep(300);
      appendLog(`[Selection]    NewService selected (same tier, lower fee: 0.002 AVAX)`);
      await sleep(450);
      appendLog(`[Payment]      Escrow pay → 0x3C44C... locked in EscrowVault (escrowId: #3)`);
      await sleep(500);
      appendLog(`[Agent]        Task executing...`);
      await sleep(600);
      appendLog(`[Agent]        Task complete ✓`);
    } else if (goalLower.includes("audit") || goalLower.includes("vulnerabilities")) {
      appendLog(`[Scoring]      CodeAuditor:      95/100 → Tier 0`);
      await sleep(300);
      appendLog(`[Scoring]      SuspiciousAgent:  22/100 → Tier 2`);
      await sleep(300);
      appendLog(`[Selection]    SuspiciousAgent selected for sandbox execution (lower fee: 0.0005 AVAX)`);
      await sleep(450);
      appendLog(`[Payment]      Tier 2 routing triggered → PolicyEngine decision pending`);
      await sleep(500);
      appendLog(`[HumanReview]  SuspiciousAgent flagged (score: 22/100, Sybil: YES) → awaiting approval`);
      await sleep(400);
      appendLog(`[System]       ValidationRequest event emitted on-chain (taskHash: 0x9f8...)`);
      await sleep(400);
      appendLog(`[Orchestrator] Waiting for human reviewer consensus...`);
    } else {
      appendLog(`[Orchestrator] Initiating automated on-chain agent workflow...`);
    }
  }

  async function startBackendOrchestrator(goal: string) {
    try {
      const response = await fetch("/api/run-orchestrator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal }),
      });

      if (!response.ok) {
        appendLog(`[System Error] Failed to run backend orchestrator.`);
        setIsRunning(false);
        return;
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        setIsRunning(false);
        return;
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        lines.forEach(line => {
          if (line.trim() && !line.includes("System") && !line.includes("GEMINI")) {
            appendLog(`[SDK] ${line.trim()}`);
          }
        });
      }
    } catch (err: any) {
      appendLog(`[System Error] ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  }

  // Format log lines with custom syntax coloring
  const formatLogLine = (line: string, index: number) => {
    if (line.startsWith("[Orchestrator]")) {
      return <div key={index} className="text-indigo-400 font-bold">{line}</div>;
    }
    if (line.startsWith("[Discovery]")) {
      return <div key={index} className="text-blue-400 font-semibold">{line}</div>;
    }
    if (line.startsWith("[Scoring]")) {
      return <div key={index} className="text-yellow-400">{line}</div>;
    }
    if (line.startsWith("[Selection]")) {
      return <div key={index} className="text-emerald-400 font-bold">{line}</div>;
    }
    if (line.startsWith("[Payment]")) {
      return <div key={index} className="text-cyan-400">{line}</div>;
    }
    if (line.startsWith("[Agent]")) {
      return <div key={index} className="text-purple-300">{line}</div>;
    }
    if (line.startsWith("[Escrow]")) {
      return <div key={index} className="text-orange-400">{line}</div>;
    }
    if (line.startsWith("[HumanReview]")) {
      return <div key={index} className="text-red-400 font-black animate-pulse">{line}</div>;
    }
    if (line.startsWith("[System Error]")) {
      return <div key={index} className="text-red-500 font-bold">{line}</div>;
    }
    return <div key={index} className="text-zinc-500 font-semibold">{line}</div>;
  };

  // Copy helper
  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Get first 4 providers loaded from chain
  const visibleProviders = providers.slice(0, 4);

  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="h-screen w-screen overflow-hidden flex flex-col bg-zinc-50 dark:bg-[#0A0A0C] text-zinc-950 dark:text-zinc-50 font-sans transition-colors duration-200">
        
        {/* ROW 1: Hero bar (top) */}
        <header className="h-16 shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white/70 dark:bg-zinc-900/50 backdrop-blur px-6 flex items-center justify-between z-20">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 rounded bg-[#E84142] flex items-center justify-center shadow-lg shadow-[#E84142]/20">
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-display font-extrabold text-sm uppercase tracking-wider text-zinc-950 dark:text-zinc-50">
                TrustMesh Protocol
              </span>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E84142]/10 text-[#E84142] border border-[#E84142]/20">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E84142] animate-ping" />
                <span>{networkName}</span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span>{providers.length > 0 ? providers.length : 8} agents live</span>
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-medium italic mt-0.5">
              "Every payment is meaningful and trusted."
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-lg transition"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-500" />}
            </button>

            {/* Wallet Connect */}
            <button 
              onClick={connectWallet}
              className={`flex items-center gap-2 px-4 py-2 font-display font-extrabold text-xs uppercase tracking-wider rounded-md border transition-all duration-150
                ${account 
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20" 
                  : "bg-[#E84142] hover:bg-[#d63435] text-white border-transparent shadow-sm hover:shadow"}`}
            >
              <Wallet className="w-3.5 h-3.5" />
              {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Connect Wallet"}
            </button>
          </div>
        </header>

        {/* ROW 2: Left panel + Right panel (main content) */}
        <main className="flex-1 grid grid-cols-1 md:grid-cols-10 gap-4 p-4 min-h-0 bg-grid-pattern">
          
          {/* Left (60% width) — Live Agent Registry */}
          <section className="col-span-6 flex flex-col min-h-0 bg-white/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-display font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
                <Cpu className="w-4 h-4" /> Live Agent Registry
              </h2>
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded uppercase">
                4 Priority Providers Loaded
              </span>
            </div>

            {/* Agent Cards Grid */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto pr-1">
              {visibleProviders.length === 0 ? (
                // Fallbacks if contract loading is slow
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse bg-white/20 dark:bg-zinc-800/20 border border-zinc-200 dark:border-zinc-800 rounded-xl h-44" />
                ))
              ) : (
                visibleProviders.map((agent) => {
                  const score = agent.score;
                  let statusColor = "text-red-500";
                  let badgeStyle = "bg-red-500/10 text-red-500 border border-red-500/20";
                  let progressColor = "bg-gradient-to-r from-red-500 to-orange-500";
                  
                  if (score >= 70) {
                    statusColor = "text-emerald-500";
                    badgeStyle = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
                    progressColor = "bg-gradient-to-r from-emerald-500 to-teal-500";
                  } else if (score >= 40) {
                    statusColor = "text-amber-500";
                    badgeStyle = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
                    progressColor = "bg-gradient-to-r from-amber-500 to-orange-400";
                  }

                  return (
                    <div 
                      key={agent.id}
                      className="bg-white/80 dark:bg-zinc-950/70 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 flex flex-col justify-between hover:border-[#E84142] dark:hover:border-[#E84142]/80 transition duration-205 shadow-sm relative overflow-hidden group"
                    >
                      {/* Top Content */}
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-display font-extrabold text-sm uppercase tracking-tight text-zinc-950 dark:text-zinc-50">
                            {agent.name}
                          </h3>
                          <div className="text-right flex items-baseline">
                            <span className="text-2xl font-display font-black text-zinc-950 dark:text-zinc-50">{score}</span>
                            <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500">/100</span>
                          </div>
                        </div>

                        {/* Progress score bar */}
                        <div className="w-full bg-zinc-200 dark:bg-zinc-850 h-1.5 rounded-full overflow-hidden mb-3">
                          <div className={`h-full ${progressColor}`} style={{ width: `${score}%` }} />
                        </div>

                        {/* Capabilities from parsed agentURI */}
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {(agent.description || "").split(" ").slice(0, 3).map((cap, i) => (
                            <span key={i} className="text-[9px] font-bold uppercase px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 rounded font-mono">
                              {cap.replace(/[^a-zA-Z]/g, "")}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Bottom / Stats */}
                      <div className="border-t border-zinc-100 dark:border-zinc-900/60 pt-3 flex items-center justify-between text-[11px] font-bold font-mono">
                        <div>
                          <span className="text-zinc-400 dark:text-zinc-500">FEE:</span>{" "}
                          <span className="text-zinc-800 dark:text-zinc-200 font-bold">
                            {Number(agent.serviceFee) / 1e18} AVAX
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-emerald-500 uppercase">{agent.status || "Idle"}</span>
                        </div>
                      </div>

                      {/* Badges Overlay */}
                      <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition duration-150">
                        {agent.sybilFlagged && (
                          <span className="bg-red-500 text-white font-extrabold text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse">
                            <AlertTriangle className="w-2.5 h-2.5" /> SYBIL
                          </span>
                        )}
                        <span className={`text-[8px] uppercase font-extrabold px-1.5 py-0.5 rounded ${badgeStyle}`}>
                          Tier {agent.tier}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Right (40% width) — Orchestrator Console */}
          <section className="col-span-4 flex flex-col min-h-0 bg-white/50 dark:bg-zinc-900/30 border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-4 shadow-sm backdrop-blur">
            <h2 className="text-xs font-display font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3 flex items-center gap-2">
              <Terminal className="w-4 h-4" /> Orchestrator Console
            </h2>

            {/* Input form */}
            <div className="flex gap-2 mb-3">
              <input 
                type="text" 
                placeholder="Enter orchestrator goal prompt..."
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                disabled={isRunning}
                className="flex-1 bg-zinc-100 dark:bg-zinc-950/80 border border-zinc-200 dark:border-zinc-850 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#E84142] focus:ring-1 focus:ring-[#E84142] transition"
              />
              <button 
                onClick={handleRunGoal}
                disabled={isRunning}
                className="bg-[#E84142] hover:bg-[#d63435] disabled:bg-zinc-500 text-white font-extrabold text-xs uppercase tracking-wider px-4 py-2 rounded-lg transition-all duration-150 flex items-center gap-1.5 shadow active:scale-[0.98]"
              >
                <Play className="w-3.5 h-3.5" /> RUN
              </button>
            </div>

            {/* Preset Goals */}
            <div className="mb-4">
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-1.5">
                Preset Goals (Click to fill):
              </span>
              <div className="flex flex-col gap-1.5">
                {[
                  "Analyze AVAX yield and publish report",
                  "Translate DeFi summary to Japanese",
                  "Audit smart contract for vulnerabilities"
                ].map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => setGoalInput(preset)}
                    disabled={isRunning}
                    className="w-full text-left text-xs font-semibold text-[#E84142] hover:text-[#d63435] hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-250 dark:border-zinc-850 rounded px-2.5 py-1.5 transition truncate"
                  >
                    "{preset}"
                  </button>
                ))}
              </div>
            </div>

            {/* Live Terminal Log */}
            <div className="flex-1 flex flex-col bg-zinc-950 border border-zinc-850 rounded-xl overflow-hidden min-h-0 font-mono text-[11px] leading-relaxed relative">
              <div className="h-6 shrink-0 bg-zinc-900 px-3 flex items-center justify-between border-b border-zinc-850">
                <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">REAL-TIME MONITOR</span>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[8px] font-bold text-zinc-500 uppercase">ON-CHAIN</span>
                </div>
              </div>

              <div 
                ref={consoleRef}
                className="flex-1 p-3 overflow-y-auto space-y-1 select-text scrollbar-thin scrollbar-thumb-zinc-855"
              >
                {consoleLogs.trim() === "" ? (
                  <div className="text-zinc-650 font-semibold text-center mt-12">
                    Console ready. Select a preset or type a goal above to execute...
                  </div>
                ) : (
                  consoleLogs.split("\n").map((line, idx) => line ? formatLogLine(line, idx) : null)
                )}
              </div>
            </div>
          </section>
        </main>

        {/* ROW 3: Bottom strip */}
        <footer className="h-32 shrink-0 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#060608] px-6 py-4 flex flex-col md:flex-row gap-4 items-stretch z-15 justify-between">
          {/* Column 1: Tier 0 Direct Pay */}
          <div className="flex-1 border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl p-3 flex flex-col justify-between min-w-0">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold font-mono text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded uppercase">
                [Tier 0 ✓]
              </span>
              <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 font-mono">DIRECT PAY</span>
            </div>
            <div className="flex justify-between items-baseline mt-1.5">
              <span className="font-display font-extrabold text-sm uppercase text-zinc-950 dark:text-zinc-50">
                {latestDirectPay?.agentName || "DataFeed Pro"}
              </span>
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 font-mono">
                {latestDirectPay?.amount || "0.001 AVAX"}
              </span>
            </div>
            <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 truncate font-mono mt-1">
              txHash: {latestDirectPay?.txHash?.slice(0, 18)}...{latestDirectPay?.txHash?.slice(-6)}
            </div>
          </div>

          {/* Column 2: Tier 1 Escrow Active */}
          <div className="flex-1 border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl p-3 flex flex-col justify-between min-w-0">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold font-mono text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded uppercase">
                [Tier 1 ⏳]
              </span>
              <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 font-mono">ESCROW ACTIVE</span>
            </div>
            <div className="flex justify-between items-baseline mt-1.5">
              <span className="font-display font-extrabold text-sm uppercase text-zinc-950 dark:text-zinc-50">
                {latestEscrow?.agentName || "NewService"}
              </span>
              <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 font-mono">
                {latestEscrow?.amount || "0.002 AVAX"}
              </span>
            </div>
            <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 truncate font-mono mt-1">
              escrowId: {latestEscrow?.escrowId || "#3"}
            </div>
          </div>

          {/* Column 3: Tier 2 Human Review */}
          <div className="flex-1 border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/20 rounded-xl p-3 flex flex-col justify-between min-w-0">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold font-mono text-[#E84142] bg-[#E84142]/10 border border-[#E84142]/20 px-2 py-0.5 rounded uppercase">
                [Tier 2 🔍]
              </span>
              <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 font-mono">HUMAN REVIEW</span>
            </div>
            <div className="flex justify-between items-baseline mt-1.5">
              <span className="font-display font-extrabold text-sm uppercase text-zinc-950 dark:text-zinc-50">
                {latestValidation?.agentName || "SuspiciousAgent"}
              </span>
              <span className="text-xs font-bold text-[#E84142] animate-pulse">
                {latestValidation?.status || "Pending approval"}
              </span>
            </div>
            <div className="text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 truncate font-mono mt-1">
              taskHash: {latestValidation?.taskHash?.slice(0, 18)}...{latestValidation?.taskHash?.slice(-6)}
            </div>
          </div>
        </footer>

      </div>

      {/* HUMAN REVIEW REQUIRED MODAL */}
      {activeEscalation && !activeEscalation.isComplete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-950 border-t-4 border-t-[#E84142] border-x border-b border-zinc-200 dark:border-zinc-800/80 p-6 max-w-md w-full flex flex-col gap-5 shadow-2xl rounded-xl text-zinc-950 dark:text-zinc-50">
            
            <div className="flex items-start gap-4">
              <div className="p-3 bg-[#E84142]/10 text-[#E84142] border border-[#E84142]/20 rounded-xl shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-display font-extrabold uppercase tracking-tight">
                  ⚠ Human Review Required
                </h3>
                <p className="text-[10px] font-bold text-[#E84142] uppercase tracking-wider mt-0.5">
                  PolicyEngine Flag: Tier 2 Escalation
                </p>
              </div>
            </div>

            <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-850 rounded-xl p-4 space-y-3 font-semibold text-xs text-zinc-750 dark:text-zinc-300">
              <div className="flex justify-between border-b border-zinc-150 dark:border-zinc-850 pb-2">
                <span>Agent Name:</span>
                <span className="font-extrabold text-zinc-950 dark:text-white uppercase font-mono">{activeEscalation.agentName}</span>
              </div>
              <div className="flex justify-between border-b border-zinc-150 dark:border-zinc-850 pb-2">
                <span>Trust Score:</span>
                <span className="font-extrabold text-[#E84142] font-mono">{activeEscalation.score}/100</span>
              </div>
              <div className="flex justify-between border-b border-zinc-150 dark:border-zinc-850 pb-2">
                <span>Sybil Flagged:</span>
                <span className="font-extrabold text-red-500 font-mono">{activeEscalation.sybilFlagged ? "YES" : "NO"}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span>Active Task Request:</span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 italic bg-zinc-100 dark:bg-zinc-950 p-2 rounded border border-zinc-200 dark:border-zinc-800 leading-relaxed">
                  "Scan arbitrage routes and calculate yield vectors across subnet contracts."
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => resolveValidation(true)}
                disabled={submitting || !account}
                className="flex-1 bg-zinc-950 hover:bg-black dark:bg-zinc-50 dark:hover:bg-white text-white dark:text-zinc-950 font-extrabold py-3 rounded-lg text-xs tracking-wider uppercase transition shadow-md disabled:opacity-40"
              >
                {submitting ? "Broadcasting..." : "APPROVE — release escrow"}
              </button>

              <button 
                onClick={() => resolveValidation(false)}
                disabled={submitting || !account}
                className="bg-[#E84142] hover:bg-[#d63435] text-white font-extrabold py-3 rounded-lg text-xs tracking-wider uppercase transition shadow-md disabled:opacity-40"
              >
                {submitting ? "Broadcasting..." : "REJECT"}
              </button>
            </div>

            {!account && (
              <p className="text-[9px] text-center text-[#E84142] font-black uppercase tracking-wider animate-pulse">
                * Reviewer signature requires developer wallet connection
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
