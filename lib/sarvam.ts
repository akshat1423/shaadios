/*
 * Sarvam AI: Indian-language speech and translation. Used so a family can speak or type in Hindi, Tamil, Telugu,
 * Bengali, Marathi, ... to restyle the venue, and read the reply in the same language.
 *
 *   speech-to-text  POST /speech-to-text   multipart (file, model, mode, language_code)   saaras:v4
 *   translate       POST /translate        JSON (input, source/target_language_code, model)
 *
 * Confirmed from Sarvam's API reference: auth header `api-subscription-key`; STT accepts WebM/OGG/MP4/WAV/MP3 and has
 * a `translate` mode; translation `mayura:v1` supports source "auto" (1000 chars), `sarvam-translate:v1` covers all 22
 * languages with an explicit source (2000 chars). The REST speech endpoint takes clips of up to about 30 seconds.
 */

const BASE = "https://api.sarvam.ai";

export const sarvamEnabled = () => Boolean(process.env.SARVAM_API_KEY);

const headers = () => ({ "api-subscription-key": process.env.SARVAM_API_KEY ?? "" });

async function check(res: Response, what: string) {
  if (res.ok) return;
  const body = await res.text().catch(() => "");
  const hint = res.status === 402 ? " (out of Sarvam credits)" : res.status === 429 ? " (rate limited)" : res.status === 403 || res.status === 401 ? " (check SARVAM_API_KEY)" : "";
  throw new Error(`Sarvam ${what} failed: ${res.status}${hint} ${body.slice(0, 160)}`);
}

export interface Translated {
  text: string;
  /** BCP-47 code of the language the text was in, e.g. "hi-IN" */
  source: string;
}

/** Translate text. `source` may be "auto" (detected) only when going to another language from unknown input. */
export async function translate(input: string, source: string, target: string): Promise<Translated> {
  const auto = source === "auto";
  const res = await fetch(`${BASE}/translate`, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({
      input: input.slice(0, auto ? 1000 : 2000),
      source_language_code: source,
      target_language_code: target,
      model: auto ? "mayura:v1" : "sarvam-translate:v1",
      mode: "formal",
    }),
    signal: AbortSignal.timeout(15_000),
  });
  await check(res, "translate");
  const data = (await res.json()) as { translated_text?: string; source_language_code?: string };
  return { text: data.translated_text ?? input, source: data.source_language_code ?? (auto ? "en-IN" : source) };
}

export interface Heard {
  /** What was said, in the language it was said in */
  transcript: string;
  /** The same, in English */
  english: string;
  /** Detected language, e.g. "hi-IN" */
  language: string;
}

/** Transcribe a short voice clip and also get it in English (two parallel calls: native text + translated text). */
export async function listen(audio: Blob, filename: string): Promise<Heard> {
  const call = async (mode: "transcribe" | "translate") => {
    const fd = new FormData();
    fd.append("file", audio, filename);
    fd.append("model", "saaras:v4");
    fd.append("mode", mode);
    fd.append("language_code", "unknown");
    const res = await fetch(`${BASE}/speech-to-text`, { method: "POST", headers: headers(), body: fd, signal: AbortSignal.timeout(25_000) });
    await check(res, `speech-to-text (${mode})`);
    return (await res.json()) as { transcript?: string; language_code?: string | null };
  };
  const [native, english] = await Promise.all([call("transcribe"), call("translate")]);
  return {
    transcript: (native.transcript ?? "").trim(),
    english: (english.transcript ?? native.transcript ?? "").trim(),
    language: native.language_code ?? english.language_code ?? "hi-IN",
  };
}
