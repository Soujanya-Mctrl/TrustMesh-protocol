"use client";

import React from "react";
import { ExternalLink, ChevronRight, Terminal, Copy, Check, HelpCircle } from "lucide-react";
import { useTrustMeshContext } from "../../context/TrustMeshContext";

const docContentSearchMap: Record<string, string> = {
  intro: `Introduction to TrustMesh. The Trust-Aware Agentic Payment Protocol powering autonomous secure transactions.
    "Kite tells your agent how to spend. TrustMesh tells your agent who to trust."
    The Core Problem: AI agents spend money. Payment rails lack trust verification. Sybil attacks, micro-transaction volume boosting, prompt injection, and premature release of funds.
    TrustMesh Stack: x402 Protocol (spending rail, HTTP-native token), ERC-8004 Registry (reputation primitive, Avalanche C-Chain).
    Weighted Multi-Signal Evaluation: reputation, registration age, volume, diversity (Sybils flagged).
    Dynamic 3-Tier Payment Terms: Tier 0 Auto-Approve (70-100 score, instant C-Chain), Tier 1 Escrow Vault (40-69 score, commit-lock-reveal preimage), Tier 2 Sandbox & Escalate (0-39 score, isolated Subnet via AWM, human review override).`,
  consensus: `Snowman Consensus. linear order transaction finalization, EVM subnets. repeated random sub-sampling queries peers, agreement supermajority, sub-second finality.`,
  token: `AVAX & TMESH Token. Tokenomics, gas routing fees, dynamic payment settlement. AVAX gas fees burned. EIP-8004 reputation, rewards, micropayments.`,
  policy: `Policy Engine. PolicyEngine.sol gateway contract, routing agent payments. evaluateTier, human override, recordHumanDecision.`,
  trust: `Trust Registry. TrustRegistry.sol contract, composite rating cache. CACHE_TTL cache, scoring weighted sum, Sybil penalization.`,
  escrow: `Escrow Vault. EscrowVault.sol commit-lock-reveal micropayment isolation contract. createEscrow, expectedHash, submitDeliverable preimage hash.`,
  client: `TrustMesh Client. TypeScript Client SDK, @trustmesh/sdk, TrustMeshClient, rpcUrl, policyEngineAddress, walletPrivateKey.`,
  routing: `Tiers Routing. client.pay method, dynamic routing, settlement tiers.`,
  events: `Event Handlers. SDK client event hooks, tier_assigned, escrow_created, compositeScore.`,
  deploy: `Subnet Deployment. Local L1 Sandbox, Avalanche CLI, avalanche network clean, avalanche blockchain create evm TMESH, deploy trustmesh --local.`,
  seeding: `Reputation Seeding. setup scripts, deploy contracts, mock reviews, npm run l1:setup.`,
  testing: `E2E Testing. routing tiers, automated validation rules, HTTP agent servers, npm run agents, npm run demo.`,
  repo: `Source Repository. Solidity smart contracts, TypeScript SDK client, orchestrator, dashboard, GitHub link Soujanya-Mctrl/TrustMesh-protocol.`,
  structure: `Directory Layout. monorepo tree: trust_mesh, contracts, packages/sdk, apps/orchestrator, apps/agents, apps/dashboard.`,
  contribute: `Contribution Guide. Pull Requests, forks, npx hardhat test.`
};

