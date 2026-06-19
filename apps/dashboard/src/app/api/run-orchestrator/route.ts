import { NextRequest, NextResponse } from "next/server";
import { spawn } from "node:child_process";
import { resolve } from "node:path";

export async function POST(req: NextRequest) {
  try {
    const { goal } = await req.json();
    if (!goal) {
      return NextResponse.json({ error: "Goal is required" }, { status: 400 });
    }

    const rootDir = resolve(process.cwd(), "../..");

    // Spawn the orchestrator CLI command
    const child = spawn(
      "node",
      ["--env-file=.env", "apps/orchestrator/dist/cli.js", `--goal=${goal}`],
      {
        cwd: rootDir,
        env: { ...process.env },
      }
    );

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        child.stdout.on("data", (data) => {
          controller.enqueue(encoder.encode(data.toString()));
        });
        child.stderr.on("data", (data) => {
          controller.enqueue(encoder.encode(data.toString()));
        });
        child.on("close", (code) => {
          controller.enqueue(encoder.encode(`\n[System] Orchestrator completed with exit code ${code}\n`));
          controller.close();
        });
        child.on("error", (err) => {
          controller.enqueue(encoder.encode(`\n[System Error] ${err.message}\n`));
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
