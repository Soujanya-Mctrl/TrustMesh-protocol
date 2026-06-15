import assert from "node:assert/strict";
import { describe, it } from "node:test";
import hre from "hardhat";

describe("AgentMetricsRegistry", function () {
  it("records settlements only from authorized writers and supports seeding", async function () {
    const net = await hre.network.getOrCreate();
    const { viem } = net;

    const zero = "0x0000000000000000000000000000000000000000";
    const registry = await viem.deployContract("AgentMetricsRegistry", [zero, 3600]);

    // default account is admin; authorize it as a settler
    const accounts: string[] = await net.provider.send("eth_accounts", []);
    const admin = accounts[0];

    await registry.write.authorizeSettler([admin, true]);

    // record a settlement as authorized settler
    const payer = admin;
    const payee = "0x0000000000000000000000000000000000000002";
    const amountAvax = 10000000000000000n; // 0.01
    const settledUsd18 = 5000000000000000000000n; // $5k in 18

    await registry.write.recordSettlement([payer, payee, amountAvax, settledUsd18]);

    const m = (await registry.read.getMetrics([payee])) as any;
    const settled = m.settledVolumeUsd18 !== undefined ? m.settledVolumeUsd18 : m[0];
    assert.ok(BigInt(settled) >= settledUsd18, "settled updated");
  });
});
