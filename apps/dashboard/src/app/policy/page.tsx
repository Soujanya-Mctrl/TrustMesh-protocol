"use client";

import React from "react";
import { ExternalLink, ArrowRight } from "lucide-react";
import { useTrustMeshContext } from "../../context/TrustMeshContext";

export default function PolicyPage() {
  const {
    deployed,
    isFuji,
    copiedAgentId,
    handleCopyText,
    calcTrustScore,
    setCalcTrustScore,
    calcAmount,
    setCalcAmount,
  } = useTrustMeshContext();

  return (
    <div className="space-y-6">
      {/* Header card */}
      <section className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-50">PolicyEngine Settings</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Configure automated payment thresholds, sybil flags, and escalation procedures on-chain.
            </p>
          </div>
          <a
            href="https://github.com/Soujanya-Mctrl/TrustMesh-protocol/blob/main/contracts/src/PolicyEngine.sol"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition duration-150 border border-zinc-800"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.867 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            View Contract on GitHub
          </a>
        </div>

        <div className="p-4 bg-zinc-50 dark:bg-[#0E0E10] border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-mono text-zinc-700 dark:text-zinc-400">
              <span className="font-bold text-zinc-800 dark:text-zinc-200">Contract Address:</span>{" "}
              <span className="font-semibold">{deployed?.contracts?.PolicyEngine || "Loading..."}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopyText(deployed?.contracts?.PolicyEngine || "", 101)}
                className="px-2 py-1 bg-zinc-200/50 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded font-semibold text-[10px] uppercase transition"
              >
                {copiedAgentId === 101 ? "Copied!" : "Copy"}
              </button>
              {deployed?.contracts?.PolicyEngine && (
                <a
                  href={isFuji ? `https://testnet.snowtrace.io/address/${deployed.contracts.PolicyEngine}` : `#`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2 py-1 bg-zinc-200/50 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded font-semibold text-[10px] uppercase transition inline-flex items-center gap-1"
                >
                  Explorer
                  <ExternalLink className="w-2.5 h-2.5" />
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Simulator Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Card */}
        <section className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 space-y-6 shadow-sm lg:col-span-1">
          <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Trust Routing Simulator</h3>
          <div className="space-y-4">
            {/* Trust Score Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                <span>Agent Trust Score</span>
                <span className="font-bold text-[#E84142]">{calcTrustScore}/100</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={calcTrustScore}
                onChange={(e) => setCalcTrustScore(Number(e.target.value))}
                className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-[#E84142]"
              />
              <div className="flex justify-between text-[10px] font-bold text-zinc-400 uppercase">
                <span>Suspicious</span>
                <span>Moderate</span>
                <span>High</span>
              </div>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Transaction Amount (AVAX)
              </label>
              <input
                type="number"
                step="0.01"
                value={calcAmount}
                onChange={(e) => setCalcAmount(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-zinc-50 dark:bg-zinc-950/30 border border-zinc-200 dark:border-zinc-800/80 rounded-lg focus:outline-none focus:border-[#E84142] focus:ring-1 focus:ring-[#E84142] text-zinc-900 dark:text-zinc-50 font-medium"
              />
            </div>
          </div>
        </section>

        {/* Visual Flow Route Display */}
        <section className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 shadow-sm lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider mb-4">On-Chain Execution Route</h3>
            
            {/* Active routing detail based on score */}
            {calcTrustScore >= 70 ? (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                  <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tight flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    Tier 0 - Direct Pay Route
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-semibold leading-relaxed">
                    High trust agent verified. Settlement is executed directly from the payer's wallet to the agent's recipient address with instant finality.
                  </p>
                </div>
                
                {/* Visual flowchart */}
                <div className="flex items-center justify-center py-6">
                  <div className="flex items-center gap-3 animate-fade-in">
                    <div className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-center">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase">Payer Wallet</div>
                      <div className="text-xs font-mono font-bold mt-0.5">0xPayer...</div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-emerald-500" />
                    <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center relative">
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.25 bg-emerald-500 text-white rounded text-[8px] font-bold uppercase">Direct</span>
                      <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mt-1">DirectPay ({calcAmount} AVAX)</div>
                      <div className="text-[9px] font-mono text-zinc-500">PolicyEngine.recordDirectSettlement</div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-emerald-500" />
                    <div className="px-3 py-2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-center">
                      <div className="text-[10px] font-bold text-zinc-400 uppercase">Agent Wallet</div>
                      <div className="text-xs font-mono font-bold mt-0.5">0xAgent...</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : calcTrustScore >= 40 ? (
              <div className="space-y-4">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <h4 className="text-sm font-bold text-[#d97706] dark:text-amber-405 uppercase tracking-tight flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" />
                    Tier 1 - Commit-Lock-Reveal Escrow Route
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-semibold leading-relaxed">
                    Moderate trust agent. Payer locks the AVAX in the <code>EscrowVault</code> contract. Payout is released to the agent only upon submitting the cryptographic preimage match of the deliverable expected hash.
                  </p>
                </div>
                
                {/* Visual flowchart */}
                <div className="flex items-center justify-center py-4">
                  <div className="flex flex-wrap items-center justify-center gap-3 animate-fade-in">
                    <div className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-center text-xs">
                      <div className="text-[9px] font-bold text-zinc-400 uppercase">Payer</div>
                      <div className="font-mono mt-0.5 font-bold">0xPayer...</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-amber-500" />
                    <div className="px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg text-center text-xs relative">
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.25 bg-amber-500 text-white rounded text-[8px] font-bold uppercase">Lockup</span>
                      <div className="text-[9px] font-bold text-[#b45309] dark:text-amber-450 uppercase mt-1">EscrowVault</div>
                      <div className="text-[8px] font-mono text-zinc-500">Locked pending preimage</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-amber-500" />
                    <div className="px-2.5 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center text-xs relative">
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.25 bg-emerald-500 text-white rounded text-[8px] font-bold uppercase">Reveal</span>
                      <div className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mt-1">Release Payout</div>
                      <div className="text-[8px] font-mono text-zinc-500">Submit reveal pre-image</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-500" />
                    <div className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-center text-xs">
                      <div className="text-[9px] font-bold text-zinc-400 uppercase">Agent</div>
                      <div className="font-mono mt-0.5 font-bold">0xAgent...</div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <h4 className="text-sm font-bold text-red-500 uppercase tracking-tight flex items-center gap-1.5">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    Tier 2 - Quarantine & Verification Route
                  </h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-semibold leading-relaxed">
                    Low trust/suspicious agent profile. Direct execution is quarantined. Payment settlement remains suspended, requiring a human admin override via <code>recordHumanDecision</code> on the <code>PolicyEngine</code> before completion.
                  </p>
                </div>
                
                {/* Visual flowchart */}
                <div className="flex items-center justify-center py-4">
                  <div className="flex flex-wrap items-center justify-center gap-3 animate-fade-in">
                    <div className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-center text-xs">
                      <div className="text-[9px] font-bold text-zinc-400 uppercase">Payer</div>
                      <div className="font-mono mt-0.5 font-bold">0xPayer...</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-red-500" />
                    <div className="px-2.5 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg text-center text-xs relative">
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.25 bg-red-500 text-white rounded text-[8px] font-bold uppercase">Quarantined</span>
                      <div className="text-[9px] font-bold text-red-500 uppercase mt-1">ValidationRegistry</div>
                      <div className="text-[8px] font-mono text-zinc-500">Suspended validation</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-zinc-400" />
                    <div className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-center text-xs relative">
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.25 bg-zinc-500 text-white rounded text-[8px] font-bold uppercase">Human Audit</span>
                      <div className="text-[9px] font-bold text-zinc-500 dark:text-zinc-500 uppercase mt-1">Admin Review</div>
                      <div className="text-[8px] font-mono text-zinc-500">Single-tap override</div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-emerald-500" />
                    <div className="px-2.5 py-1.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-center text-xs">
                      <div className="text-[9px] font-bold text-zinc-400 uppercase">Agent Payout</div>
                      <div className="font-mono mt-0.5 font-bold">If Approved</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-xs text-zinc-500 select-none">
            <span>Threshold check: {calcTrustScore >= 70 ? "Tier 0 (Direct)" : calcTrustScore >= 40 ? "Tier 1 (Escrow)" : "Tier 2 (Validation)"}</span>
            <span className="font-bold font-mono">AVALANCHE FUJI L1 ACTIVE</span>
          </div>
        </section>
      </div>
    </div>
  );
}
