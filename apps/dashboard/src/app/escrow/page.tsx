"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
import { useTrustMeshContext } from "../../context/TrustMeshContext";

export default function EscrowPage() {
  const {
    deployed,
    isFuji,
    copiedAgentId,
    handleCopyText,
    escrows,
    handleSimulateRelease,
    handleSimulateRefund,
  } = useTrustMeshContext();

  return (
    <div className="space-y-6">
      {/* Header card */}
      <section className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-6 md:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-50">EscrowVault Router</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">
              Provides secure commit-lock-reveal micropayment isolation for moderate-trust routes.
            </p>
          </div>
          <a
            href="https://github.com/Soujanya-Mctrl/TrustMesh-protocol/blob/main/contracts/src/EscrowVault.sol"
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
              <span className="font-bold text-zinc-808 dark:text-zinc-200">Contract Address:</span>{" "}
              <span className="font-semibold">{deployed?.contracts?.EscrowVault || "Loading..."}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleCopyText(deployed?.contracts?.EscrowVault || "", 102)}
                className="px-2 py-1 bg-zinc-200/50 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded font-semibold text-[10px] uppercase transition"
              >
                {copiedAgentId === 102 ? "Copied!" : "Copy"}
              </button>
              {deployed?.contracts?.EscrowVault && (
                <a
                  href={isFuji ? `https://testnet.snowtrace.io/address/${deployed.contracts.EscrowVault}` : `#`}
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

      {/* Table of escrows */}
      <section className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800/80 flex items-center justify-between select-none">
          <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Active & Historic Escrows</h3>
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
            Seeded Simulation
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Agent Name</th>
                <th className="py-3 px-4">Expected Result Hash</th>
                <th className="py-3 px-4">Locked Value</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-xs">
              {escrows.map((esc: any) => {
                let statusBadge = "bg-zinc-100 text-zinc-600 border-zinc-200";
                if (esc.status === "Released") {
                  statusBadge = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
                } else if (esc.status === "Refunded") {
                  statusBadge = "bg-red-500/10 text-red-500 border-red-500/20";
                } else if (esc.status === "Locked") {
                  statusBadge = "bg-amber-500/10 text-[#d97706] dark:text-amber-450 border-amber-500/20 animate-pulse";
                }

                return (
                  <tr key={esc.id} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-900/5 transition">
                    <td className="py-3 px-4 font-mono font-bold text-zinc-400">#00{esc.id}</td>
                    <td className="py-3 px-4 font-mono text-[10px] text-zinc-500">{esc.client}</td>
                    <td className="py-3 px-4 font-semibold text-zinc-800 dark:text-zinc-200">{esc.agent}</td>
                    <td className="py-3 px-4 font-mono text-[10px] text-zinc-400 truncate max-w-[150px]" title={esc.expectedHash}>
                      {esc.expectedHash.slice(0, 8)}...{esc.expectedHash.slice(-6)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">{esc.value} AVAX</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${statusBadge}`}>
                        {esc.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {esc.status === "Locked" ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleSimulateRelease(esc.id)}
                            className="px-2 py-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded text-[10px] font-bold uppercase tracking-wider transition"
                          >
                            Release
                          </button>
                          <button
                            onClick={() => handleSimulateRefund(esc.id)}
                            className="px-2 py-1 bg-red-500 hover:bg-red-650 text-white rounded text-[10px] font-bold uppercase tracking-wider transition"
                          >
                            Refund
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-bold uppercase select-none">Settled ({esc.timeout})</span>
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
