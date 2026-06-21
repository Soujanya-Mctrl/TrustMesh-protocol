"use client";

import React from "react";
import { ExternalLink, Play, AlertTriangle } from "lucide-react";
import { useTrustMeshContext } from "../../context/TrustMeshContext";

export default function ValidationPage() {
  const {
    deployed,
    isFuji,
    copiedAgentId,
    handleCopyText,
    activeEscalation,
    resolveValidation,
    submitting,
    handleTriggerMockValidation,
    validationRequests,
    handleAdminResolveValidation,
    account,
  } = useTrustMeshContext();

  return (
    <div className="space-y-6">
      {/* Header card */}
      <section className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-50">ValidationRegistry</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Manages human-in-the-loop review, transaction quarantine, and administrator overrides.
            </p>
          </div>
          <a
            href="https://github.com/Soujanya-Mctrl/TrustMesh-protocol/blob/main/contracts/src/ValidationRegistry.sol"
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
              <span className="font-semibold">{deployed?.contracts?.ValidationRegistry || "Loading..."}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopyText(deployed?.contracts?.ValidationRegistry || "", 103)}
                className="px-2 py-1 bg-zinc-200/50 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded font-semibold text-[10px] uppercase transition"
              >
                {copiedAgentId === 103 ? "Copied!" : "Copy"}
              </button>
              {deployed?.contracts?.ValidationRegistry && (
                <a
                  href={isFuji ? `https://testnet.snowtrace.io/address/${deployed.contracts.ValidationRegistry}` : `#`}
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

      {/* Active live escalation card (Connected to Websockets) */}
      {activeEscalation && !activeEscalation.isComplete ? (
        <section className="bg-red-500/10 border-2 border-red-500/30 rounded-2xl p-6 space-y-4 shadow-md animate-pulse">
          <div className="flex justify-between items-center select-none">
            <span className="px-2.5 py-1 bg-[#E84142] text-white rounded text-[10px] font-extrabold uppercase tracking-wider">
              ⚠️ LIVE TRANSACTION QUARANTINED
            </span>
            <span className="text-xs text-zinc-400 font-bold uppercase font-mono">Fuji Block: Pending Admin Override</span>
          </div>
          <div className="space-y-3 text-xs">
            <p className="font-semibold text-zinc-800 dark:text-zinc-200 leading-relaxed">
              An autonomous settlement route to Agent ID <span className="font-bold text-red-500">#{activeEscalation.agentId.toString()} ({activeEscalation.agentName})</span> has been suspended. The trust score of {activeEscalation.score}% fell below the critical threshold (40%).
            </p>
            
            {/* Risk Report */}
            <div className="p-4 bg-black/40 border border-zinc-800 rounded-xl space-y-2 font-mono text-[11px] text-zinc-300">
              <div className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Identified Risk Parameters:</div>
              <div>• Transaction Hash: <span className="text-zinc-100">{activeEscalation.hash}</span></div>
              <div>• Agent Trust Score: <span className="text-[#E84142] font-bold">{activeEscalation.score}%</span></div>
              <div>• Sybil Cluster Similarity: <span className="text-zinc-100">{activeEscalation.sybilFlagged ? "FLAGGED (High risk duplicate pattern)" : "Clean"}</span></div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 pt-2">
            <button
              onClick={() => resolveValidation(2)}
              disabled={submitting || !account}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition disabled:opacity-50"
            >
              Approve (Direct Pay)
            </button>
            <button
              onClick={() => resolveValidation(1)}
              disabled={submitting || !account}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition disabled:opacity-50"
            >
              Approve (With Escrow)
            </button>
            <button
              onClick={() => resolveValidation(0)}
              disabled={submitting || !account}
              className="px-4 py-2 bg-[#E84142] hover:bg-[#d63435] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition disabled:opacity-50"
            >
              Reject &amp; Refund
            </button>
          </div>
        </section>
      ) : (
        <section className="bg-zinc-100 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center space-y-3">
          <h4 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">No active network escalations pending.</h4>
          <p className="text-xs text-zinc-500 dark:text-zinc-500 max-w-md mx-auto leading-relaxed">
            All live transaction routes on Fuji L1 are currently running in standard parameters. Click below to add a mock quarantine validation request for simulation purposes.
          </p>
          <button
            onClick={handleTriggerMockValidation}
            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-800 hover:bg-zinc-800 dark:hover:bg-zinc-700 text-white border border-zinc-800 rounded-xl text-xs font-bold uppercase tracking-wider transition inline-flex items-center gap-1.5 mx-auto shadow-sm active:scale-[0.98]"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Create Mock Quarantine Request
          </button>
        </section>
      )}

      {/* Validation requests explorer */}
      <section className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between select-none">
          <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Quarantine Audit Logs</h3>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
            Human override log
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                <th className="py-3 px-4">Transaction Hash</th>
                <th className="py-3 px-4">Flagged Agent</th>
                <th className="py-3 px-4">Identified Risk Flag</th>
                <th className="py-3 px-4">Audit Status</th>
                <th className="py-3 px-4">Resolution Agent</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
              {validationRequests.map((req: any) => {
                let statusBadge = "bg-zinc-100 text-zinc-600 border-zinc-200";
                if (req.status === "Approved (Direct)") {
                  statusBadge = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
                } else if (req.status === "Approved (With Escrow)") {
                  statusBadge = "bg-amber-500/10 text-[#d97706] dark:text-amber-450 border-amber-500/20";
                } else if (req.status === "Rejected & Refunded") {
                  statusBadge = "bg-red-500/10 text-red-500 border-red-500/20";
                } else if (req.status === "Quarantined") {
                  statusBadge = "bg-red-500/10 text-red-500 border-red-500/20 animate-pulse";
                }

                return (
                  <tr key={req.hash} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/5 transition text-zinc-600 dark:text-zinc-400">
                    <td className="py-3 px-4 font-mono text-[10px] text-zinc-400 truncate max-w-[150px]" title={req.hash}>
                      {req.hash}
                    </td>
                    <td className="py-3 px-4 font-semibold text-zinc-800 dark:text-zinc-200">{req.agent}</td>
                    <td className="py-3 px-4 font-semibold text-red-500 dark:text-red-400">{req.risk}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${statusBadge}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[10px] text-zinc-500">{req.resolvedBy}</td>
                    <td className="py-3 px-4 text-zinc-500 font-semibold">{req.date}</td>
                    <td className="py-3 px-4 text-right">
                      {req.status === "Quarantined" ? (
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleAdminResolveValidation(req.hash, "ApproveDirect")}
                            className="px-2 py-0.75 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[9px] font-bold uppercase tracking-wider transition"
                            title="Approve transaction directly to agent"
                          >
                            Direct
                          </button>
                          <button
                            onClick={() => handleAdminResolveValidation(req.hash, "ApproveEscrow")}
                            className="px-2 py-0.75 bg-amber-500 hover:bg-amber-600 text-white rounded text-[9px] font-bold uppercase tracking-wider transition"
                            title="Approve but lock funds in EscrowVault"
                          >
                            Escrow
                          </button>
                          <button
                            onClick={() => handleAdminResolveValidation(req.hash, "Reject")}
                            className="px-2 py-0.75 bg-red-550 hover:bg-red-650 text-white rounded text-[9px] font-bold uppercase tracking-wider transition"
                            title="Reject payment and refund client"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-bold uppercase select-none">Audited</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
