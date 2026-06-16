import { NextResponse } from "next/server";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export async function GET() {
  try {
    // Read from workspace root (two levels up from apps/dashboard)
    const path = resolve(process.cwd(), "../../deployed-addresses.json");
    const content = readFileSync(path, "utf8");
    return NextResponse.json(JSON.parse(content));
  } catch (err) {
    try {
      // Fallback to local app directory
      const path = resolve(process.cwd(), "deployed-addresses.json");
      const content = readFileSync(path, "utf8");
      return NextResponse.json(JSON.parse(content));
    } catch (e: any) {
      return NextResponse.json(
        { error: `Failed to load deployed-addresses.json: ${e.message}` },
        { status: 500 }
      );
    }
  }
}
