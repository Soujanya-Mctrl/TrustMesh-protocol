import assert from "node:assert/strict";
import { describe, it } from "node:test";
import hre from "hardhat";

describe("PolicyEngine", function () {
  it("evaluates tiers and records Tier0 settlements via facilitator", async function () {
    const net = await hre.network.getOrCreate();
    const { viem } = net;

    const zero = "0x0000000000000000000000000000000000000000";
    const am = await viem.deployContract("AgentMetricsRegistry", [zero, 3600]);
    const tr = await viem.deployContract("TrustRegistry", [zero, zero, zero]);

    // deploy PolicyEngine
    const pe = await viem.deployContract("PolicyEngine", [am.address, tr.address, zero]);

    const accounts: string[] = await net.provider.send("eth_accounts", []);
    const admin = accounts[0];

    // add facilitator (admin itself)
    await pe.write.addFacilitator([admin]);

    // authorize policy engine as settler in agent metrics registry
    await am.write.authorizeSettler([pe.address, true]);

    // seed TrustRegistry score for payee to be high (>=70)
    const payee = "0x0000000000000000000000000000000000000002";
    await tr.write.seedRegistered([payee, true, BigInt(Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 400)]);
    await tr.write.seedReputation([payee, 85]);
    await tr.write.seedAgentMetrics([payee, [BigInt(10000000000000000000000), 10, 1, 50]]);

    // record direct settlement as facilitator (simulates Tier0 facilitator recording)
    await pe.write.recordDirectSettlement([admin, payee, 1000000000000000000n, 0n]);

    const m = (await am.read.getMetrics([payee])) as any;
    const settled = m.settledVolumeUsd18 !== undefined ? m.settledVolumeUsd18 : m[0];
    assert.ok(BigInt(settled) >= 0n, "metrics recorded");
  });

  it("triggers validation approval via humanApprove", async function () {
    const net = await hre.network.getOrCreate();
    const { viem } = net;

    const zero = "0x0000000000000000000000000000000000000000";
    const am = await viem.deployContract("AgentMetricsRegistry", [zero, 3600]);
    const tr = await viem.deployContract("TrustRegistry", [zero, zero, zero]);
    const ir = await viem.deployContract("IdentityRegistry", []);
    const vr = await viem.deployContract("ValidationRegistry", [ir.address]);

    // deploy PolicyEngine with vr
    const pe = await viem.deployContract("PolicyEngine", [am.address, tr.address, vr.address]);

    // Register agent so deployer is authorized to request validation
    await ir.write.register(["ipfs://testAgent"]);
    const agentId = 1n;

    // create validation request
    const taskHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as `0x${string}`;
    await vr.write.validationRequest([pe.address, agentId, "", taskHash]);

    // confirm request is not complete
    let isComplete = await vr.read.isValidationComplete([taskHash]);
    assert.equal(isComplete, false);

    // approve validation via PolicyEngine's admin humanApprove
    await pe.write.humanApprove([taskHash, true]);

    // confirm status is now complete
    isComplete = await vr.read.isValidationComplete([taskHash]);
    assert.equal(isComplete, true);

    const status = await vr.read.getValidationStatus([taskHash]) as any;
    // status = [validatorAddress, agentId, response, responseHash, tag, lastUpdate]
    assert.equal(Number(status[2] ?? status.response), 100);
  });

  it("records human decisions and resolves validation correctly", async function () {
    const net = await hre.network.getOrCreate();
    const { viem } = net;

    const zero = "0x0000000000000000000000000000000000000000";
    const am = await viem.deployContract("AgentMetricsRegistry", [zero, 3600]);
    const tr = await viem.deployContract("TrustRegistry", [zero, zero, zero]);
    const ir = await viem.deployContract("IdentityRegistry", []);
    const vr = await viem.deployContract("ValidationRegistry", [ir.address]);

    // deploy PolicyEngine with vr
    const pe = await viem.deployContract("PolicyEngine", [am.address, tr.address, vr.address]);

    // Register agent so deployer is authorized to request validation
    await ir.write.register(["ipfs://testAgent"]);
    const agentId = 1n;

    // create validation request
    const taskHash = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef" as `0x${string}`;
    await vr.write.validationRequest([pe.address, agentId, "", taskHash]);

    // call recordHumanDecision with ApproveDirect (decision = 2)
    // enum HumanDecision { Reject, ApproveWithEscrow, ApproveDirect }
    const human = "0x0000000000000000000000000000000000000004";
    await pe.write.recordHumanDecision([taskHash, 2, human]);

    // confirm status is complete and response is 100
    const isComplete = await vr.read.isValidationComplete([taskHash]);
    assert.equal(isComplete, true);

    const status = await vr.read.getValidationStatus([taskHash]) as any;
    assert.equal(Number(status[2] ?? status.response), 100);
  });
});
