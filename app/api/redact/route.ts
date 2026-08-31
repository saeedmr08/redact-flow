import { NextResponse } from "next/server";
import { loadLastJob, runRedact, type RuleToggle } from "@/lib/store";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ job: loadLastJob() });
}

export async function POST(request: Request) {
  let body: { text?: string; rules?: RuleToggle[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.text !== "string") {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }
  const { result, job } = runRedact(body.text, body.rules);
  return NextResponse.json({
    redacted: result.redacted,
    findings: result.findings,
    job,
  });
}
