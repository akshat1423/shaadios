"use client";

import { useEffect, useState } from "react";
import { DEFAULT_FLAGS, type FlagSource, type Flags } from "./flagTypes";

/**
 * This wedding's Flagsmith flags. Starts on safe defaults, then reads the real ones and re-reads every 10 seconds, so
 * flipping a flag in the Flagsmith dashboard changes the live app without a redeploy.
 */
export function useFlags(identity: string, traits: Record<string, string> = {}) {
  const [state, setState] = useState<{ flags: Flags; source: FlagSource }>({ flags: DEFAULT_FLAGS, source: "defaults" });
  const traitKey = JSON.stringify(traits);

  useEffect(() => {
    let on = true;
    const qs = new URLSearchParams({ id: identity, ...(JSON.parse(traitKey) as Record<string, string>) });
    const load = async () => {
      try {
        const res = await fetch(`/api/flags?${qs}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { flags: Flags; source: FlagSource };
        if (on) setState(data);
      } catch {
        // offline: keep the last known flags
      }
    };
    void load();
    const t = setInterval(load, 10_000);
    return () => {
      on = false;
      clearInterval(t);
    };
  }, [identity, traitKey]);

  return state;
}
