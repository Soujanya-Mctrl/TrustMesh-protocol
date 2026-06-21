"use client";

import React from "react";
import { ExternalLink } from "lucide-react";
import { useTrustMeshContext } from "../../context/TrustMeshContext";

export default function FaucetPage() {
  const { isFuji } = useTrustMeshContext();

  return (
    <section className="bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800/80 rounded-2xl p-8 space-y-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-2xl font-display font-bold text-zinc-900 dark:text-zinc-50">
          {isFuji ? "Avalanche Fuji Testnet" : "Local Testnet"} Faucet
        </h2>
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
          className="inline-flex items-center gap-1.5 text-[#E84142] hover:underline font-bold"
        >
          Go to Official Avalanche Faucet
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </section>
  );
}
