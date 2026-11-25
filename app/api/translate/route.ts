import { NextResponse } from "next/server";
import { z } from "zod";
import { reportEvent } from "@/lib/nudgebee";
import { sarvamEnabled, translate } from "@/lib/sarvam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ text: z.string().trim().min(1).max(900), target: z.string().regex(/^[a-z]{2}-IN$/) });

/** English to an Indian language, through Sarvam. Used for the invitation message sent to each guest. */
export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  if (body.data.target === "en-IN" || !sarvamEnabled()) return NextResponse.json({ text: body.data.text, translated: false });
  try {
    const t = await translate(body.data.text, "en-IN", body.data.target);
    return NextResponse.json({ text: t.text, translated: true });
  } catch (err) {
    void reportEvent({ title: "Sarvam translation failed", message: err instanceof Error ? err.message : "translate failed", labels: { component: "sarvam", step: "invite-message" } });
    return NextResponse.json({ text: body.data.text, translated: false });
  }
}
