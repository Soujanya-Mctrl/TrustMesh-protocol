import assert from "node:assert/strict";
import { describe, it } from "node:test";

import hre from "hardhat";

describe("TrustRegistry composite scoring", async function () {
  it("computes composite score and caches result", async function () {
    const { viem } = await hre.network.getOrCreate();

    const agentA = "0x0000000000000000000000000000000000000002";
    const zero = "0x0000000000000000000000000000000000000000";

    const trustRegistry = await viem.deployContract("TrustRegistry", [zero, zero, zero]);

    // Seed identity and reputation for agentA using admin seeding helpers
    const now = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 100; // 100 days ago
    await trustRegistry.write.seedRegistered([agentA, true, BigInt(now)]);
    await trustRegistry.write.seedReputation([agentA, 80]);

    // Seed agent metrics: settledUsd18 = $5000 -> txValueWeightScore = 50
    const settledUsd18 = BigInt(5000) * BigInt(1000000000000000000);
    await trustRegistry.write.seedAgentMetrics([agentA, [settledUsd18, 10, 1, 20]]);

    await trustRegistry.write.getCompositeScore([agentA]);
    const decoded = (await trustRegistry.read.getCachedScore([agentA])) as {
      score?: bigint | number;
      0?: bigint | number;
    };
    const cachedScore = decoded.score !== undefined ? decoded.score : decoded[0];

    // ensure cached score is present and between 0 and 100
    assert.ok(Number(cachedScore) <= 100);
    assert.ok(Number(cachedScore) >= 0);
  });

  it("applies penalty for low feedback count (< 3)", async function () {
    const { viem } = await hre.network.getOrCreate();
    const agentA = "0x0000000000000000000000000000000000000002";
    const zero = "0x0000000000000000000000000000000000000000";

    const trustRegistry = await viem.deployContract("TrustRegistry", [zero, zero, zero]);

    const now = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 180; // 180 days (max age score)
    await trustRegistry.write.seedRegistered([agentA, true, BigInt(now)]);
    await trustRegistry.write.seedReputation([agentA, 100]); // raw reputation = 100
    await trustRegistry.write.seedFeedbackCount([agentA, 2n]); // < 3 feedbacks -> 50% penalty -> reputation score = 50

    // Seed agent metrics: $10k volume (max = 100), 50 counterparties (max = 100)
    const settledUsd18 = BigInt(10000) * BigInt(1e18);
    await trustRegistry.write.seedAgentMetrics([agentA, [settledUsd18, 100, 0, 50]]);

    await trustRegistry.write.getCompositeScore([agentA]);
    const decoded = (await trustRegistry.read.getCachedScore([agentA])) as any;
    const score = Number(decoded.score ?? decoded[0]);

    // Expected score calculation:
    // reputationScore = 50 (due to penalty)
    // ageScore = 100
    // volumeScore = 100
    // diversityScore = 100
    // weighted = (50 * 0.40) + (100 * 0.20) + (100 * 0.20) + (100 * 0.20) = 20 + 20 + 20 + 20 = 80
    assert.equal(score, 80);
  });

  it("applies penalty for Sybil flags (> 60% micro-transactions)", async function () {
    const { viem } = await hre.network.getOrCreate();
    const agentA = "0x0000000000000000000000000000000000000002";
    const zero = "0x0000000000000000000000000000000000000000";

    const trustRegistry = await viem.deployContract("TrustRegistry", [zero, zero, zero]);

    const now = Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 180; // 180 days (max age score)
    await trustRegistry.write.seedRegistered([agentA, true, BigInt(now)]);
    await trustRegistry.write.seedReputation([agentA, 100]); 
    await trustRegistry.write.seedFeedbackCount([agentA, 5n]); // no feedback penalty

    // Seed agent metrics: $10k volume, 100 total txs, 61 micro-txs (> 60% micro -> Sybil flagged)
    // distinct counterparties = 50 (max = 100 diversity score)
    // Sybil flag details:
    // 1. diversityScore = 100 * 0.1 = 10
    // 2. final score = composite * 0.3
    const settledUsd18 = BigInt(10000) * BigInt(1e18);
    await trustRegistry.write.seedAgentMetrics([agentA, [settledUsd18, 100, 61, 50]]);

    await trustRegistry.write.getCompositeScore([agentA]);
    const decoded = (await trustRegistry.read.getCachedScore([agentA])) as any;
    const score = Number(decoded.score ?? decoded[0]);

    // Expected score calculation:
    // reputationScore = 100
    // ageScore = 100
    // volumeScore = 100
    // diversityScore = 100 * 0.1 = 10 (Sybil penalised)
    // composite = (100 * 0.40) + (100 * 0.20) + (100 * 0.20) + (10 * 0.20) = 40 + 20 + 20 + 2 = 82
    // finalScore = composite * 0.3 = 82 * 0.3 = 24.6 -> floor/uint8 cast = 24
    assert.equal(score, 24);
  });
});
