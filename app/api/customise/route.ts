import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  describeOptions,
  describeScene,
  ELEMENT_IDS,
  ELEMENTS,
  HEX,
  isStyleOf,
  parseLocal,
  resolveDecor,
  VENUE_IDS,
  type DecorOverrides,
  type Edit,
  type Understood,
  type VenueId,
} from "@/lib/decor";
import { getFlags, parserFor } from "@/lib/flags";
import { reportEvent } from "@/lib/nudgebee";
import { sarvamEnabled, translate } from "@/lib/sarvam";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/*
 * Turns "make the flowers marigold" (in English, Hindi, Tamil, ...) into exact edits.
 *
 *  Flagsmith   decides who understands the request: Claude, or the built-in parser (`nl_parser`), with a kill switch
 *              (`ai_kill_switch`) and a switch for regional languages (`regional_languages`). Evaluated per wedding.
 *  Sarvam      translates a request written in an Indian language to English first, and translates the reply back.
 *  Claude      reads the request against the current scene and answers in a fixed JSON shape (structured outputs).
 *  NudgeBee    is told whenever a dependency fails, so the failure trail is triaged instead of silently swallowed.
 *
 * The model never touches the 3D scene directly: every edit is validated (known part, real hex colour, real style).
 */

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-5-5";

const Body = z.object({
  text: z.string().trim().min(1).max(240),
  venue: z.enum(VENUE_IDS as [VenueId, ...VenueId[]]),
  overrides: z.record(z.string(), z.unknown()).optional(),
  /** Language the family is using, from a voice clip (e.g. "hi-IN"). Typed text is detected automatically. */
  lang: z.string().max(12).optional(),
  /** The wedding, for per-wedding flags */
  identity: z.string().max(80).optional(),
});

const Answer = z.object({
  edits: z.array(
    z.object({
      element: z.enum(ELEMENT_IDS),
      color: z.string(),
      visibility: z.enum(["show", "hide", "keep"]),
      style: z.string(),
    }),
  ),
  message: z.string(),
  unresolved: z.array(z.string()),
});

const SCHEMA = {
  type: "object",
  properties: {
    edits: {
      type: "array",
      items: {
        type: "object",
        properties: {
          element: { type: "string", enum: [...ELEMENT_IDS] },
          color: { type: "string", description: "A 6-digit hex colour like #c62828, or an empty string to leave the colour as it is" },
          visibility: { type: "string", enum: ["show", "hide", "keep"] },
          style: { type: "string", description: "The id of a design style for this part, exactly as listed for it, or an empty string to keep its current design" },
        },
        required: ["element", "color", "visibility", "style"],
        additionalProperties: false,
      },
    },
    message: { type: "string", description: "One short, friendly sentence telling the user what changed" },
    unresolved: { type: "array", items: { type: "string" }, description: "Parts of the request that cannot be done with these parts and styles" },
  },
  required: ["edits", "message", "unresolved"],
  additionalProperties: false,
} as const;

const SYSTEM = `You restyle a 3D wedding venue for an Indian family. The user describes a change in their own words; you turn it into precise edits to named parts of the scene. A change can be a colour, a different design (style) of a part, or adding or removing a part.

The parts, their design styles, and whether they can be added or removed:
${describeOptions()}

Rules:
- Pick exactly the parts the user named. Do not change other parts, and leave the venue's own walls and floor alone unless they ask for them or ask for a whole-venue theme.
- Choose a real hex colour for every colour. Understand Indian wedding colour words: kumkum and sindoor (vermilion red), marigold and genda (orange-yellow), haldi (turmeric yellow), mehendi (olive green), peacock (blue-green), gulabi (pink), and so on.
- Relative requests ("a bit darker", "same as the pillars", "softer") are relative to the current colours shown in the scene.
- Styles: use the style id exactly as listed for that part. Only use styles listed for the part. Use an empty style when the design stays as it is.
- Adding: use visibility "show" for a part marked as addable and not currently in the venue ("add a fountain", "I want a flower swing"). Adding a part you also colour or style needs both.
- Removing: use visibility "hide" for a part that can be removed. Use "keep" otherwise. Use an empty colour string when only style or visibility changes.
- For a mood or theme ("royal Rajasthani", "pastel garden brunch", "make it grand"), choose a coherent palette, fitting styles and a few fitting additions across several parts rather than one.
- If part of the request cannot be done with these parts and styles (for example "add a swimming pool"), list it in unresolved and still apply the rest.
- message is one friendly sentence naming what changed, e.g. "Added a fountain and gave the mandap a dome canopy in ivory."`;

let client: Anthropic | null = null;
/** After an authentication failure, skip Claude for a while so every request isn't slowed by a call that will fail. */
let claudeDownUntil = 0;

