import assert from "node:assert/strict";
import { describe, it } from "node:test";
import hre from "hardhat";

describe("EscrowVault", function () {
  it("creates, releases on matching hash, and refunds after timeout", async function () {
    const net = await hre.network.getOrCreate();
    const { viem } = net;

    const zero = "0x0000000000000000000000000000000000000000";
    const escrow = await viem.deployContract("EscrowVault", [zero]);

    // get the default account (the deployer / caller)
    const accounts: string[] = await net.provider.send("eth_accounts", []);
    const caller = accounts[0];

    const amount = 1000000000000000000n; // 1 ETH in wei
    const expected = "0x" + "11".repeat(32);

    // create escrow (payee == caller to allow submit from same signer)
    await escrow.write.createEscrow([caller, expected], { value: amount });

    // confirm escrow struct recorded with amount
    const esc1 = (await escrow.read.escrows([1])) as any;
    const esc1AmountRaw = esc1.amount !== undefined ? esc1.amount : esc1[2];
    assert.equal(BigInt(esc1AmountRaw), amount, "escrow recorded with amount");

    // submit matching deliverable from same signer (default signer)
    // escrow id 1 is the first created
    await escrow.write.submitDeliverable([1, expected]);

    // escrow amount should be zero after release
    const esc1After = (await escrow.read.escrows([1])) as any;
    const esc1AfterAmountRaw = esc1After.amount !== undefined ? esc1After.amount : esc1After[2];
    assert.equal(BigInt(esc1AfterAmountRaw), 0n, "escrow emptied after release");

    // create second escrow and test refund path
    await escrow.write.createEscrow([caller, expected], { value: amount });

    // increase time and attempt refund
    await net.provider.send("evm_increaseTime", [24 * 60 * 60 + 10]);
    await net.provider.send("evm_mine");

    await escrow.write.refundEscrow([2]);
    const esc2After = (await escrow.read.escrows([2])) as any;
    const esc2AfterAmountRaw = esc2After.amount !== undefined ? esc2After.amount : esc2After[2];
    assert.equal(BigInt(esc2AfterAmountRaw), 0n, "escrow emptied after refund");
  });
});
