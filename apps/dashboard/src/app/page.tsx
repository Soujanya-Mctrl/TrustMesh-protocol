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
  Cpu
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

      const tier = meta.tier;
      const amount = agentId === 1 ? parseEther("0.001") : agentId === 2 ? parseEther("0.002") : parseEther("0.0005");
      const serviceUrl = agentId === 1 ? "http://localhost:3001/request-service" : agentId === 2 ? "http://localhost:3002/request-service" : "http://localhost:3003/request-service";

      setExecutionResult(prev => ({ 
        ...prev, 
        [agentId]: { status: `Processing payment for ${meta.name} (Tier ${tier})...` } 
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
                <span className="font-display font-bold text-sm uppercase tracking-wider text-zinc-900 dark:text-zinc-50 truncate">
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
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850"}`}
                >
                  <Cpu className="w-4 h-4" />
                  {sidebarOpen && <span>Overview Dashboard</span>}
                </button>
                <button 
                  onClick={() => setActiveTab("faucet")}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold tracking-tight transition-all
                    ${activeTab === "faucet" 
                      ? "bg-[#E84142]/10 text-[#E84142] dark:bg-[#E84142]/20" 
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850"}`}
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
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850"}`}
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
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850"}`}
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
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850"}`}
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
                <a 
                  href="https://build.avax.network/docs" 
                  target="_blank" 
                  rel="noreferrer"
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold tracking-tight text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850"
                >
                  <HelpCircle className="w-4 h-4" />
                  {sidebarOpen && <span>Developer Docs</span>}
                  <ExternalLink className="w-3 h-3 ml-auto opacity-50 shrink-0" />
                </a>
              </div>
            </div>
          </nav>

          {/* Sidebar Footer Utility */}
          <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
            <button 
              onClick={toggleTheme}
              className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-850 transition"
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
                      Securing micro-payment and task execution routes on the {isFuji ? "Avalanche Fuji Testnet" : "Local Hardhat Network"}. Using an automated multi-tier architecture, agents are locked into escrows or direct settled depending on real-time reputation scores.
                    </p>
                  </div>

                  <div className="flex gap-6 shrink-0 border-l border-zinc-200 dark:border-zinc-800 pl-6 hidden md:flex">
                    <div className="text-center">
                      <div className="text-xl font-extrabold text-zinc-900 dark:text-zinc-50">3</div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Agents</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-extrabold text-[#E84142]">{networkName}</div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mt-1">Chain</div>
                    </div>
                  </div>
                </section>

                {/* Service Providers Grid */}
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {filteredProviders.length === 0 ? (
                      <div className="col-span-3 text-center py-16 text-zinc-500 font-medium border border-dashed border-zinc-200 dark:border-zinc-800/80 rounded-2xl bg-white dark:bg-[#131316]">
                        {providers.length === 0 ? "Loading registry credential state..." : "No agents found matching search query."}
                      </div>
                    ) : (
                      filteredProviders.map((agent) => {
                        const score = agent.score;
                        let statusText = "CRITICAL / AUDIT REQUIRED";
                        let badgeStyle = "bg-red-500/10 text-red-500 border border-red-500/20";
                        let iconColor = "text-red-500";
                        let iconBg = "bg-red-50 dark:bg-red-500/10 border-red-100 dark:border-red-500/20";
                        let agentIcon = <AlertTriangle className="w-5 h-5" />;
                        let description = "Anomalous execution sandbox agent subject to manual policy review.";
                        
                        if (agent.id === 1) {
                          agentIcon = <Radio className="w-5 h-5" />;
                          description = "High-frequency weather and financial oracle feed with optimized direct routing.";
                        } else if (agent.id === 2) {
                          agentIcon = <Cpu className="w-5 h-5" />;
                          description = "Custom translation and analytics models with escrow payment security.";
                        }

                        if (score >= 70) {
                          statusText = "HIGH TRUST";
                          badgeStyle = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20";
                          iconColor = "text-emerald-500";
                          iconBg = "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20";
                        } else if (score >= 40) {
                          statusText = "MEDIUM TRUST";
                          badgeStyle = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20";
                          iconColor = "text-amber-500";
                          iconBg = "bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20";
                        }

                        return (
                          <article 
                            key={agent.id} 
                            className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 flex flex-col justify-between gap-5 relative hover:border-[#E84142] dark:hover:border-[#E84142] transition-all duration-300 shadow-sm hover:shadow-md hover:-translate-y-1 group"
                          >
                            {/* Card Header Info */}
                            <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                {/* Small square icon container */}
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${iconBg} ${iconColor}`}>
                                  {agentIcon}
                                </div>
                                {/* Trust Score styling like mock-up */}
                                <div className="text-right flex items-baseline gap-0.5">
                                  <span className="text-3xl font-display font-black text-zinc-900 dark:text-zinc-50">{score}</span>
                                  <span className="text-xs font-semibold text-zinc-400 dark:text-zinc-500">/100</span>
                                </div>
                              </div>

                              <div>
                                <h4 className="text-lg font-display font-bold uppercase tracking-tight text-zinc-900 dark:text-zinc-50 leading-none">
                                  {agent.name}
                                </h4>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 leading-relaxed">
                                  {description}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${badgeStyle}`}>
                                    {statusText}
                                  </span>
                                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-150 dark:border-zinc-800/50 px-2 py-0.5 rounded font-mono">
                                    Tier {agent.tier}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Service Trigger Actions */}
                            <div className="space-y-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-900/60">
                              <input
                                type="text"
                                placeholder="Enter task prompt..."
                                value={prompts[agent.id] || ""}
                                onChange={(e) => setPrompts({ ...prompts, [agent.id]: e.target.value })}
                                disabled={executingAgentId !== null}
                                className="w-full text-xs px-3 py-2 bg-zinc-50/50 dark:bg-zinc-950/30 border border-zinc-200 dark:border-zinc-800/80 rounded-lg focus:outline-none focus:border-[#E84142] focus:ring-1 focus:ring-[#E84142] text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 font-semibold transition"
                              />
                              <button
                                onClick={() => handleRequestService(agent.id)}
                                disabled={executingAgentId !== null || !account}
                                className="w-full bg-[#E84142] hover:bg-[#d63435] text-white font-extrabold py-2.5 rounded-lg text-xs tracking-wider uppercase transition-all duration-150 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {executingAgentId === agent.id ? "Routing Ledger..." : "Request Service"}
                              </button>
                            </div>

                            {/* CLI Terminal Output Container */}
                            {executionResult[agent.id] && (
                              <div className="bg-zinc-950 dark:bg-black rounded-xl border border-zinc-800/80 p-3.5 font-mono text-xs text-zinc-200 flex flex-col gap-2 relative overflow-hidden mt-2">
                                <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase border-b border-zinc-800 pb-1.5 mb-1">
                                  <span className="flex items-center gap-1.5">
                                    <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                                    Terminal Output
                                  </span>
                                  <button 
                                    onClick={() => handleCopyText(executionResult[agent.id].output || executionResult[agent.id].status, agent.id)}
                                    className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-200 transition"
                                  >
                                    {copiedAgentId === agent.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                  </button>
                                </div>
                                <div className="text-[11px] space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                                  <div>
                                    <span className="text-[#E84142]">$</span> status --check
                                  </div>
                                  <div className="text-zinc-400 font-bold uppercase tracking-tight text-[10px]">
                                    {executionResult[agent.id].status}
                                  </div>
                                  {executionResult[agent.id].output && (
                                    <div className="bg-zinc-900/60 p-2 rounded border border-zinc-800/60 font-sans leading-relaxed text-zinc-300">
                                      {executionResult[agent.id].output}
                                    </div>
                                  )}
                                  {executionResult[agent.id].message && (
                                    <div className="text-red-400 bg-red-950/20 p-2 rounded border border-red-900/30 leading-relaxed font-sans font-medium text-[11px]">
                                      {executionResult[agent.id].message}
                                    </div>
                                  )}
                                  {executionResult[agent.id].error && (
                                    <div className="text-red-400 font-sans font-medium">{executionResult[agent.id].error}</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </article>
                        );
                      })
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
                <div className="p-4 border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0E0E10] rounded-xl text-xs space-y-3 font-semibold text-zinc-750 dark:text-zinc-300">
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
                    <h4 className="text-xs font-bold uppercase text-zinc-400">Reputation Tiers</h4>
                    <ul className="text-xs space-y-2 text-zinc-600 dark:text-zinc-400 font-semibold leading-relaxed">
                      <li>• <span className="text-emerald-500 font-bold">Tier 0 (Score &ge; 70)</span>: Instant direct settlement.</li>
                      <li>• <span className="text-amber-500 font-bold">Tier 1 (Score 40-69)</span>: Funds secured in EscrowVault pending validation.</li>
                      <li>• <span className="text-red-500 font-bold">Tier 2 (Score &lt; 40)</span>: Mandatory manual approval required.</li>
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
    </div>
  );
}