async function askClaude(text: string, venue: VenueId, current: ReturnType<typeof resolveDecor>): Promise<Understood> {
  client ??= new Anthropic({ maxRetries: 1, timeout: 25_000 });
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    messages: [{ role: "user", content: `Current scene:\n${describeScene(venue, current)}\n\nRequest: ${text}` }],
  });

  if (res.stop_reason === "refusal") throw new Error("Claude declined the request");
  if (res.stop_reason === "max_tokens") throw new Error("Claude's answer was cut off");
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("Claude returned no text");

  const parsed = Answer.parse(JSON.parse(block.text));
  const edits: Edit[] = [];
  for (const e of parsed.edits) {
    const edit: Edit = { element: e.element };
    if (HEX.test(e.color)) edit.color = e.color.toLowerCase();
    if (e.visibility === "hide" && ELEMENTS[e.element].hideable) edit.visible = false;
    if (e.visibility === "show") edit.visible = true;
    if (e.style && isStyleOf(e.element, e.style)) edit.style = e.style;
    // colouring or styling a part that isn't in the venue yet brings it in
    if ((edit.color !== undefined || edit.style !== undefined) && edit.visible === undefined && !current[e.element].visible) edit.visible = true;
    if (edit.color !== undefined || edit.visible !== undefined || edit.style !== undefined) edits.push(edit);
  }
  return { edits, message: parsed.message, unresolved: parsed.unresolved };
}

/** Keep only well-formed overrides sent by the browser, so a bad payload can't put junk in the prompt. */
function cleanOverrides(raw: Record<string, unknown> | undefined): DecorOverrides {
  const out: DecorOverrides = {};
  for (const id of ELEMENT_IDS) {
    const v = raw?.[id];
    if (v && typeof v === "object") {
      const { color, visible, style } = v as { color?: unknown; visible?: unknown; style?: unknown };
      out[id] = {
        ...(typeof color === "string" && HEX.test(color) && { color }),
        ...(typeof visible === "boolean" && { visible }),
        ...(typeof style === "string" && isStyleOf(id, style) && { style }),
      };
    }
  }
  return out;
}

const NON_LATIN = /[^\u0000-ɏ -⁯]/;

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Tell me what to change, in under 240 characters." }, { status: 400 });

  const { text, venue, identity } = body.data;
  const current = resolveDecor(venue, cleanOverrides(body.data.overrides));
  const { flags, source: flagSource } = await getFlags(identity ?? "anonymous");
  const parser = parserFor(flags);
  const regional = flags.regional_languages.enabled && !flags.ai_kill_switch.enabled && sarvamEnabled();

  const notes: string[] = [];
  let working = text;
  let lang = body.data.lang;

  if (!regional && NON_LATIN.test(text)) {
    notes.push(
      !sarvamEnabled()
        ? "Understanding Indian languages needs a Sarvam key (SARVAM_API_KEY), so this was read as written."
        : "Regional languages are switched off (Flagsmith), so this was read as written.",
    );
  }

  // 1. A request written in an Indian language is translated to English first (Sarvam).
  if (regional && NON_LATIN.test(text)) {
    try {
      const t = await translate(text, "auto", "en-IN");
      working = t.text;
      lang = t.source;
    } catch (err) {
      void reportEvent({ title: "Sarvam translation failed", message: err instanceof Error ? err.message : "translate failed", labels: { component: "sarvam", step: "translate-in" } });
      notes.push("Couldn't translate that, so I tried it as written.");
    }
  }

  // 2. Understand it: Claude, or the built-in parser, as Flagsmith decides.
  let understood: Understood | null = null;
  let source: "claude" | "local" = "local";
  if (parser === "claude" && Date.now() >= claudeDownUntil) {
    try {
      understood = await askClaude(working, venue, current);
      source = "claude";
    } catch (err) {
      if (err instanceof Anthropic.AuthenticationError || (err instanceof Error && /authentication|api key|credential/i.test(err.message))) {
        claudeDownUntil = Date.now() + 60_000;
        notes.push("No Claude credentials found (set ANTHROPIC_API_KEY), so the basic parser answered.");
      } else {
        void reportEvent({ title: "Claude request failed", message: err instanceof Error ? err.message : "Claude failed", labels: { component: "claude", step: "customise" } });
        notes.push(err instanceof Anthropic.RateLimitError ? "Claude is rate-limited right now, so the basic parser answered." : "Claude couldn't answer, so the basic parser did.");
      }
    }
  } else if (parser === "basic") {
    notes.push(flags.ai_kill_switch.enabled ? "AI is switched off (Flagsmith kill switch), so the basic parser answered." : "Flagsmith set the parser to basic.");
  } else {
    notes.push("No Claude credentials found (set ANTHROPIC_API_KEY), so the basic parser answered.");
  }
  understood ??= parseLocal(working, current);

  // 3. Reply in the family's language (Sarvam).
  let message = understood.message;
  const messageEnglish = understood.message;
  let unresolved = understood.unresolved;
  if (regional && lang && lang !== "en-IN" && lang.endsWith("-IN")) {
    try {
      const [m, ...u] = await Promise.all([translate(message, "en-IN", lang), ...unresolved.map((x) => translate(x, "en-IN", lang!))]);
      message = m.text;
      unresolved = u.map((x) => x.text);
    } catch (err) {
      void reportEvent({ title: "Sarvam translation failed", message: err instanceof Error ? err.message : "translate failed", labels: { component: "sarvam", step: "translate-out" } });
    }
  }

  return NextResponse.json({
    edits: understood.edits,
    unresolved,
    message,
    messageEnglish: message === messageEnglish ? undefined : messageEnglish,
    source,
    note: notes.length ? notes.join(" ") : undefined,
    lang: lang && lang !== "en-IN" ? lang : undefined,
    understoodAs: working !== text ? working : undefined,
    flags: { parser, killSwitch: flags.ai_kill_switch.enabled, source: flagSource },
  });
}
