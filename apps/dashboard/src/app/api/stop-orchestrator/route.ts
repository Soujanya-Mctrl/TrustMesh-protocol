import { NextResponse } from "next/server";

export async function POST() {
  try {
    const activeProcesses = (global as any).activeProcesses;
    const child = activeProcesses?.get("orchestrator");
    if (child) {
      child.kill("SIGTERM");
      activeProcesses.delete("orchestrator");
      return NextResponse.json({ success: true, message: "Orchestrator process stopped." });
    }
    return NextResponse.json({ success: true, message: "No active orchestrator process to stop." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
