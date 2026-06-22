"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  HelpCircle, 
  TrendingUp, 
  Cpu, 
  Play, 
  ArrowRight, 
  Github, 
  Lock 
} from "lucide-react";
import { useTrustMeshContext } from "../context/TrustMeshContext";
import { motion, AnimatePresence } from "framer-motion";

const AvalancheLogo = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <circle cx="12" cy="12" r="12" fill="#E84142" />
    <path d="M12 4.5L5.5 16H8.5L12 9.5L15.5 16H18.5L12 4.5Z" fill="white" />
  </svg>
);

const SidebarToggleIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <path d="M9 3v18" />
  </svg>
);

export default function ClientLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const {
    account,
    connectWallet,
    disconnectWallet,
    isConnected,
    errorMessage,
    deployed,
    networkName,
    theme,
    toggleTheme,
    sidebarOpen,
    setSidebarOpen,
    searchQuery,
    setSearchQuery,
    copiedAgentId,
    handleCopyText,
    showDocAssistant,
    setShowDocAssistant,
    docAssistantMessages,
    docAssistantInput,
    setDocAssistantInput,
    isAiTyping,
    handleSendDocAssistant,
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
    selectedAgent,
    setSelectedAgent,
    loadingMetrics,
    agentMetrics,
    onChainReviews,
    loadingReviews,
    activeEscalation,
    resolveValidation,
    submitting,
  } = useTrustMeshContext();

  const getBreadcrumbTitle = () => {
    if (pathname === "/") return "Overview";
    if (pathname === "/faucet") return "Testnet Faucet";
    if (pathname === "/policy") return "Policy Engine";
    if (pathname === "/escrow") return "Escrow Vault";
    if (pathname === "/validation") return "Validation Registry";
    if (pathname.startsWith("/docs")) return "Developer Docs";
    return "Console";
  };

  const isDocsPage = pathname.startsWith("/docs");

  return (
    <div className={`min-h-screen font-sans ${theme === "light" ? "bg-zinc-50 text-zinc-900" : "bg-[#08080A] text-zinc-200"} flex transition-colors duration-200`}>
      {/* Sidebar Navigation */}
      <aside className={`main-sidebar shrink-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0e0e11] flex flex-col transition-all duration-200 z-30 sticky top-0 h-screen
        ${sidebarOpen ? "w-64" : "w-16"}`}>
        
        {/* Logo Section */}
        <div className="h-14 border-b border-zinc-200 dark:border-zinc-800 flex items-center px-4 gap-2.5 overflow-hidden select-none">
          <div className="w-8 h-8 rounded-lg bg-[#E84142] flex items-center justify-center text-white shrink-0">
            <Shield className="w-4.5 h-4.5" />
          </div>
          {sidebarOpen && (
            <div className="flex flex-col">
              <span className="font-display font-black text-[13px] tracking-tight uppercase text-zinc-900 dark:text-zinc-50">TrustMesh</span>
              <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest -mt-0.5">Protocol Console</span>
            </div>
          )}
        </div>

        {/* Filter / Search input in Sidebar */}
        {sidebarOpen && (
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-800/80">
            <div className="relative flex items-center">
              <Search className="absolute left-2.5 w-3.5 h-3.5 text-zinc-400" />
              <input 
                type="text" 
                placeholder="Filter docs..." 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!pathname.startsWith("/docs")) {
                    router.push("/docs");
                  }
                }}
                className="w-full text-xs pl-8 pr-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-md bg-zinc-50 dark:bg-[#0E0E10] focus:outline-none focus:border-[#E84142] text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400"
              />
            </div>
          </div>
        )}

        {/* Navigation Tree */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-6">
          <div>
            {sidebarOpen && <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase px-2 mb-2 tracking-widest select-none">Getting Started</p>}
            <div className="space-y-1">
              <Link 
                href="/"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold tracking-tight transition-all
                  ${pathname === "/" 
                    ? "bg-[#E84142]/10 text-[#E84142] dark:bg-[#E84142]/20" 
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
              >
                <Cpu className="w-4 h-4 shrink-0" />
                {sidebarOpen && <span>Overview Dashboard</span>}
              </Link>
              <Link 
                href="/faucet"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold tracking-tight transition-all
                  ${pathname === "/faucet" 
                    ? "bg-[#E84142]/10 text-[#E84142] dark:bg-[#E84142]/20" 
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
              >
                <TrendingUp className="w-4 h-4 shrink-0" />
                {sidebarOpen && <span>Testnet Faucet</span>}
              </Link>
            </div>
          </div>

          <div>
            {sidebarOpen && <p className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase px-2 mb-2 tracking-widest select-none">Support</p>}
            <div className="space-y-1">
              <Link 
                href="/docs"
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold tracking-tight transition-all
                  ${pathname.startsWith("/docs") 
                    ? "bg-[#E84142]/10 text-[#E84142] dark:bg-[#E84142]/20" 
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
              >
                <HelpCircle className="w-4 h-4 shrink-0" />
                {sidebarOpen && <span>Developer Docs</span>}
              </Link>
              <a 
                href="https://github.com/Soujanya-Mctrl/TrustMesh-protocol"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold tracking-tight text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                title="View GitHub Repository"
              >
                <Github className="w-4 h-4 shrink-0" />
                {sidebarOpen && <span>GitHub Repo</span>}
              </a>
            </div>
          </div>
        </nav>

        {/* Sidebar Footer Utility */}
        <div className="p-3 border-t border-zinc-200 dark:border-zinc-800 space-y-3 shrink-0">
          <div className={`flex items-center justify-between ${sidebarOpen ? "px-1" : "justify-center"}`}>
            {sidebarOpen ? (
              <>
                <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest select-none">Theme</span>
                <div 
                  onClick={toggleTheme}
                  className="bg-zinc-100 dark:bg-[#0e0e11] border border-zinc-200 dark:border-zinc-800 rounded-full p-0.5 flex items-center cursor-pointer select-none transition-colors"
                >
                  <div 
                    className={`w-6 h-6 flex items-center justify-center rounded-full transition-all duration-200 
                      ${theme === "light" 
                        ? "bg-white text-amber-500 shadow-sm" 
                        : "text-zinc-400 dark:text-zinc-600 hover:text-zinc-600"}`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                  </div>
                  <div 
                    className={`w-6 h-6 flex items-center justify-center rounded-full transition-all duration-200 
                      ${theme === "dark" 
                        ? "bg-zinc-800 text-zinc-200 shadow-sm" 
                        : "text-zinc-400 dark:text-zinc-600 hover:text-zinc-600"}`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                  </div>
                </div>
              </>
            ) : (
              <button
                onClick={toggleTheme}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#131316] text-zinc-600 dark:text-zinc-500 hover:text-[#E84142] dark:hover:text-[#E84142] transition-colors"
                title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
              >
                {theme === "light" ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-500" />
                )}
              </button>
            )}
          </div>


        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-grid-pattern relative">
        
        {/* Top Header */}
        <header className="h-14 shrink-0 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0e0e11] px-4 md:px-6 flex items-center justify-between sticky top-0 z-20 transition-colors">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition"
            >
              <SidebarToggleIcon className="w-4 h-4" />
            </button>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />
            
            {/* Breadcrumbs */}
            <div className="flex items-center gap-1.5 text-xs font-semibold tracking-tight text-zinc-500 dark:text-zinc-400 select-none">
              <span>Console</span>
              <ChevronRight className="w-2.5 h-2.5 opacity-60" />
              <span className="text-zinc-900 dark:text-zinc-100 font-bold uppercase text-[10px] tracking-wider">
                {getBreadcrumbTitle()}
              </span>
            </div>
          </div>

          {/* Header Right Actions */}
          <div className="flex items-center gap-2">
            {/* Network Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-zinc-100 dark:bg-[#1E1E22] border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 rounded-lg font-semibold shrink-0 select-none">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              <span>Testnet</span>
            </div>

            {/* Wallet Pill */}
            {account ? (
              <button
                onClick={disconnectWallet}
                className="flex items-center gap-2 px-2.5 py-1 bg-zinc-100 dark:bg-[#1E1E22] border border-zinc-200 dark:border-zinc-800 hover:border-red-500/30 text-xs text-zinc-700 dark:text-zinc-300 rounded-lg font-semibold shrink-0 group/wallet transition-colors"
              >
                <AvalancheLogo className="w-3.5 h-3.5 shrink-0" />
                <span className="font-bold text-[11px] text-zinc-500 dark:text-zinc-400">Wallet</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{walletBalance} AVAX</span>
                <span className="hidden group-hover/wallet:inline text-red-500 font-extrabold text-[9px] uppercase tracking-wider pl-1.5 border-l border-zinc-200 dark:border-zinc-800">Disconnect</span>
              </button>
            ) : (
              <button 
                onClick={connectWallet}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#E84142] hover:bg-[#d63435] text-white text-[11px] font-bold uppercase tracking-wider rounded-lg shrink-0 transition"
              >
                <Wallet className="w-3.5 h-3.5 shrink-0" />
                Connect Wallet
              </button>
            )}

            {/* Orchestrator Budget Pill */}
            {account && (
              <button
                onClick={() => {
                  setShowFundModal(true);
                }}
                className="flex items-center gap-2 px-2.5 py-1 bg-zinc-100 dark:bg-[#1E1E22] border border-zinc-200 dark:border-zinc-800 hover:border-[#E84142]/45 text-xs text-zinc-700 dark:text-zinc-300 rounded-lg font-semibold shrink-0 group/orch transition-colors"
              >
                <AvalancheLogo className="w-3.5 h-3.5 shrink-0" />
                <span className="font-bold text-[11px] text-zinc-500 dark:text-zinc-400">Orchestrator</span>
                <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">{orchestratorBalance} AVAX</span>
                <span className="ml-1 px-1.5 py-0.25 bg-[#E84142]/10 hover:bg-[#E84142]/20 text-[#E84142] rounded text-[9px] uppercase font-bold tracking-wider transition">Top Up</span>
              </button>
            )}

            {/* Connection Status indicator if disconnected */}
            {!isConnected && (
              <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] font-bold rounded-lg uppercase">
                <WifiOff className="w-3 h-3 animate-pulse" />
              </div>
            )}
          </div>
        </header>

        {/* Page Body Container */}
        <div className={isDocsPage 
          ? "flex-1 flex flex-col min-h-0 w-full bg-white dark:bg-[#0A0A0C] transition-colors duration-200" 
          : "flex-1 p-6 md:p-10 max-w-6xl w-full mx-auto space-y-10"}>

          {errorMessage && (
            <div className="border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 text-red-900 dark:text-red-300 p-4 rounded-xl font-bold text-xs flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <div>{errorMessage}</div>
            </div>
          )}

          {children}
        </div>
      </main>

      {/* -------------------- GLOBAL OVERLAYS & MODALS -------------------- */}

      {/* 1. Live Validation / Quarantine Overlays */}
      <AnimatePresence>
        {activeEscalation && !activeEscalation.isComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-white dark:bg-[#131316] border-l-4 border-l-[#E84142] border-y border-r border-zinc-200 dark:border-zinc-800 p-8 max-w-md w-full flex flex-col gap-6 relative shadow-2xl rounded-r-2xl text-zinc-900 dark:text-zinc-50"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-red-500/10 text-[#E84142] border border-red-500/20 rounded shrink-0">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold uppercase tracking-tight">
                    Review Required: {activeEscalation.agentName}
                  </h3>
                  <p className="text-xs font-bold text-[#E84142] uppercase mt-1 font-sans">
                    Suspicious transaction pattern flagged
                  </p>
                </div>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-semibold">
                The policy engine routed this interaction to Tier 2 because the agent's trust score dropped below 40% (current score: <span className="text-[#E84142] font-black">{activeEscalation.score}%</span>). Manual reviewer approval is required to proceed.
              </p>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => resolveValidation(2)}
                  disabled={submitting || !account}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-3.5 text-xs tracking-wider uppercase rounded transition disabled:opacity-50"
                >
                  Approve (Direct Pay)
                </button>

                <button 
                  onClick={() => resolveValidation(1)}
                  disabled={submitting || !account}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold py-3.5 text-xs tracking-wider uppercase rounded transition disabled:opacity-50"
                >
                  Approve (With Escrow)
                </button>

                <button 
                  onClick={() => resolveValidation(0)}
                  disabled={submitting || !account}
                  className="bg-[#E84142] hover:bg-[#d63435] text-white font-extrabold py-3.5 text-xs tracking-wider uppercase rounded transition disabled:opacity-50"
                >
                  Reject &amp; Refund
                </button>
              </div>

              {!account && (
                <p className="text-[10px] text-center text-[#E84142] font-bold uppercase tracking-wider">
                  * Wallet connection required to authorize decision
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. ERC-8004 Agent Reputation Modal */}
      <AnimatePresence>
        {selectedAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto relative shadow-2xl p-6 md:p-8 space-y-6 text-zinc-900 dark:text-zinc-50"
            >
              
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
                            ? "bg-amber-500/10 text-amber-550 border border-amber-500/20" 
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

                <div className="flex items-baseline gap-1 bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/50 px-4 py-2 rounded-xl shrink-0">
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
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-300">
                      {selectedAgent.address.slice(0, 6)}...{selectedAgent.address.slice(-4)}
                    </span>
                    <button
                      onClick={() => handleCopyText(selectedAgent.address, 300)}
                      className="p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
                      title="Copy full address"
                    >
                      {copiedAgentId === 300 ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase text-zinc-405">Registered Age:</div>
                  <div className="font-semibold text-zinc-800 dark:text-zinc-300">
                    {selectedAgent.registrationAge || "N/A"}
                  </div>
                </div>
                {selectedAgent.uri && (
                  <div className="space-y-1.5 sm:col-span-2 pt-2.5 border-t border-zinc-200/50 dark:border-zinc-800/50">
                    <div className="text-[10px] font-bold uppercase text-zinc-400">ERC-8004 Metadata (IPFS/Pinata):</div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-zinc-600 dark:text-zinc-400 truncate max-w-[280px]" title={selectedAgent.uri}>
                        {selectedAgent.uri}
                      </span>
                      <button
                        onClick={() => handleCopyText(selectedAgent.uri, 301)}
                        className="p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition shrink-0"
                        title="Copy URI"
                      >
                        {copiedAgentId === 301 ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <a 
                        href={selectedAgent.uri.startsWith("ipfs://") 
                          ? `https://ipfs.io/ipfs/${selectedAgent.uri.slice(7)}` 
                          : selectedAgent.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="shrink-0 text-[9px] font-sans font-bold uppercase px-1.5 py-0.5 bg-[#E84142]/10 text-[#E84142] hover:bg-[#E84142]/20 rounded border border-[#E84142]/20 transition"
                      >
                        Open JSON
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
                      <div className="text-lg font-black font-mono text-zinc-900 dark:text-zinc-50 truncate">
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
              <div className="space-y-4 pt-2 border-t border-zinc-155 dark:border-zinc-900">
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
                    <div className="text-center py-8 text-zinc-400 text-xs italic bg-zinc-50/50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800 rounded-xl">
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Top Up Orchestrator Budget Modal */}
      <AnimatePresence>
        {showFundModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl max-w-md w-full relative shadow-2xl p-6 md:p-8 space-y-6 text-zinc-900 dark:text-zinc-50"
            >
              
              {/* Close button */}
              <button
                onClick={() => {
                  if (!fundingOrchestrator) {
                    setShowFundModal(false);
                  }
                }}
                disabled={fundingOrchestrator}
                className="absolute right-4 top-4 md:right-6 md:top-6 p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 rounded-lg transition disabled:opacity-30 z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-3 border-b border-zinc-200 dark:border-zinc-900 pb-4">
                <div className="p-2.5 bg-[#E84142]/10 text-[#E84142] border border-[#E84142]/20 rounded-xl">
                  <Wallet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-extrabold uppercase tracking-tight leading-tight">
                    Fund Orchestrator
                  </h3>
                  <p className="text-xs text-zinc-400 dark:text-zinc-555 font-semibold uppercase mt-0.5 tracking-wider">
                    Top Up Agent Operations Budget
                  </p>
                </div>
              </div>

              {/* Flow Visualizer */}
              <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/80 p-4 rounded-xl text-xs">
                <div className="flex flex-col items-center flex-1 text-center space-y-1 min-w-0">
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">My Wallet</span>
                  <span className="font-mono font-black text-zinc-900 dark:text-zinc-100 truncate w-full">
                    {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : "Not Connected"}
                  </span>
                  <span className="font-semibold text-zinc-500 dark:text-zinc-400 text-[10px] font-mono">
                    {walletBalance} AVAX
                  </span>
                </div>

                <div className="px-3 text-[#E84142] shrink-0">
                  <ArrowRight className="w-5 h-5 animate-pulse" />
                </div>

                <div className="flex flex-col items-center flex-1 text-center space-y-1 min-w-0">
                  <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-505 uppercase tracking-wider">Orchestrator</span>
                  <span className="font-mono font-black text-[#E84142] w-full">
                    0x76d7...2498
                  </span>
                  <span className="font-semibold text-zinc-555 dark:text-zinc-400 text-[10px] font-mono">
                    {orchestratorBalance} AVAX
                  </span>
                </div>
              </div>

              {/* Input field */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase text-zinc-400 dark:text-zinc-505 tracking-wider">
                  Funding Amount (AVAX)
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    placeholder="0.1"
                    value={fundAmountInput}
                    onChange={(e) => {
                      setFundAmountInput(e.target.value);
                    }}
                    disabled={fundingOrchestrator}
                    className="w-full text-sm font-semibold pl-4 pr-16 py-3 bg-zinc-50 dark:bg-zinc-950/30 border border-zinc-200 dark:border-zinc-800/80 rounded-xl focus:outline-none focus:border-[#E84142] focus:ring-1 focus:ring-[#E84142] text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 transition"
                  />
                  <span className="absolute right-4 text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase font-mono">
                    AVAX
                  </span>
                </div>

                {/* Quick Select Buttons */}
                <div className="flex gap-2 pt-1.5">
                  {["0.1", "0.5", "1.0"].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => {
                        setFundAmountInput(val);
                      }}
                      disabled={fundingOrchestrator}
                      className="flex-1 py-1.5 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 text-xs font-bold rounded-lg transition"
                    >
                      {val} AVAX
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      const balanceNum = Number(walletBalance);
                      const safeMax = Math.max(0, balanceNum - 0.01);
                      setFundAmountInput(safeMax.toFixed(4));
                    }}
                    disabled={fundingOrchestrator}
                    className="flex-1 py-1.5 bg-zinc-50 dark:bg-zinc-900/60 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 text-xs font-bold rounded-lg transition"
                  >
                    Max (Safe)
                  </button>
                </div>
              </div>

              {/* Error or status message */}
              {fundingError && (
                <div className="p-3 border border-red-500/20 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{fundingError}</span>
                </div>
              )}

              {fundingStatusMessage && (
                <div className="p-3 border border-[#E84142]/20 bg-[#E84142]/5 text-[#E84142] rounded-xl text-xs font-semibold flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-[#E84142] shrink-0" />
                  <span>{fundingStatusMessage}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFundModal(false)}
                  disabled={fundingOrchestrator}
                  className="flex-1 py-3 text-xs uppercase font-extrabold tracking-wider border border-zinc-200 dark:border-zinc-800 bg-transparent hover:bg-zinc-100 dark:hover:bg-zinc-800/50 rounded-xl transition text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={executeFunding}
                  disabled={fundingOrchestrator || !account}
                  className="flex-1 py-3 bg-[#E84142] hover:bg-[#d63435] text-white text-xs uppercase font-extrabold tracking-wider rounded-xl transition shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {fundingOrchestrator ? "Funding..." : "Confirm Top Up"}
                </button>
              </div>

              {!account && (
                <p className="text-[10px] text-center text-red-500 dark:text-red-400 font-bold uppercase tracking-wider">
                  * Please connect your wallet to top up
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>      {/* 4. Sliding AI Assistant Drawer */}
      <AnimatePresence>
        {showDocAssistant && (
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-80 sm:w-96 bg-white dark:bg-[#131316] border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-950/20">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#E84142]" />
                <span className="font-display font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200">AI Copilot Assistant</span>
              </div>
              <button 
                onClick={() => setShowDocAssistant(false)}
                className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-655 dark:hover:text-zinc-200 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
              {docAssistantMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] p-3 rounded-xl font-medium leading-relaxed shadow-sm
                    ${msg.sender === "user" 
                      ? "bg-[#E84142] text-white rounded-tr-none" 
                      : "bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-400 rounded-tl-none border border-zinc-200/50 dark:border-zinc-800/80"}`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {isAiTyping && (
                <div className="flex justify-start">
                  <div className="bg-zinc-100 dark:bg-zinc-900 text-zinc-500 p-3 rounded-xl rounded-tl-none border border-zinc-200/50 dark:border-zinc-800/80 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/20">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={docAssistantInput}
                  onChange={(e) => setDocAssistantInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendDocAssistant()}
                  placeholder="Ask about consensus, policies..."
                  className="flex-1 px-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs focus:outline-none focus:border-[#E84142] text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 font-medium"
                />
                <button 
                  onClick={handleSendDocAssistant}
                  className="bg-[#E84142] hover:bg-[#d63435] text-white font-extrabold px-3.5 py-2 rounded-lg text-[10px] tracking-wider uppercase transition shadow-sm"
                >
                  Send
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
