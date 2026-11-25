import { DEFAULT_FLAGS, FLAG_NAMES, type FlagName, type FlagSource, type Flags } from "./flagTypes.ts";
import { reportEvent } from "./nudgebee.ts";

/*
 * Server-side Flagsmith evaluation over its public Flags API (remote evaluation): one POST per wedding identity, with
 * the wedding's traits (city, tradition) so segments in the Flagsmith dashboard can target them. This is the same
 * call the official SDKs make; going direct keeps serverless cold starts free of a polling client.
 *
 * The identity is the wedding ("wedding:aanya-kabir"), so a flag can be rolled out to one wedding, one city, or a
 * percentage of weddings. Failures never break the app: the caller always gets usable flags.
 */

const BASE = (process.env.FLAGSMITH_API_URL ?? "https://edge.api.flagsmith.com/api/v1").replace(/\/$/, "");

type Traits = Record<string, string | number | boolean>;
interface CacheEntry {
  at: number;
  flags: Flags;
  source: FlagSource;
}
const cache = new Map<string, CacheEntry>();
const TTL_MS = 5_000;

interface ApiFlag {
  feature?: { name?: string };
  enabled?: boolean;
  feature_state_value?: string | number | boolean | null;
}

export async function getFlags(identity: string, traits: Traits = {}): Promise<{ flags: Flags; source: FlagSource }> {
  const key = process.env.FLAGSMITH_ENVIRONMENT_KEY;
  if (!key) return { flags: DEFAULT_FLAGS, source: "defaults" };

  const ck = `${identity}|${JSON.stringify(traits)}`;
  const hit = cache.get(ck);
  if (hit && Date.now() - hit.at < TTL_MS) return { flags: hit.flags, source: hit.source };

  try {
    const res = await fetch(`${BASE}/identities/`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Environment-Key": key },
      body: JSON.stringify({ identifier: identity, traits: Object.entries(traits).map(([trait_key, trait_value]) => ({ trait_key, trait_value })) }),
      signal: AbortSignal.timeout(3_000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Flagsmith answered ${res.status}`);
    const data = (await res.json()) as { flags?: ApiFlag[] };
    const flags: Flags = structuredClone(DEFAULT_FLAGS);
    for (const f of data.flags ?? []) {
      const name = f.feature?.name as FlagName | undefined;
      if (name && (FLAG_NAMES as readonly string[]).includes(name)) {
        flags[name] = { enabled: Boolean(f.enabled), value: f.feature_state_value ?? null };
      }
    }
    cache.set(ck, { at: Date.now(), flags, source: "flagsmith" });
    return { flags, source: "flagsmith" };
  } catch (err) {
    void reportEvent({
      title: "Flagsmith unreachable",
      message: err instanceof Error ? err.message : "Flag evaluation failed; serving defaults",
      severity: "warning",
      labels: { component: "flagsmith" },
    });
    return { flags: DEFAULT_FLAGS, source: "defaults" };
  }
}

/** Which parser the flags select. The kill switch beats the remote config value. */
export function parserFor(flags: Flags): "claude" | "basic" {
  if (flags.ai_kill_switch.enabled) return "basic";
  return String(flags.nl_parser.value ?? "claude").toLowerCase() === "basic" || !flags.nl_parser.enabled ? "basic" : "claude";
}
