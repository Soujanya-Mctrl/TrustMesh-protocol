"use client";

import React from "react";
import { 
  Activity, 
  Cpu, 
  Play, 
  RefreshCw, 
  Check, 
  Copy, 
  ChevronRight, 
  ArrowRight,
  Square,
  Trash2 
} from "lucide-react";
import { useTrustMeshContext } from "../context/TrustMeshContext";

export default function OverviewPage() {
  const {
    providers,
    isFuji,
    networkName,
    orchestratorPrompt,
    setOrchestratorPrompt,
    executingOrchestrator,
    handleRunOrchestrator,
    handleStopOrchestrator,
    orchestratorLog,
    setOrchestratorLog,
    copiedAgentId,
    handleCopyText,
    logContainerRef,
    events,
    clearEvents,
    activeEscalation,
    resolveValidation,
    submitting,
    searchQuery,
    handleOpenReputationModal,
    account,
    logStartTimeRef
  } = useTrustMeshContext();

  const filteredProviders = (providers || []).filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.address.toLowerCase().includes(q) ||
      (p.capabilities || []).some((c: string) => c.toLowerCase().includes(q))
    );
  });

  return (
    <>
      {/* Hero / Welcome Onboarding Card */}
      <section className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-7 relative overflow-hidden shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2 pl-2">
          <h2 className="text-2xl font-display font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            TrustMesh Autonomous Orchestration
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-2xl font-medium leading-relaxed">
            Securing micro-payment and task execution routes on the {isFuji ? "Avalanche Fuji Testnet" : "Local Hardhat Network"}. Transactions are routed dynamically via direct pay, escrow locks, or consensus validation depending on on-chain reputation scores and policy rules.
          </p>
        </div>

        <div className="flex gap-6 shrink-0 border-l border-zinc-200 dark:border-zinc-800 pl-6 hidden md:flex select-none">
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
        <div className="flex items-center justify-between pl-2 select-none">
          <h3 className="text-xs font-display font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Orchestrator Control Console
          </h3>
        </div>

        <div className="flex flex-col md:flex-row gap-3 pl-2">
          <input
            type="text"
            placeholder="Enter orchestrator goal prompt"
            value={orchestratorPrompt}
            onChange={(e) => setOrchestratorPrompt(e.target.value)}
            disabled={executingOrchestrator}
            className="flex-1 text-sm px-4 py-3 bg-zinc-50 dark:bg-zinc-950/30 border border-zinc-200 dark:border-zinc-800/80 rounded-xl focus:outline-none focus:border-[#E84142] focus:ring-1 focus:ring-[#E84142] text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400/40 font-medium transition"
          />
          {executingOrchestrator ? (
            <button
              onClick={handleStopOrchestrator}
              className="bg-red-500 hover:bg-red-600 text-white font-extrabold px-6 py-3 rounded-xl text-sm tracking-wider uppercase transition-all duration-150 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] shrink-0"
            >
              <Square className="w-4 h-4 fill-current" />
              Stop Orchestrator
            </button>
          ) : (
            <button
              onClick={handleRunOrchestrator}
              disabled={!account}
              className="bg-[#E84142] hover:bg-[#d63435] text-white font-extrabold px-6 py-3 rounded-xl text-sm tracking-wider uppercase transition-all duration-150 flex items-center justify-center gap-2 shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              <Play className="w-4 h-4 fill-current" />
              Run Orchestrator
            </button>
          )}
        </div>

        {/* Preset Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 text-xs pl-2 select-none">
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

        {/* Live Event Log Timeline */}
        {(orchestratorLog || events.length > 0) && (
          <div className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-sm">
            <div className="flex justify-between items-center px-5 py-3 border-b border-zinc-200 dark:border-zinc-800/80 select-none">
              <span className="flex items-center gap-2 text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                <Activity className="w-3.5 h-3.5" />
                Live Event Log
                {executingOrchestrator && (
                  <span className="ml-1 w-1.5 h-1.5 bg-[#E84142] rounded-full animate-pulse" />
                )}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setOrchestratorLog("");
                    clearEvents();
                  }}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-red-500 dark:hover:text-red-400 transition"
                  title="Clear log"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleCopyText(orchestratorLog, 99)}
                  className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition"
                  title="Copy full log"
                >
                  {copiedAgentId === 99 ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div ref={logContainerRef as any} className="max-h-[360px] overflow-y-auto">
              {/* Orchestrator stream lines with timestamps */}
              {(() => {
                const lines = orchestratorLog.split("\n");
                const totalLines = lines.filter(l => l.trim() && !l.startsWith("===") && !l.startsWith("---")).length;
                let visibleIdx = 0;
                const startTime = logStartTimeRef?.current || Date.now();

                return lines.map((line, i) => {
                  const trimmed = line.trim();
                  if (!trimmed) return null;
                  const isDivider = trimmed.startsWith("===") || trimmed.startsWith("---");
                  if (isDivider) return null;

                  visibleIdx++;
                  const isHeader = trimmed.startsWith("Starting ERC") || trimmed.startsWith("Goal:") || trimmed.startsWith("Workflow Execution");
                  const isSystem = trimmed.startsWith("[System]") || trimmed.startsWith("Spawning");
                  const isStep = trimmed.startsWith("Executing Step");
                  const isAgent = trimmed.startsWith("[Lead Agent]");
                  const isOrchestrator = trimmed.startsWith("[Orchestrator]") || trimmed.startsWith("\u{1F7E2}");
                  const isError = trimmed.includes("[Fatal Error]") || trimmed.includes("Error");
                  const isPayment = trimmed.includes("Direct Pay") || trimmed.includes("Payment") || trimmed.includes("Tier 0");
                  const isEscrow = trimmed.includes("Escrow") || trimmed.includes("escrow") || trimmed.includes("Tier 1");
                  const isReview = trimmed.includes("Review") || trimmed.includes("quarantine") || trimmed.includes("Tier 2");
                  const isOutput = trimmed.startsWith("[Lead Agent] Output:");

                  // Calculate a simulated timestamp offset
                  const offsetMs = Math.round((visibleIdx / Math.max(totalLines, 1)) * (Date.now() - startTime));
                  const ts = new Date(startTime + offsetMs);
                  const timeStr = ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

                  // Determine dot color
                  let dotColor = "bg-zinc-300 dark:bg-zinc-600";
                  if (isError) dotColor = "bg-red-500";
                  else if (isReview) dotColor = "bg-[#E84142] animate-pulse";
                  else if (isEscrow) dotColor = "bg-amber-500";
                  else if (isPayment || isOrchestrator) dotColor = "bg-emerald-500";
                  else if (isStep) dotColor = "bg-blue-500";
                  else if (isAgent) dotColor = "bg-indigo-500";
                  else if (isHeader) dotColor = "bg-zinc-800 dark:bg-zinc-200";
                  else if (isSystem) dotColor = "bg-zinc-400";

                  // Text styles
                  let textClass = "text-[11px] text-zinc-600 dark:text-zinc-400";
                  if (isError) textClass = "text-[11px] text-red-500 font-bold";
                  else if (isHeader) textClass = "text-xs text-zinc-900 dark:text-zinc-50 font-bold";
                  else if (isStep) textClass = "text-[11px] text-blue-600 dark:text-blue-400 font-bold";
                  else if (isAgent) textClass = "text-[11px] text-zinc-800 dark:text-zinc-200 font-semibold";
                  else if (isOrchestrator || isPayment) textClass = "text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold";
                  else if (isOutput) textClass = "text-[11px] text-zinc-700 dark:text-zinc-300 font-medium";
                  else if (isSystem) textClass = "text-[11px] text-zinc-500 dark:text-zinc-400 italic";

                  // Step divider
                  const showStepDivider = isStep;

                  return (
                    <div key={`log-${i}`}>
                      {showStepDivider && (
                        <div className="border-t-2 border-dashed border-zinc-200 dark:border-zinc-800 mx-5 mt-1" />
                      )}
                      <div className={`px-5 py-2 flex items-start gap-3 ${isHeader ? "bg-zinc-50/80 dark:bg-zinc-900/30" : "hover:bg-zinc-50/40 dark:hover:bg-zinc-900/10"} transition-colors`}>
                        <span className="text-[9px] font-mono font-bold text-zinc-400 dark:text-zinc-600 tabular-nums shrink-0 mt-0.5 w-[58px]">
                          {timeStr}
                        </span>
                        <div className="mt-1.5 shrink-0">
                          <span className={`flex w-2 h-2 rounded-full ${dotColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={textClass}>
                              {trimmed}
                            </span>
                            {isEscrow && (
                              <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-404 border border-amber-500/20 rounded text-[7px] font-bold uppercase shrink-0">Escrow</span>
                            )}
                            {isPayment && !isEscrow && (
                              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-404 border border-emerald-500/20 rounded text-[7px] font-bold uppercase shrink-0">Settled</span>
                            )}
                            {isReview && (
                              <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded text-[7px] font-bold uppercase shrink-0">Admin Review</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}

              {/* WebSocket on-chain events */}
              {events.map((ev) => (
                <div key={ev.id} className="px-5 py-2.5 flex items-start gap-3 bg-zinc-50/50 dark:bg-zinc-900/20 hover:bg-zinc-100/60 dark:hover:bg-zinc-900/30 transition-colors border-t border-zinc-200 dark:border-zinc-800/60">
                  <span className="text-[9px] font-mono font-bold text-zinc-400 dark:text-zinc-600 tabular-nums shrink-0 mt-0.5 w-[58px]">
                    {new Date(ev.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  <div className="mt-1 shrink-0">
                    {ev.type === "escalated" ? (
                      <span className="flex w-2.5 h-2.5 rounded-full bg-[#E84142] animate-pulse" />
                    ) : ev.type === "resolved" ? (
                      <span className="flex w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    ) : ev.type === "released" ? (
                      <span className="flex w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    ) : ev.type === "created" ? (
                      <span className="flex w-2.5 h-2.5 rounded-full bg-amber-500" />
                    ) : (
                      <span className="flex w-2.5 h-2.5 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200">{ev.message}</span>
                      {ev.type === "escalated" && (
                        <span className="px-1.5 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded text-[7px] font-bold uppercase">⚠ Review Required</span>
                      )}
                      {ev.type === "created" && (
                        <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-605 dark:text-amber-400 border border-amber-500/20 rounded text-[7px] font-bold uppercase">Escrow Locked</span>
                      )}
                      {ev.type === "released" && (
                        <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-606 dark:text-emerald-400 border border-emerald-500/20 rounded text-[7px] font-bold uppercase">Escrow Released</span>
                      )}
                      {ev.type === "evaluated" && (
                        <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 rounded text-[7px] font-bold uppercase">On-Chain</span>
                      )}
                    </div>

                    {/* Inline approve/reject for live escalations */}
                    {ev.type === "escalated" && activeEscalation && !activeEscalation.isComplete && (
                      <div className="flex items-center gap-2 mt-2 select-none">
                        <button
                          onClick={() => resolveValidation(2)}
                          disabled={submitting}
                          className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-md text-[9px] font-bold uppercase tracking-wider transition disabled:opacity-50"
                        >
                          Approve Direct
                        </button>
                        <button
                          onClick={() => resolveValidation(1)}
                          disabled={submitting}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-md text-[9px] font-bold uppercase tracking-wider transition disabled:opacity-50"
                        >
                          Approve w/ Escrow
                        </button>
                        <button
                          onClick={() => resolveValidation(0)}
                          disabled={submitting}
                          className="px-2.5 py-1 bg-[#E84142] hover:bg-[#d63435] text-white rounded-md text-[9px] font-bold uppercase tracking-wider transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Service Providers Registry Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between select-none">
          <h3 className="text-xs font-display font-bold uppercase tracking-wider text-zinc-405 dark:text-zinc-500">
            Available Service Registries
          </h3>
          {searchQuery && (
            <span className="text-xs text-zinc-400 italic font-medium">
              Showing {filteredProviders.length} of {providers.length} matching agents
            </span>
          )}
        </div>

        <div className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-sm">
          {filteredProviders.length === 0 ? (
            <div className="text-center py-16 text-zinc-500 font-medium bg-white dark:bg-[#131316] select-none">
              {providers.length === 0 ? "Loading registry credential state..." : "No agents found matching search query."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 select-none">
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
                        className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors cursor-pointer text-xs group animate-fade-in"
                      >
                        {/* Profile Column */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img 
                              src={`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(agent.name)}`}
                              alt={agent.name}
                              className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 shrink-0 select-none"
                            />
                            <div className="space-y-0.5">
                              <div className="font-display font-bold uppercase tracking-tight text-zinc-900 dark:text-zinc-50 group-hover:text-[#E84142] transition-colors truncate max-w-[160px]">
                                {agent.name}
                              </div>
                              <div className="flex flex-wrap items-center gap-1 select-none">
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
                          <div className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase mt-0.5 select-none">
                            {agent.balance || "0.0000"} AVAX
                          </div>
                        </td>

                        {/* Score */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 select-none">
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
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${agent.status.includes("✓") || agent.status.includes("confirm") ? "bg-emerald-500" : agent.status.includes("Idle") ? "bg-zinc-300 dark:bg-zinc-600" : "bg-amber-500 animate-pulse"}`} />
                            <span className="font-semibold text-[11px] text-zinc-700 dark:text-zinc-300 truncate max-w-[120px]">{agent.status}</span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right select-none">
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
    </>
  );
}
