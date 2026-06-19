import assert from "node:assert/strict";
import { describe, it } from "node:test";
import hre from "hardhat";

describe("TrustMesh Unified Protocol Suite", async function () {
  const zero = "0x0000000000000000000000000000000000000000";

  async function deployFixture() {
    const net = await hre.network.getOrCreate();
    const { viem } = net;
    const [deployer, payer, payee, validator] = await viem.getWalletClients();

    // 1. Deploy Identity Registry
    const identityRegistry = await viem.deployContract("IdentityRegistry", []);

    // 2. Deploy Reputation Registry
    const reputationRegistry = await viem.deployContract("ReputationRegistry", [
      identityRegistry.address,
    ]);

    // 3. Deploy Validation Registry
    const validationRegistry = await viem.deployContract("ValidationRegistry", [
      identityRegistry.address,
    ]);

    // 4. Deploy Agent Metrics Registry
    const metricsRegistry = await viem.deployContract("AgentMetricsRegistry", [
      zero,
      0n,
    ]);

    // 5. Deploy Trust Registry
    const trustRegistry = await viem.deployContract("TrustRegistry", [
      identityRegistry.address,
      reputationRegistry.address,
      metricsRegistry.address,
    ]);

    // 6. Deploy Escrow Vault
    const escrowVault = await viem.deployContract("EscrowVault", [
      metricsRegistry.address,
    ]);

    // 7. Deploy Policy Engine
    const policyEngine = await viem.deployContract("PolicyEngine", [
      metricsRegistry.address,
      trustRegistry.address,
      validationRegistry.address,
    ]);

    // Setup permissions
    await metricsRegistry.write.authorizeSettler([escrowVault.address, true]);
    await metricsRegistry.write.authorizeSettler([policyEngine.address, true]);
    await validationRegistry.write.setAuthorizedWriter([policyEngine.address, true]);
    await policyEngine.write.addFacilitator([deployer.account.address]);

    return {
      net,
      viem,
      deployer,
      payer,
      payee,
      validator,
      identityRegistry,
      reputationRegistry,
      validationRegistry,
      metricsRegistry,
      trustRegistry,
      escrowVault,
      policyEngine,
    };
  }

  describe("Tier 0 - Direct Settlements", function () {
    it("should route to Tier 0 and record direct settlements", async function () {
      const {
        deployer,
        payee,
        identityRegistry,
        reputationRegistry,
        metricsRegistry,
        trustRegistry,
        policyEngine,
      } = await deployFixture();

      // Register payee identity to establish trust baseline
      await identityRegistry.write.registerFor([
        payee.account.address,
        "ipfs://payee-metadata",
        [],
      ]);
      const agentId = 1n; // first agent registered

      // Seed high reputation on ReputationRegistry
      await reputationRegistry.write.giveFeedback([
        agentId,
        5n, // 5 stars average
        0,
        "reliable,fast",
        "",
        "",
        "",
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      ]);
      await reputationRegistry.write.giveFeedback([
        agentId,
        5n,
        0,
        "excellent",
        "",
        "",
        "",
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      ]);
      await reputationRegistry.write.giveFeedback([
        agentId,
        5n,
        0,
        "superb",
        "",
        "",
        "",
        "0x0000000000000000000000000000000000000000000000000000000000000000",
      ]);

      // Seed high volume on metrics registry
      const settledUsd18 = BigInt(8000) * BigInt(1e18); // $8,000 settled
      await metricsRegistry.write.seedMetrics([
        payee.account.address,
        [settledUsd18, 50, 1, 30], // settledUsd, totalTxs, microTxs, counterparties
      ]);

      // Override registration time to be historical (e.g. 180 days ago for maximum age score)
      const historicalTime = BigInt(Math.floor(Date.now() / 1000) - 180 * 24 * 60 * 60);
      await identityRegistry.write.setRegistrationTime([agentId, historicalTime]);

      // Calculate composite score
      await trustRegistry.write.getCompositeScore([payee.account.address]);
      const scoreResult = await trustRegistry.read.getCachedScore([payee.account.address]) as any;
      const score = Number(scoreResult.score ?? scoreResult[0]);
      assert.ok(score >= 70, `Score ${score} should be >= 70 for Tier 0`);

      // Evaluate tier on PolicyEngine
      const tier = await policyEngine.write.decideAndEmit([
        deployer.account.address,
        payee.account.address,
        1000000000000000000n, // 1 AVAX
      ]);

      // Record direct settlement via PolicyEngine (simulating Tier 0 facilitator transaction)
      const txVolume = BigInt(500) * BigInt(1e18); // $500 value
      await policyEngine.write.recordDirectSettlement([
        deployer.account.address,
        payee.account.address,
        1000000000000000000n,
        txVolume,
      ]);

      // Verify payee metrics are updated
      const metrics = await metricsRegistry.read.getMetrics([payee.account.address]) as any;
      const volume = metrics.settledVolumeUsd18 !== undefined ? metrics.settledVolumeUsd18 : metrics[0];
      const totalTxs = metrics.totalSettledTransactions !== undefined ? metrics.totalSettledTransactions : metrics[1];
      assert.equal(BigInt(volume), settledUsd18 + txVolume);
      assert.equal(BigInt(totalTxs), 51n);
    });
  });

  describe("Tier 1 - Escrows", function () {
    it("should route to Tier 1, support lock release, and timeout refunds", async function () {
      const {
        net,
        viem,
        payer,
        payee,
        identityRegistry,
        reputationRegistry,
        metricsRegistry,
        trustRegistry,
        escrowVault,
        policyEngine,
      } = await deployFixture();

      // Register payee identity
      await identityRegistry.write.registerFor([
        payee.account.address,
        "ipfs://payee-metadata",
        [],
      ]);
      const agentId = 1n;

      // Seed moderate reputation (3 feedbacks, 4 stars average)
      await reputationRegistry.write.giveFeedback([agentId, 4n, 0, "good", "", "", "", "0x0000000000000000000000000000000000000000000000000000000000000000"]);
      await reputationRegistry.write.giveFeedback([agentId, 4n, 0, "fine", "", "", "", "0x0000000000000000000000000000000000000000000000000000000000000000"]);
      await reputationRegistry.write.giveFeedback([agentId, 4n, 0, "ok", "", "", "", "0x0000000000000000000000000000000000000000000000000000000000000000"]);

      // Seed moderate volume metrics
      const settledUsd18 = BigInt(3000) * BigInt(1e18); // $3,000 settled
      await metricsRegistry.write.seedMetrics([
        payee.account.address,
        [settledUsd18, 20, 0, 10],
      ]);

      // Calculate composite score (should fall in Tier 1: 40 <= score < 70)
      await trustRegistry.write.getCompositeScore([payee.account.address]);
      const scoreResult = await trustRegistry.read.getCachedScore([payee.account.address]) as any;
      const score = Number(scoreResult.score ?? scoreResult[0]);
      assert.ok(score >= 40 && score < 70, `Score ${score} should be in Tier 1 [40, 70)`);

      // Evaluate tier on PolicyEngine (returns 1)
      const evaluateTx = await policyEngine.write.decideAndEmit([
        payer.account.address,
        payee.account.address,
        1000000000000000000n,
      ]);

      // --- Release Escrow Path ---
      const expectedHash = "0x" + "aa".repeat(32);
      const amount = 1000000000000000000n; // 1 AVAX

      // Payer creates escrow
      const escrowAsPayer = await viem.getContractAt(
        "EscrowVault",
        escrowVault.address,
        { client: { wallet: payer } },
      );
      await escrowAsPayer.write.createEscrow([payee.account.address, expectedHash], {
        value: amount,
      });

      // Confirm escrow is recorded
      const escrowDetails = await escrowVault.read.escrows([1n]) as any;
      const escPayer = escrowDetails.payer !== undefined ? escrowDetails.payer : escrowDetails[0];
      const escPayee = escrowDetails.payee !== undefined ? escrowDetails.payee : escrowDetails[1];
      const escAmount = escrowDetails.amount !== undefined ? escrowDetails.amount : escrowDetails[2];
      assert.equal(escPayer.toLowerCase(), payer.account.address.toLowerCase());
      assert.equal(escPayee.toLowerCase(), payee.account.address.toLowerCase());
      assert.equal(BigInt(escAmount), amount);

      // Payee submits deliverable and releases escrow
      const escrowAsPayee = await viem.getContractAt(
        "EscrowVault",
        escrowVault.address,
        { client: { wallet: payee } },
      );
      await escrowAsPayee.write.submitDeliverable([1n, expectedHash]);

      // Verify escrow is released (amount reset to 0)
      const escrowDetailsAfter = await escrowVault.read.escrows([1n]) as any;
      const escAmountAfter = escrowDetailsAfter.amount !== undefined ? escrowDetailsAfter.amount : escrowDetailsAfter[2];
      assert.equal(BigInt(escAmountAfter), 0n);

      // --- Refund Escrow Path ---
      await escrowAsPayer.write.createEscrow([payee.account.address, expectedHash], {
        value: amount,
      });

      // Fast-forward EVM time by 24 hours + 10 seconds
      await net.provider.send("evm_increaseTime", [24 * 60 * 60 + 10]);
      await net.provider.send("evm_mine");

      // Refund escrow
      await escrowAsPayer.write.refundEscrow([2n]);

      // Verify escrow is refunded (amount reset to 0)
      const escrowDetailsRefunded = await escrowVault.read.escrows([2n]) as any;
      const escAmountRefunded = escrowDetailsRefunded.amount !== undefined ? escrowDetailsRefunded.amount : escrowDetailsRefunded[2];
      assert.equal(BigInt(escAmountRefunded), 0n);
    });
  });

  describe("Tier 2 - Escalation & Validation", function () {
    it("should route to Tier 2 and allow humanApprove/recordHumanDecision validation routing", async function () {
      const {
        payer,
        payee,
        identityRegistry,
        reputationRegistry,
        trustRegistry,
        validationRegistry,
        policyEngine,
      } = await deployFixture();

      // Register payee identity
      await identityRegistry.write.registerFor([
        payee.account.address,
        "ipfs://payee-metadata",
        [],
      ]);
      const agentId = 1n;

      // Seed low reputation to trigger Tier 2
      await reputationRegistry.write.giveFeedback([agentId, 1n, 0, "poor", "", "", "", "0x0000000000000000000000000000000000000000000000000000000000000000"]);

      await trustRegistry.write.getCompositeScore([payee.account.address]);
      const scoreResult = await trustRegistry.read.getCachedScore([payee.account.address]) as any;
      const score = Number(scoreResult.score ?? scoreResult[0]);
      assert.ok(score < 40, `Score ${score} should be < 40 for Tier 2`);

      // Evaluate tier (decideAndEmit returns 2)
      await policyEngine.write.decideAndEmit([
        payer.account.address,
        payee.account.address,
        1000000000000000000n,
      ]);

      // Create a validation request on the ValidationRegistry (representing the task requiring validation)
      const taskHash = "0x" + "cc".repeat(32);
      await validationRegistry.write.validationRequest([
        policyEngine.address,
        agentId,
        "ipfs://task-uri",
        taskHash,
      ]);

      // Validation complete status should be false initially
      let isComplete = await validationRegistry.read.isValidationComplete([taskHash]);
      assert.equal(isComplete, false);

      // Route resolution via PolicyEngine.humanApprove (admin validation)
      await policyEngine.write.humanApprove([taskHash, true]);

      // Check validation complete status (should be true now)
      isComplete = await validationRegistry.read.isValidationComplete([taskHash]);
      assert.equal(isComplete, true);

      // Verify validation response is 100 (approved)
      const status = await validationRegistry.read.getValidationStatus([taskHash]) as any;
      const response = status.response !== undefined ? status.response : status[2];
      assert.equal(Number(response), 100);
    });
  });

  describe("Trust Scoring & Penalties", function () {
    it("should compute composite score with feedback count penalty", async function () {
      const net = await hre.network.getOrCreate();
      const { viem } = net;
      const trustRegistry = await viem.deployContract("TrustRegistry", [zero, zero, zero]);
      const agentA = "0x0000000000000000000000000000000000000002";

      // Configure TrustRegistry to run in mockup seeding mode for direct penalty checking
      const now = Math.floor(Date.now() / 1000) - 180 * 24 * 60 * 60; // 180 days (max age score)
      await trustRegistry.write.seedRegistered([agentA, true, BigInt(now)]);
      await trustRegistry.write.seedReputation([agentA, 100]); // Perfect rating

      // Feedback count = 2 (< 3 feedbacks -> 50% reputation penalty -> reputation component score = 50)
      await trustRegistry.write.seedFeedbackCount([agentA, 2n]);

      // Seed max metrics volume and diversity
      const settledUsd18 = BigInt(10000) * BigInt(1e18); // $10k volume (max)
      await trustRegistry.write.seedAgentMetrics([
        agentA,
        [settledUsd18, 100, 0, 50], // 50 counterparties (max)
      ]);

      // Composite calculation:
      // reputationScore = 50 (100 * 50%)
      // ageScore = 100
      // volumeScore = 100
      // diversityScore = 100
      // weighted = (50 * 0.40) + (100 * 0.20) + (100 * 0.20) + (100 * 0.20) = 20 + 20 + 20 + 20 = 80
      await trustRegistry.write.getCompositeScore([agentA]);
      const scoreResult = await trustRegistry.read.getCachedScore([agentA]) as any;
      const score = Number(scoreResult.score ?? scoreResult[0]);
      assert.equal(score, 80);
    });

    it("should compute composite score with Sybil micro-transactions penalty", async function () {
      const net = await hre.network.getOrCreate();
      const { viem } = net;
      const trustRegistry = await viem.deployContract("TrustRegistry", [zero, zero, zero]);
      const agentA = "0x0000000000000000000000000000000000000002";

      const now = Math.floor(Date.now() / 1000) - 180 * 24 * 60 * 60; // 180 days (max age score)
      await trustRegistry.write.seedRegistered([agentA, true, BigInt(now)]);
      await trustRegistry.write.seedReputation([agentA, 100]); // Perfect rating
      await trustRegistry.write.seedFeedbackCount([agentA, 5n]); // No feedback penalty

      // Seed metrics with Sybil flag: micro-txs > 60% of total settled txs
      // 61 micro-txs / 100 total settled txs = 61% (> 60% -> Sybil Flagged)
      const settledUsd18 = BigInt(10000) * BigInt(1e18); // $10k volume (max = 100)
      await trustRegistry.write.seedAgentMetrics([
        agentA,
        [settledUsd18, 100, 61, 50], // 50 counterparties (max = 100 diversity)
      ]);

      // Expected calculation:
      // reputationScore = 100
      // ageScore = 100
      // volumeScore = 100
      // diversityScore = 100 * 0.1 (Sybil penalized) = 10
      // base composite = (100 * 0.40) + (100 * 0.20) + (100 * 0.20) + (10 * 0.20) = 40 + 20 + 20 + 2 = 82
      // Sybil penalty: composite * 30% = 82 * 0.3 = 24.6 -> floor cast = 24
      await trustRegistry.write.getCompositeScore([agentA]);
      const scoreResult = await trustRegistry.read.getCachedScore([agentA]) as any;
      const score = Number(scoreResult.score ?? scoreResult[0]);
      assert.equal(score, 24);
    });
  });
});