export default function DocsPage() {
  const {
    activeDocTopic,
    setActiveDocTopic,
    activeSubTopic,
    setActiveSubTopic,
    copiedAgentId,
    handleCopyText,
    setShowDocAssistant,
    searchQuery,
  } = useTrustMeshContext();

  const filterDocs = (items: { id: string; label: string }[]) => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(item => {
      const labelMatch = item.label.toLowerCase().includes(q);
      const content = docContentSearchMap[item.id] || "";
      const contentMatch = content.toLowerCase().includes(q);
      return labelMatch || contentMatch;
    });
  };

  const primaryNetworkItems = filterDocs([
    { id: "intro", label: "Introduction" },
    { id: "consensus", label: "Snowman Consensus" },
    { id: "token", label: "AVAX & TMESH Token" }
  ]);

  const coreContractsItems = filterDocs([
    { id: "policy", label: "Policy Engine" },
    { id: "trust", label: "Trust Registry" },
    { id: "escrow", label: "Escrow Vault" }
  ]);

  const sdkIntegrationItems = filterDocs([
    { id: "client", label: "TrustMesh Client" },
    { id: "routing", label: "Tiers Routing" },
    { id: "events", label: "Event Handlers" }
  ]);

  const sandboxItems = filterDocs([
    { id: "deploy", label: "Subnet Deployment" },
    { id: "seeding", label: "Reputation Seeding" },
    { id: "testing", label: "E2E Testing" }
  ]);

  const githubItems = filterDocs([
    { id: "repo", label: "Source Repository" },
    { id: "structure", label: "Directory Layout" },
    { id: "contribute", label: "Contribution Guide" }
  ]);

  const docPages = [
    { id: "intro", label: "Introduction", category: "overview" },
    { id: "consensus", label: "Snowman Consensus", category: "overview" },
    { id: "token", label: "AVAX & TMESH Token", category: "overview" },
    { id: "policy", label: "Policy Engine", category: "contracts" },
    { id: "trust", label: "Trust Registry", category: "contracts" },
    { id: "escrow", label: "Escrow Vault", category: "contracts" },
    { id: "client", label: "TrustMesh Client", category: "sdk" },
    { id: "routing", label: "Tiers Routing", category: "sdk" },
    { id: "events", label: "Event Handlers", category: "sdk" },
    { id: "deploy", label: "Subnet Deployment", category: "sandbox" },
    { id: "seeding", label: "Reputation Seeding", category: "sandbox" },
    { id: "testing", label: "E2E Testing", category: "sandbox" },
    { id: "repo", label: "Source Repository", category: "github" },
    { id: "structure", label: "Directory Layout", category: "github" },
  ];

  React.useEffect(() => {
    if (!searchQuery) return;
    const q = searchQuery.toLowerCase();
    
    // Check if current activeSubTopic matches the query
    const currentMatches = docPages.find(p => p.id === activeSubTopic);
    const currentText = currentMatches ? (docContentSearchMap[activeSubTopic] || "").toLowerCase() : "";
    const currentLabel = currentMatches ? currentMatches.label.toLowerCase() : "";
    const currentIsMatch = currentLabel.includes(q) || currentText.includes(q);
    
    if (!currentIsMatch) {
      // Find the first page that matches
      const firstMatch = docPages.find(p => {
        const label = p.label.toLowerCase();
        const text = (docContentSearchMap[p.id] || "").toLowerCase();
        return label.includes(q) || text.includes(q);
      });
      if (firstMatch) {
        setActiveDocTopic(firstMatch.category);
        setActiveSubTopic(firstMatch.id);
      }
    }
  }, [searchQuery, activeSubTopic, setActiveDocTopic, setActiveSubTopic]);

  const currentIndex = docPages.findIndex(p => p.id === activeSubTopic);
  const prevPage = currentIndex > 0 ? docPages[currentIndex - 1] : null;
  const nextPage = currentIndex < docPages.length - 1 ? docPages[currentIndex + 1] : null;

  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 xl:grid-cols-5 min-h-[calc(100vh-3.5rem)] bg-white dark:bg-[#0A0A0C] transition-colors duration-200">
      
      {/* 1. Left Sidebar Navigation */}
      <div className="lg:col-span-1 border-r border-zinc-200 dark:border-zinc-800 bg-zinc-50/20 dark:bg-zinc-950/10">
        <aside className="p-6 max-h-[calc(100vh-3.5rem)] overflow-y-auto sticky top-14 flex flex-col justify-between">
        <div className="space-y-6">
          
          {/* Category: Primary Network */}
          {primaryNetworkItems.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-2 mb-2 select-none font-sans">Primary Network</h4>
              <div className="space-y-0.5">
                {primaryNetworkItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveDocTopic("overview"); setActiveSubTopic(item.id); }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all flex items-center justify-between group
                      ${activeSubTopic === item.id 
                        ? "bg-red-500/5 text-[#E84142] dark:bg-[#E84142]/10 dark:text-[#E84142] font-bold" 
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30 hover:text-zinc-900 dark:hover:text-zinc-200"}`}
                  >
                    <span>{item.label}</span>
                    {activeSubTopic === item.id && <span className="w-1.5 h-1.5 rounded-full bg-[#E84142]" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category: Core Contracts */}
          {coreContractsItems.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-2 mb-2 select-none font-sans">Core Contracts</h4>
              <div className="space-y-0.5">
                {coreContractsItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveDocTopic("contracts"); setActiveSubTopic(item.id); }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all flex items-center justify-between group
                      ${activeSubTopic === item.id 
                        ? "bg-red-500/5 text-[#E84142] dark:bg-[#E84142]/10 dark:text-[#E84142] font-bold" 
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30 hover:text-zinc-900 dark:hover:text-zinc-200"}`}
                  >
                    <span>{item.label}</span>
                    {activeSubTopic === item.id && <span className="w-1.5 h-1.5 rounded-full bg-[#E84142]" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category: SDK Integration */}
          {sdkIntegrationItems.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-2 mb-2 select-none font-sans">SDK Integration</h4>
              <div className="space-y-0.5">
                {sdkIntegrationItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveDocTopic("sdk"); setActiveSubTopic(item.id); }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all flex items-center justify-between group
                      ${activeSubTopic === item.id 
                        ? "bg-red-500/5 text-[#E84142] dark:bg-[#E84142]/10 dark:text-[#E84142] font-bold" 
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30 hover:text-zinc-900 dark:hover:text-zinc-200"}`}
                  >
                    <span>{item.label}</span>
                    {activeSubTopic === item.id && <span className="w-1.5 h-1.5 rounded-full bg-[#E84142]" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category: Local L1 Sandbox */}
          {sandboxItems.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-2 mb-2 select-none font-sans">Local L1 Sandbox</h4>
              <div className="space-y-0.5">
                {sandboxItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveDocTopic("sandbox"); setActiveSubTopic(item.id); }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all flex items-center justify-between group
                      ${activeSubTopic === item.id 
                        ? "bg-red-500/5 text-[#E84142] dark:bg-[#E84142]/10 dark:text-[#E84142] font-bold" 
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30 hover:text-zinc-900 dark:hover:text-zinc-200"}`}
                  >
                    <span>{item.label}</span>
                    {activeSubTopic === item.id && <span className="w-1.5 h-1.5 rounded-full bg-[#E84142]" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Category: GitHub Codebase */}
          {githubItems.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-2 mb-2 select-none font-sans">GitHub Codebase</h4>
              <div className="space-y-0.5">
                {githubItems.map(item => (
                  <button
                    key={item.id}
                    onClick={() => { setActiveDocTopic("github"); setActiveSubTopic(item.id); }}
                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold tracking-tight transition-all flex items-center justify-between group
                      ${activeSubTopic === item.id 
                        ? "bg-red-500/5 text-[#E84142] dark:bg-[#E84142]/10 dark:text-[#E84142] font-bold" 
                        : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/30 hover:text-zinc-900 dark:hover:text-zinc-200"}`}
                  >
                    <span>{item.label}</span>
                    {activeSubTopic === item.id && <span className="w-1.5 h-1.5 rounded-full bg-[#E84142]" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {primaryNetworkItems.length === 0 &&
           coreContractsItems.length === 0 &&
           sdkIntegrationItems.length === 0 &&
           sandboxItems.length === 0 &&
           githubItems.length === 0 && (
             <div className="text-zinc-400 dark:text-zinc-600 text-xs italic text-center py-8">
               No matches found
             </div>
           )}
        </div>

        {/* GitHub repo link at bottom of left sidebar */}
        <div className="pt-6 border-t border-zinc-200/60 dark:border-zinc-800/80 mt-6 shrink-0">
          <a 
            href="https://github.com/Soujanya-Mctrl/TrustMesh-protocol" 
            target="_blank" 
            rel="noreferrer" 
            className="flex items-center gap-2.5 px-3 py-2 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-900/40 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-all shadow-sm"
          >
            <svg className="w-4 h-4 fill-current text-zinc-600 dark:text-zinc-400" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.867 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
            <div className="flex-1 min-w-0">
              <div className="font-bold truncate text-[11px]">TrustMesh Repo</div>
              <div className="text-[9px] text-zinc-500 dark:text-zinc-500 font-semibold uppercase tracking-wider">GitHub Link</div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
          </a>
        </div>
      </aside>
    </div>

      {/* 2. Middle Content Pane (rendered as article) */}
      <article className="col-span-1 lg:col-span-2 xl:col-span-3 p-8 md:p-12 overflow-y-auto max-h-[calc(100vh-3.5rem)] bg-transparent">
        <div className="max-w-3xl mx-auto space-y-8">
          
          {/* Subtopic: Introduction */}
          {activeSubTopic === "intro" && (
            <div className="space-y-6">
              <div className="space-y-1.5 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="text-[10px] font-bold text-[#E84142] uppercase tracking-widest font-mono">Protocol Overview</div>
                <h2 className="text-3xl font-display font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Introduction to TrustMesh</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 font-medium">The Trust-Aware Agentic Payment Protocol powering autonomous secure transactions.</p>
              </div>
              
              <div className="text-sm leading-relaxed space-y-5 text-zinc-600 dark:text-zinc-400 font-medium">
                {/* One-Line Pitch Callout */}
                <div className="p-5 bg-red-500/5 dark:bg-[#E84142]/5 border border-[#E84142]/20 rounded-2xl relative overflow-hidden shadow-xs">
                  <div className="absolute top-0 left-0 w-1 h-full bg-[#E84142]" />
                  <p className="text-base font-bold text-[#E84142] italic">
                    "Kite tells your agent how to spend. TrustMesh tells your agent who to trust."
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-display font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">The Core Problem</h3>
                  <p>
                    The agentic economy is arriving faster than its trust infrastructure. AI agents are deployed to take real-world actions, including spending money. While agentic payment rails solve <em>how</em> agents pay, they lack a mechanism to determine <strong>WHO</strong> to trust when paying, and under <strong>WHAT</strong> terms. 
                  </p>
                  <p>
                    In an open network, counterparties are represented solely by anonymous wallets. Without evaluation, agents trust blindly, leaving them highly vulnerable to bad counterparties, manipulated reputation signals, or prompt injection attacks that hijack the agent's reasoning to release funds prematurely.
                  </p>
                </div>

                {/* The Technical Stack Card */}
                <div className="p-6 bg-zinc-50 dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl space-y-4">
                  <h3 className="text-sm font-display font-extrabold text-zinc-900 dark:text-zinc-200 uppercase tracking-wider">The TrustMesh Stack</h3>
                  <p className="text-xs">
                    TrustMesh serves as the trust-aware intelligence layer bridging raw payment rails and reputation primitives to enable safe, autonomous B2B agent interactions.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div className="p-4 bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 font-mono">
                        x402 Protocol
                      </div>
                      <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">The Spending Rail</h4>
                      <p className="text-[11px] text-zinc-500 leading-relaxed font-semibold">
                        An HTTP-native token payment standard built to handle programmatic machine-to-machine transfers.
                      </p>
                    </div>
                    <div className="p-4 bg-white dark:bg-[#131316] border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-2">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-bold text-zinc-500 font-mono">
                        ERC-8004 Registry
                      </div>
                      <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200">The Reputation Primitive</h4>
                      <p className="text-[11px] text-zinc-500 leading-relaxed font-semibold">
                        An on-chain decentralized registry storing raw agent identities and attestations on the Avalanche C-Chain.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-display font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">Weighted Multi-Signal Evaluation</h3>
                  <p>
                    Reputation alone is easily gameable via Sybil attacks and micro-transaction volume boosting. TrustMesh addresses this by compiling raw ERC-8004 data into a weighted composite trust score (0–100) using three independent on-chain signals:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    <li><strong>Transaction Value Weighting</strong>: High-value interactions are weighted heavily; gaming via micro-transactions yields minimal score increase.</li>
                    <li><strong>Recency Decay</strong>: Historical trust decays geometrically over time, ensuring agents must maintain active, consistent quality.</li>
                    <li><strong>Counterparty Diversity</strong>: Reviews from unique, highly-reputable agents carry high weight; self-referencing clusters (Sybils) are flagged automatically.</li>
                  </ul>
                </div>

                {/* The 3-Tier Routing Model Table */}
                <div className="space-y-3 pt-2">
                  <h3 className="text-base font-display font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight">Dynamic 3-Tier Payment Terms</h3>
                  <p>
                    Trust scores are evaluated in real-time within the Avalanche execution cycle, dynamically gating x402 payments through three risk-appropriate pathways:
                  </p>
                  <div className="overflow-hidden border border-zinc-200 dark:border-zinc-800 rounded-xl">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 font-bold text-zinc-400 select-none">
                          <th className="py-2.5 px-3">Tier</th>
                          <th className="py-2.5 px-3">Score Threshold</th>
                          <th className="py-2.5 px-3">Behavior &amp; Avalanche Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 font-semibold">
                        <tr className="hover:bg-zinc-50/20 dark:hover:bg-zinc-900/5">
                          <td className="py-2.5 px-3 text-emerald-500 font-bold">Tier 0 - Auto-Approve</td>
                          <td className="py-2.5 px-3">70 - 100</td>
                          <td className="py-2.5 px-3 text-zinc-500">Instant direct x402 settlement. Under 1-second finality on the C-Chain.</td>
                        </tr>
                        <tr className="hover:bg-zinc-50/20 dark:hover:bg-zinc-900/5">
                          <td className="py-2.5 px-3 text-amber-500 font-bold">Tier 1 - Escrow Vault</td>
                          <td className="py-2.5 px-3">40 - 69</td>
                          <td className="py-2.5 px-3 text-zinc-500">Funds locked in escrow contract. Released on verified cryptographic preimage reveal.</td>
                        </tr>
                        <tr className="hover:bg-zinc-50/20 dark:hover:bg-zinc-900/5">
                          <td className="py-2.5 px-3 text-red-500 font-bold">Tier 2 - Sandbox &amp; Escalate</td>
                          <td className="py-2.5 px-3">0 - 39</td>
                          <td className="py-2.5 px-3 text-zinc-500">Real execution sandbox simulation on an isolated Avalanche Subnet via AWM, escalating to human override.</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subtopic: Snowman Consensus */}
          {activeSubTopic === "consensus" && (
            <div className="space-y-6">
              <div className="space-y-1.5 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="text-[10px] font-bold text-[#E84142] uppercase tracking-widest font-mono">Primary Network</div>
                <h2 className="text-3xl font-display font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Snowman Consensus</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 font-medium">Uncover the Snowman consensus engine powering the C-Chain and L1 subnets.</p>
              </div>
              <div className="text-sm leading-relaxed space-y-4 text-zinc-600 dark:text-zinc-400 font-medium">
                <p>
                  <strong>Snowman</strong> is a developer-optimized, chain-based consensus protocol based on the Avalanche consensus family. It executes transaction finalization in linear order, making it perfect for EVM networks, smart contract blockchains, and subnets.
                </p>
                <p>
                  Unlike traditional proof-of-work or classic BFT protocols, Snowman achieves consensus through <strong>repeated random sub-sampling</strong>. Validating nodes repeatedly query a small random selection of peers to confirm if a block is valid. This process continues until a supermajority agrees, providing sub-second finality and infinite scale.
                </p>
              </div>
            </div>
          )}

          {/* Subtopic: AVAX & TMESH Token */}
          {activeSubTopic === "token" && (
            <div className="space-y-6">
              <div className="space-y-1.5 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="text-[10px] font-bold text-[#E84142] uppercase tracking-widest font-mono">Primary Network</div>
                <h2 className="text-3xl font-display font-black text-zinc-900 dark:text-zinc-50 tracking-tight">AVAX & TMESH Token</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 font-medium">Tokenomics, gas routing fees, and dynamic payment settlement.</p>
              </div>
              <div className="text-sm leading-relaxed space-y-4 text-zinc-600 dark:text-zinc-400 font-medium">
                <p>
                  Transactions on the Avalanche C-Chain require <strong>AVAX</strong> for gas fees, which are permanently burned on-chain to provide deflationary pressure.
                </p>
                <p>
                  Under the TrustMesh protocol, AI agents earn native token rewards (representing AVAX or TMESH tokens) dynamically based on their EIP-8004 reputation and performance. Settled micro-payments are either transferred directly (Tier 0) or locked in trust escrows (Tier 1) depending on the composite on-chain evaluation.
                </p>
              </div>
            </div>
          )}

          {/* Subtopic: Policy Engine */}
          {activeSubTopic === "policy" && (
            <div className="space-y-6">
              <div className="space-y-1.5 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="text-[10px] font-bold text-[#E84142] uppercase tracking-widest font-mono">Core Contracts</div>
                <h2 className="text-3xl font-display font-black text-zinc-900 dark:text-zinc-500 tracking-tight">Policy Engine</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-455 font-medium">The gateway contract evaluating execution tiers and human overrides.</p>
              </div>
              
              <div className="text-sm leading-relaxed space-y-5 text-zinc-600 dark:text-zinc-400 font-medium">
                <p>
                  The <code>PolicyEngine.sol</code> contract acts as the entrypoint for routing agent payments. It dynamically determines whether an interaction is safe to settle immediately, requires escrow lockup, or must be quarantined for human review.
                </p>

                <h3 className="text-xs font-display font-extrabold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Tier Evaluation Logic</h3>
                <p>
                  The core logic lies in the <code>evaluateTier</code> function, which queries the composite trust score of the counterparty from the <code>TrustRegistry</code> and maps it to a payment path:
                </p>

                {/* Code block */}
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs bg-zinc-50 dark:bg-zinc-900/40 relative">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950/20 text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider select-none">
                    <span>PolicyEngine.sol Snippet</span>
                  </div>
                  <pre className="p-4 overflow-x-auto whitespace-pre font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-300">
{`function evaluateTier(address payee, uint256 amountAvax) public returns (uint8) {
    ITrustRegistry.CompositeScoreResult memory r = ITrustRegistry(trustRegistry).getCompositeScore(payee);
    uint8 s = r.score;
    
    if (s >= 70) return 0; // Tier 0: Direct Pay
    if (s >= 40) return 1; // Tier 1: Escrow Vault
    
    // Tier 2: Quarantined & Human Review Required
    bytes32 jobId = keccak256(abi.encodePacked(payee, amountAvax, block.timestamp));
    emit HumanReviewRequired(jobId, payee, amountAvax, s, r.sybilFlagged);
    return 2;
}`}
                  </pre>
                </div>

                <h3 className="text-xs font-display font-extrabold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Human Override Resolver</h3>
                <p>
                  For Tier 2 transactions, direct transfer is disabled on-chain. An administrator must trigger the <code>recordHumanDecision</code> function to resolve the quarantined status:
                </p>

                {/* Code block */}
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs bg-zinc-50 dark:bg-zinc-900/40 relative">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950/20 text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider select-none">
                    <span>PolicyEngine.sol Snippet</span>
                  </div>
                  <pre className="p-4 overflow-x-auto whitespace-pre font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-300">
{`enum HumanDecision { Reject, ApproveWithEscrow, ApproveDirect }

function recordHumanDecision(bytes32 requestHash, HumanDecision decision, address human) public onlyAdmin {
    emit HumanDecisionRecorded(requestHash, decision, human);
    uint8 response = (decision == HumanDecision.Reject) ? 0 : 100;
    IValidationRegistry(validationRegistry).validationResponse(
        requestHash,
        response,
        "",
        bytes32(0),
        ""
    );
}`}
                  </pre>
                </div>
              </div>
            </div>
          )}          {/* Subtopic: Trust Registry */}
          {activeSubTopic === "trust" && (
            <div className="space-y-6">
              <div className="space-y-1.5 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="text-[10px] font-bold text-[#E84142] uppercase tracking-widest font-mono">Core Contracts</div>
                <h2 className="text-3xl font-display font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Trust Registry</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 font-medium">Dynamic score calculation and reputation caching contract.</p>
              </div>
              
              <div className="text-sm leading-relaxed space-y-5 text-zinc-600 dark:text-zinc-400 font-medium">
                <p>
                  The <code>TrustRegistry.sol</code> contract processes raw data from ERC-8004 registries and caches computed reputation metrics to save gas. It evaluates counterparties based on registration age, overall transaction volume, counterparty diversity, and Sybil cluster presence.
                </p>

                <h3 className="text-xs font-display font-extrabold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Gas Optimization Cache</h3>
                <p>
                  To prevent heavy C-Chain gas expenses, a TTL caching window is integrated into the score retrieval path:
                </p>

                {/* Code block */}
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs bg-zinc-50 dark:bg-zinc-900/40 relative">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950/20 text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider select-none">
                    <span>TrustRegistry.sol Snippet</span>
                  </div>
                  <pre className="p-4 overflow-x-auto whitespace-pre font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-300">
{`uint32 public constant CACHE_TTL = 60; // 60-second TTL cache

function getCompositeScore(address agentAddress) external returns (CompositeScoreResult memory result) {
    if (cache[agentAddress].cachedAt != 0 && block.timestamp <= uint256(cache[agentAddress].cachedAt) + CACHE_TTL) {
        emit ScoreComputed(agentAddress, cache[agentAddress].score, block.timestamp);
        return cache[agentAddress];
    }
    ...
}`}
                  </pre>
                </div>

                <h3 className="text-xs font-display font-extrabold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Scoring Formula &amp; Sybil Penalization</h3>
                <p>
                  Scores are calculated as a weighted sum of reputation (40%), registration age (20%), volume (20%), and diversity (20%). If the system detects a Sybil pattern (meaning a high percentage of micro-transactions), the diversity score and final score are heavily penalized:
                </p>

                {/* Code block */}
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs bg-zinc-50 dark:bg-zinc-900/40 relative">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950/20 text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider select-none">
                    <span>TrustRegistry.sol Snippet</span>
                  </div>
                  <pre className="p-4 overflow-x-auto whitespace-pre font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-300">
{`// Compute composite weighted rating
uint256 weighted = uint256(reputationScore) * 40 
                 + uint256(ageScore) * 20 
                 + uint256(volumeScore) * 20 
                 + uint256(diversityScore) * 20;
uint8 composite = uint8(weighted / 100);

// Sybil check: micro-transaction count > 60% of total transactions
bool isSybil = (uint256(micro) * 100) > (uint256(total) * 60);

if (isSybil) {
    composite = uint8(uint256(composite) * 30 / 100); // 70% penalty
}

cache[agentAddress].score = composite;
cache[agentAddress].sybilFlagged = isSybil;
cache[agentAddress].cachedAt = uint32(block.timestamp);`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Subtopic: Escrow Vault */}
          {activeSubTopic === "escrow" && (
            <div className="space-y-6">
              <div className="space-y-1.5 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="text-[10px] font-bold text-[#E84142] uppercase tracking-widest font-mono">Core Contracts</div>
                <h2 className="text-3xl font-display font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Escrow Vault</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 font-medium">The commit-lock-reveal micropayment isolation contract.</p>
              </div>
              
              <div className="text-sm leading-relaxed space-y-5 text-zinc-600 dark:text-zinc-400 font-medium">
                <p>
                  The <code>EscrowVault.sol</code> contract handles secure commit-lock-reveal micropayments for moderate-risk routes (Tier 1). Instead of paying the counterparty upfront, payers lock funds on-chain, which are released only upon cryptographically proving delivery of the correct result preimage.
                </p>

                <h3 className="text-xs font-display font-extrabold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Creating a Lockup</h3>
                <p>
                  Payers submit payments linked to the Keccak-256 deliverable expected hash:
                </p>

                {/* Code block */}
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs bg-zinc-50 dark:bg-zinc-900/40 relative">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950/20 text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider select-none">
                    <span>EscrowVault.sol Snippet</span>
                  </div>
                  <pre className="p-4 overflow-x-auto whitespace-pre font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-300">
{`function createEscrow(address payee, bytes32 expectedHash) external payable returns (uint256) {
    require(payee != address(0), "invalid payee");
    require(msg.value > 0, "zero value");
    require(openCount < MAX_OPEN_ESCROWS, "max open escrows");

    uint256 id = nextEscrowId++;
    escrows[id] = Escrow({
        payer: msg.sender,
        payee: payee,
        amount: msg.value,
        expectedHash: expectedHash,
        createdAt: uint64(block.timestamp),
        state: EscrowState.Pending
    });
    openCount++;

    emit EscrowCreated(id, msg.sender, payee, msg.value, expectedHash);
    return id;
}`}
                  </pre>
                </div>

                <h3 className="text-xs font-display font-extrabold text-zinc-900 dark:text-zinc-50 uppercase tracking-wider">Cryptographic Preimage Reveal</h3>
                <p>
                  To receive the locked funds, the payee must invoke `submitDeliverable` providing a hash matching the target `expectedHash` configured at creation:
                </p>

                {/* Code block */}
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs bg-zinc-50 dark:bg-zinc-900/40 relative">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950/20 text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider select-none">
                    <span>EscrowVault.sol Snippet</span>
                  </div>
                  <pre className="p-4 overflow-x-auto whitespace-pre font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-300">
{`function submitDeliverable(uint256 escrowId, bytes32 deliverableHash) external nonReentrant {
    Escrow storage e = escrows[escrowId];
    require(e.payee != address(0), "not found");
    require(e.state == EscrowState.Pending, "not pending");
    require(msg.sender == e.payee, "only payee");

    require(deliverableHash == e.expectedHash, "Hash mismatch");
    emit DeliverableSubmitted(escrowId, msg.sender, deliverableHash, true);

    e.state = EscrowState.Released;
    openCount--;
    uint256 amount = e.amount;
    e.amount = 0;
    
    _safeTransfer(e.payee, amount);
    emit EscrowReleased(escrowId, e.payee, amount);
}`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Subtopic: TrustMesh Client */}
          {activeSubTopic === "client" && (
            <div className="space-y-6">
              <div className="space-y-1.5 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="text-[10px] font-bold text-[#E84142] uppercase tracking-widest font-mono">SDK Integration</div>
                <h2 className="text-3xl font-display font-black text-zinc-900 dark:text-zinc-50 tracking-tight">TrustMesh Client</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 font-medium">Initializing the TypeScript Client SDK.</p>
              </div>
              <div className="text-sm leading-relaxed space-y-4 text-zinc-600 dark:text-zinc-400 font-medium">
                <p>
                  Install <code>@trustmesh/sdk</code> and initialize the client configuration. The client provides high-level APIs to evaluate, pay, and monitor AI agent transactions.
                </p>
                
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs bg-zinc-50 dark:bg-zinc-900/40 relative">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950/20 text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider select-none">
                    <span>TypeScript SDK</span>
                    <button 
                      onClick={() => handleCopyText(`import { TrustMeshClient } from "@trustmesh/sdk";\n\nconst client = new TrustMeshClient({\n  rpcUrl: "http://127.0.0.1:8545",\n  policyEngineAddress: "0xacd669a573bcdd4cd4a27a906db229e7f2e35e2f",\n  walletPrivateKey: "0x59c699..."\n});`, 201)}
                      className="px-2.5 py-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-bold text-[9px] uppercase transition-all"
                    >
                      {copiedAgentId === 201 ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto whitespace-pre font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-300">
{`import { TrustMeshClient } from "@trustmesh/sdk";

const client = new TrustMeshClient({
  rpcUrl: "http://127.0.0.1:8545",
  policyEngineAddress: "0xacd669a573bcdd4cd4a27a906db229e7f2e35e2f",
  walletPrivateKey: "0x59c699..."
});`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Subtopic: Tiers Routing */}
          {activeSubTopic === "routing" && (
            <div className="space-y-6">
              <div className="space-y-1.5 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="text-[10px] font-bold text-[#E84142] uppercase tracking-widest font-mono">SDK Integration</div>
                <h2 className="text-3xl font-display font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Tiers Routing</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 font-medium">Dynamic routing execution flow using the client pay API.</p>
              </div>
              <div className="text-sm leading-relaxed space-y-4 text-zinc-600 dark:text-zinc-400 font-medium">
                <p>
                  The <code>client.pay(...)</code> method evaluates the counterparty score on-chain and routes the transaction through Tier 0, Tier 1, or Tier 2.
                </p>
                
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs bg-zinc-50 dark:bg-zinc-900/40 relative">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950/20 text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider select-none">
                    <span>TypeScript SDK</span>
                    <button 
                      onClick={() => handleCopyText(`const tx = await client.pay(\n  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",\n  "1000000000000000", // 0.001 AVAX\n  "http://localhost:3001/request-service",\n  "Perform transaction verification"\n);`, 202)}
                      className="px-2.5 py-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-bold text-[9px] uppercase transition-all"
                    >
                      {copiedAgentId === 202 ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto whitespace-pre font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-300">
{`const tx = await client.pay(
  "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
  "1000000000000000", // 0.001 AVAX
  "http://localhost:3001/request-service",
  "Perform transaction verification"
);`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Subtopic: Event Handlers */}
          {activeSubTopic === "events" && (
            <div className="space-y-6">
              <div className="space-y-1.5 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="text-[10px] font-bold text-[#E84142] uppercase tracking-widest font-mono">SDK Integration</div>
                <h2 className="text-3xl font-display font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Event Handlers</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 font-medium">Subscribing to routing and transaction lifecycle events.</p>
              </div>
              <div className="text-sm leading-relaxed space-y-4 text-zinc-600 dark:text-zinc-400 font-medium">
                <p>
                  The SDK client triggers event hooks as the transaction settles on the blockchain:
                </p>
                
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs bg-zinc-50 dark:bg-zinc-900/40 relative">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950/20 text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider select-none">
                    <span>TypeScript SDK</span>
                    <button 
                      onClick={() => handleCopyText(`client.on("tier_assigned", (data) => {\n  console.log(\`Routed to Tier \${data.tier} (Composite Score: \${data.compositeScore})\`);\n});\n\nclient.on("escrow_created", (data) => {\n  console.log(\`Escrow locked in Vault: \${data.txHash}\`);\n});`, 203)}
                      className="px-2.5 py-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-bold text-[9px] uppercase transition-all"
                    >
                      {copiedAgentId === 203 ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto whitespace-pre font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-300">
{`client.on("tier_assigned", (data) => {
  console.log(\`Routed to Tier \${data.tier} (Composite Score: \${data.compositeScore})\`);
});

client.on("escrow_created", (data) => {
  console.log(\`Escrow locked in Vault: \${data.txHash}\`);
});`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Subtopic: Subnet Deployment */}
          {activeSubTopic === "deploy" && (
            <div className="space-y-6">
              <div className="space-y-1.5 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="text-[10px] font-bold text-[#E84142] uppercase tracking-widest font-mono">Local L1 Sandbox</div>
                <h2 className="text-3xl font-display font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Subnet Deployment</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 font-medium">Create and deploy a custom EVM Subnet locally.</p>
              </div>
              <div className="text-sm leading-relaxed space-y-4 text-zinc-600 dark:text-zinc-400 font-medium">
                <p>
                  Spin up a local node and create a custom subnet blockchain token (TMESH) with the Avalanche CLI:
                </p>
                
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs bg-zinc-50 dark:bg-zinc-900/40 relative">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950/20 text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider select-none">
                    <span>Shell Instructions</span>
                    <button 
                      onClick={() => handleCopyText(`# 1. Clean previous state\navalanche network clean --hard\n\n# 2. Create the configuration\navalanche blockchain create trustmesh --evm --latest --evm-chain-id 12345 --evm-token TMESH --test-defaults --force\n\n# 3. Spawns L1 node locally\navalanche blockchain deploy trustmesh --local`, 204)}
                      className="px-2.5 py-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-bold text-[9px] uppercase transition-all"
                    >
                      {copiedAgentId === 204 ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto whitespace-pre font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-300">
{`# 1. Clean previous state
avalanche network clean --hard

# 2. Create the configuration
avalanche blockchain create trustmesh --evm --latest --evm-chain-id 12345 --evm-token TMESH --test-defaults --force

# 3. Spawns L1 node locally
avalanche blockchain deploy trustmesh --local`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Subtopic: Reputation Seeding */}
          {activeSubTopic === "seeding" && (
            <div className="space-y-6">
              <div className="space-y-1.5 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="text-[10px] font-bold text-[#E84142] uppercase tracking-widest font-mono">Local L1 Sandbox</div>
                <h2 className="text-3xl font-display font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Reputation Seeding</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 font-medium">Seed initial agent metrics and EIP-8004 reviews.</p>
              </div>
              <div className="text-sm leading-relaxed space-y-4 text-zinc-600 dark:text-zinc-400 font-medium">
                <p>
                  To seed the initial agent reputations, run the setup scripts. This deploys the contracts and writes mock reviews directly onto the sandbox:
                </p>
                
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs bg-zinc-50 dark:bg-zinc-900/40 relative">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950/20 text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider select-none">
                    <span>Shell Instructions</span>
                    <button 
                      onClick={() => handleCopyText(`npm run l1:setup`, 205)}
                      className="px-2.5 py-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-bold text-[9px] uppercase transition-all"
                    >
                      {copiedAgentId === 205 ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto whitespace-pre font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-300">
{`# Deploys contracts and seeds reputations
npm run l1:setup`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Subtopic: E2E Testing */}
          {activeSubTopic === "testing" && (
            <div className="space-y-6">
              <div className="space-y-1.5 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="text-[10px] font-bold text-[#E84142] uppercase tracking-widest font-mono">Local L1 Sandbox</div>
                <h2 className="text-3xl font-display font-black text-zinc-900 dark:text-zinc-50 tracking-tight">E2E Testing</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 font-medium">Verify routing tiers and automated validation rules.</p>
              </div>
              <div className="text-sm leading-relaxed space-y-4 text-zinc-600 dark:text-zinc-400 font-medium">
                <p>
                  Start the HTTP agent servers in one terminal window and trigger execution scenarios via the orchestrator:
                </p>
                
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs bg-zinc-50 dark:bg-zinc-900/40 relative">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950/20 text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider select-none">
                    <span>Shell Instructions</span>
                    <button 
                      onClick={() => handleCopyText(`# Start the agent microservice endpoints\nnpm run agents\n\n# In a separate terminal, trigger orchestrator scenario\nnpm run demo`, 206)}
                      className="px-2.5 py-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-bold text-[9px] uppercase transition-all"
                    >
                      {copiedAgentId === 206 ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <pre className="p-4 overflow-x-auto whitespace-pre font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-300">
{`# Start the agent microservice endpoints
npm run agents

# In a separate terminal, trigger orchestrator scenario
npm run demo`}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Subtopic: Source Repository */}
          {activeSubTopic === "repo" && (
            <div className="space-y-6">
              <div className="space-y-1.5 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="text-[10px] font-bold text-[#E84142] uppercase tracking-widest font-mono">GitHub Codebase</div>
                <h2 className="text-3xl font-display font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Source Repository</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 font-medium">Clone the open-source repository and review the codebase.</p>
              </div>
              <div className="text-sm leading-relaxed space-y-4 text-zinc-600 dark:text-zinc-400 font-medium">
                <p>
                  The TrustMesh repository contains the Solidity smart contracts, TypeScript SDK client, orchestrator, and dashboard in a monorepo setup.
                </p>
                
                <div className="p-5 bg-zinc-50/50 dark:bg-zinc-900/30 border border-zinc-300/60 dark:border-zinc-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                      <svg className="w-4 h-4 fill-current animate-pulse" viewBox="0 0 24 24">
                        <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.867 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.577.688.479C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                      </svg>
                      Soujanya-Mctrl / TrustMesh-protocol
                    </div>
                    <div className="text-xs text-zinc-500">Official open source repository hosting core protocols and dashboard.</div>
                  </div>
                  <a
                    href="https://github.com/Soujanya-Mctrl/TrustMesh-protocol"
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-[#E84142] hover:bg-[#d63435] text-white rounded-xl font-bold flex items-center gap-1.5 transition text-xs select-none shadow-sm active:scale-[0.98]"
                  >
                    View on GitHub
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Subtopic: Directory Layout */}
          {activeSubTopic === "structure" && (
            <div className="space-y-6">
              <div className="space-y-1.5 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="text-[10px] font-bold text-[#E84142] uppercase tracking-widest font-mono">GitHub Codebase</div>
                <h2 className="text-3xl font-display font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Directory Layout</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 font-medium">Tree layout of packages, contracts, and frontend folders.</p>
              </div>
              <div className="text-sm leading-relaxed space-y-4 text-zinc-600 dark:text-zinc-400 font-medium">
                
                <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-xs bg-zinc-50 dark:bg-zinc-900/40 relative">
                  <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/50 dark:bg-zinc-950/20 text-[10px] font-mono text-zinc-500 font-bold uppercase tracking-wider select-none">
                    <span>Monorepo Tree</span>
                    <button 
                      onClick={() => handleCopyText(`trust_mesh/\n├── contracts/\t\t# Solidity files (Hardhat)\n├── packages/sdk/\t# TypeScript Client SDK\n├── apps/\n│   ├── orchestrator/\t# AI Orchestrator CLI\n│   ├── agents/\t\t# Specialist HTTP microservices\n│   └── dashboard/\t# Next.js admin visualizer`, 208)}
                      className="px-2.5 py-1 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-bold text-[9px] uppercase transition-all"
                    >
                      {copiedAgentId === 208 ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div className="p-5 font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-300 space-y-1">
                    <div className="text-[#E84142] font-black">trust_mesh/</div>
                    <div>├── <span className="font-bold">contracts/</span> <span className="text-zinc-400 dark:text-zinc-500"># Solidity files (Hardhat)</span></div>
                    <div>├── <span className="font-bold">packages/sdk/</span> <span className="text-zinc-400 dark:text-zinc-500"># TypeScript Client SDK</span></div>
                    <div>├── <span className="font-bold">apps/</span></div>
                    <div>│   ├── <span className="font-bold">orchestrator/</span> <span className="text-zinc-400 dark:text-zinc-500"># AI Orchestrator CLI</span></div>
                    <div>│   ├── <span className="font-bold">agents/</span> <span className="text-zinc-400 dark:text-zinc-500"># Specialist HTTP microservices</span></div>
                    <div>│   └── <span className="font-bold">dashboard/</span> <span className="text-zinc-400 dark:text-zinc-500"># Next.js admin visualizer</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subtopic: Contribution Guide */}
          {activeSubTopic === "contribute" && (
            <div className="space-y-6">
              <div className="space-y-1.5 pb-4 border-b border-zinc-200 dark:border-zinc-800/80">
                <div className="text-[10px] font-bold text-[#E84142] uppercase tracking-widest font-mono">GitHub Codebase</div>
                <h2 className="text-3xl font-display font-black text-zinc-900 dark:text-zinc-50 tracking-tight">Contribution Guide</h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-500 font-medium">Submit Pull Requests, report bugs, and suggest features.</p>
              </div>
              <div className="text-sm leading-relaxed space-y-4 text-zinc-600 dark:text-zinc-400 font-medium">
                <p>
                  We welcome open-source contributions. To contribute:
                </p>
                <ol className="list-decimal pl-5 space-y-2 text-zinc-600 dark:text-zinc-400 leading-relaxed font-semibold">
                  <li>Fork the repository and create your feature branch.</li>
                  <li>Ensure tests pass locally by running <code>npx hardhat test</code> in the contracts folder.</li>
                  <li>Open a Pull Request detailing the bug fix or feature enhancement.</li>
                </ol>
              </div>
            </div>
          )}

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-8 border-t border-zinc-200 dark:border-zinc-800/80 mt-12 select-none">
            {prevPage ? (
              <button 
                onClick={() => { setActiveDocTopic(prevPage.category); setActiveSubTopic(prevPage.id); }}
                className="flex flex-col items-start gap-1 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-[#E84142]/45 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition text-left group"
              >
                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Previous</span>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-[#E84142] transition-colors">← {prevPage.label}</span>
              </button>
            ) : <div />}

            {nextPage ? (
              <button 
                onClick={() => { setActiveDocTopic(nextPage.category); setActiveSubTopic(nextPage.id); }}
                className="flex flex-col items-end gap-1 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-[#E84142]/45 hover:bg-zinc-50 dark:hover:bg-zinc-900/30 transition text-right group"
              >
                <span className="text-[9px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">Next</span>
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 group-hover:text-[#E84142] transition-colors">{nextPage.label} →</span>
              </button>
            ) : <div />}
          </div>

        </div>
      </article>

      {/* 3. Right Sidebar (On this page & Actions) */}
      <div className="hidden lg:block lg:col-span-1 border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50/10 dark:bg-zinc-950/5">
        <aside className="p-6 max-h-[calc(100vh-3.5rem)] overflow-y-auto sticky top-14 space-y-6">
        
        {/* Section: On this page */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 select-none">
            <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">On this page</h4>
          </div>
          <div className="flex flex-col gap-2 pl-1 border-l border-zinc-200 dark:border-zinc-800 text-[11px] font-semibold text-zinc-500">
            {activeSubTopic === "intro" && (
              <>
                <span className="text-[#E84142] border-l-2 border-[#E84142] pl-3 -ml-px font-bold">Introduction Overview</span>
                <span className="opacity-80 pl-3">Subnet Topology</span>
              </>
            )}
            {activeSubTopic === "consensus" && (
              <>
                <span className="text-[#E84142] border-l-2 border-[#E84142] pl-3 -ml-px font-bold">Snowman Consensus Engine</span>
                <span className="opacity-80 pl-3">Repeated Random Sub-sampling</span>
              </>
            )}
            {activeSubTopic === "token" && (
              <>
                <span className="text-[#E84142] border-l-2 border-[#E84142] pl-3 -ml-px font-bold">Burn Mechanics</span>
                <span className="opacity-80 pl-3">Performance Incentives</span>
              </>
            )}
            {activeSubTopic === "policy" && (
              <>
                <span className="text-[#E84142] border-l-2 border-[#E84142] pl-3 -ml-px font-bold">Policy Rules</span>
                <span className="opacity-80 pl-3">Routing Decisions</span>
              </>
            )}
            {activeSubTopic === "trust" && (
              <>
                <span className="text-[#E84142] border-l-2 border-[#E84142] pl-3 -ml-px font-bold">Composite Scores</span>
                <span className="opacity-80 pl-3">GAS Optimization & TTL</span>
              </>
            )}
            {activeSubTopic === "escrow" && (
              <>
                <span className="text-[#E84142] border-l-2 border-[#E84142] pl-3 -ml-px font-bold">micropayments Commit</span>
                <span className="opacity-80 pl-3">Lock and Cryptographic Reveal</span>
              </>
            )}
            {activeSubTopic === "client" && (
              <>
                <span className="text-[#E84142] border-l-2 border-[#E84142] pl-3 -ml-px font-bold">Client Instantiation</span>
                <span className="opacity-80 pl-3">Parameters Map</span>
              </>
            )}
            {activeSubTopic === "routing" && (
              <>
                <span className="text-[#E84142] border-l-2 border-[#E84142] pl-3 -ml-px font-bold">Routing API</span>
                <span className="opacity-80 pl-3">Tier Resolution</span>
              </>
            )}
            {activeSubTopic === "events" && (
              <>
                <span className="text-[#E84142] border-l-2 border-[#E84142] pl-3 -ml-px font-bold">Settlement Callback Hooks</span>
                <span className="opacity-80 pl-3">Event Schema</span>
              </>
            )}
            {activeSubTopic === "deploy" && (
              <>
                <span className="text-[#E84142] border-l-2 border-[#E84142] pl-3 -ml-px font-bold">avalanche deploy command</span>
                <span className="opacity-80 pl-3">Local Node Setup</span>
              </>
            )}
            {activeSubTopic === "seeding" && (
              <>
                <span className="text-[#E84142] border-l-2 border-[#E84142] pl-3 -ml-px font-bold">Hardhat Seed Task</span>
                <span className="opacity-80 pl-3">Agent Seeding Metrics</span>
              </>
            )}
            {activeSubTopic === "testing" && (
              <>
                <span className="text-[#E84142] border-l-2 border-[#E84142] pl-3 -ml-px font-bold">Testing Orchestration</span>
                <span className="opacity-80 pl-3">Run E2E Scenario</span>
              </>
            )}
            {activeSubTopic === "repo" && (
              <>
                <span className="text-[#E84142] border-l-2 border-[#E84142] pl-3 -ml-px font-bold">GitHub Redirect</span>
                <span className="opacity-80 pl-3">Cloning Setup</span>
              </>
            )}
            {activeSubTopic === "structure" && (
              <>
                <span className="text-[#E84142] border-l-2 border-[#E84142] pl-3 -ml-px font-bold">Directory setup</span>
                <span className="opacity-80 pl-3">Apps vs Packages setup</span>
              </>
            )}
            {activeSubTopic === "contribute" && (
              <>
                <span className="text-[#E84142] border-l-2 border-[#E84142] pl-3 -ml-px font-bold">PR Contributions</span>
                <span className="opacity-80 pl-3">Testing & Override rules</span>
              </>
            )}
          </div>
        </div>

        {/* Section: Page Actions */}
        <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800/80">
          <h4 className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest px-1 select-none">Page Actions</h4>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                const docTexts: Record<string, string> = {
                  intro: "# Primary Network - Introduction\nAvalanche is a heterogeneous network of blockchains...",
                  consensus: "# Primary Network - Snowman Consensus\nSnowman is a developer-optimized linear consensus protocol...",
                  token: "# Primary Network - AVAX & TMESH Token\nTransactions on the Avalanche C-Chain require AVAX...",
                  policy: "# Core Contracts - Policy Engine\nThe PolicyEngine evaluates counterparty risks dynamically...",
                  trust: "# Core Contracts - Trust Registry\nThe TrustRegistry computes composite ratings based on reputation...",
                  escrow: "# Core Contracts - Escrow Vault\nEscrowVault handles micropayments...",
                  client: "# SDK Integration - TrustMesh Client\nInstall @trustmesh/sdk and construct the client...",
                  routing: "# SDK Integration - Tiers Routing\nThe client pay API dynamically routes through settlement tiers...",
                  events: "# SDK Integration - Event Handlers\nSubscribe to on-chain routing and settlement events...",
                  deploy: "# Local L1 Sandbox - Subnet Deployment\nCreate and deploy isolated local L1 subnets...",
                  seeding: "# Local L1 Sandbox - Reputation Seeding\nDeploy contracts and seed mock reviews on Hardhat...",
                  testing: "# Local L1 Sandbox - E2E Testing\nRun E2E scenarios via orchestrator CLI CLI...",
                  repo: "# GitHub Codebase - Source Repository\nAccess source files on the official GitHub repo...",
                  structure: "# GitHub Codebase - Directory Layout\nMonorepo directory setup for packages, apps, and dashboard...",
                  contribute: "# GitHub Codebase - Contribution Guide\nHow to open Pull Requests and forks on GitHub..."
                };
                const text = docTexts[activeSubTopic] || "";
                navigator.clipboard.writeText(text);
                handleCopyText(text, 207);
              }}
              className="w-full py-2 px-3 bg-white hover:bg-zinc-500/10 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-semibold flex items-center justify-between text-zinc-705 dark:text-zinc-300 transition-all shadow-xs"
            >
              <span className="flex items-center gap-2"><Copy className="w-3.5 h-3.5" /> Copy Markdown</span>
              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                {copiedAgentId === 207 ? "Copied!" : "MD"}
              </span>
            </button>
          </div>
        </div>
      </aside>
    </div>

  </div>
  );
}
