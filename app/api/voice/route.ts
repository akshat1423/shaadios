import { NextResponse } from "next/server";
import { getFlags } from "@/lib/flags";
import { reportEvent } from "@/lib/nudgebee";
import { listen, sarvamEnabled } from "@/lib/sarvam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 4 * 1024 * 1024;

/** A voice clip in any Indian language in; what was said (native + English) and the language out. */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob) || file.size === 0) return NextResponse.json({ error: "No audio received." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That clip is too long. Keep it under 25 seconds." }, { status: 413 });

  const identity = String(form?.get("identity") ?? "anonymous").slice(0, 80);
  const { flags } = await getFlags(identity);
  if (!flags.voice_input.enabled || flags.ai_kill_switch.enabled) {
    return NextResponse.json({ error: "Voice input is switched off right now. You can type instead." }, { status: 403 });
  }
  if (!sarvamEnabled()) {
    return NextResponse.json({ error: "Voice needs a Sarvam API key (SARVAM_API_KEY). You can type instead." }, { status: 503 });
  }

  const name = file.type.includes("wav") ? "voice.wav" : file.type.includes("mp4") ? "voice.mp4" : file.type.includes("ogg") ? "voice.ogg" : "voice.webm";
  try {
    const heard = await listen(file, name);
    if (!heard.english) return NextResponse.json({ error: "I couldn't hear anything in that. Try again, closer to the microphone." }, { status: 422 });
    return NextResponse.json(heard);
  } catch (err) {
    void reportEvent({
      title: "Voice pipeline failed",
      message: err instanceof Error ? err.message : "Sarvam speech-to-text failed",
      severity: "warning",
      labels: { component: "sarvam", step: "speech-to-text" },
    });
    return NextResponse.json({ error: "I couldn't process that recording. Try again, or type it." }, { status: 502 });
  }
}
