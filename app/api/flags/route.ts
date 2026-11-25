import { NextResponse } from "next/server";
import { getFlags } from "@/lib/flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The browser asks here for this wedding's flags, so the Flagsmith key stays on the server and flips show up live. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const id = (url.searchParams.get("id") ?? "anonymous").slice(0, 80);
  const traits: Record<string, string> = {};
  for (const k of ["city", "tradition"]) {
    const v = url.searchParams.get(k);
    if (v) traits[k] = v.slice(0, 40);
  }
  const { flags, source } = await getFlags(id, traits);
  return NextResponse.json({ flags, source }, { headers: { "Cache-Control": "no-store" } });
}
