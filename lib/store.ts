"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Wedding } from "./types.ts";

/*
 * The wedding lives in localStorage for now, so the whole flow works with no backend. It is a tiny external store read
 * through useSyncExternalStore: components re-render on change, and server render sees "not ready" instead of
 * mismatching.
 */

const KEY = "shaadi-os:wedding:v1";
const listeners = new Set<() => void>();
let cache: Wedding | null | undefined;

function read(): Wedding | null {
  if (cache !== undefined) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? (JSON.parse(raw) as Wedding) : null;
  } catch {
    cache = null;
  }
  return cache;
}

function write(next: Wedding | null) {
  cache = next;
  try {
    if (next) window.localStorage.setItem(KEY, JSON.stringify(next));
    else window.localStorage.removeItem(KEY);
  } catch {
    // storage full or blocked: the in-memory copy still works for this session
  }
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

const NOT_READY = undefined;

export function useWedding() {
  const wedding = useSyncExternalStore(subscribe, read, () => NOT_READY);
  const save = useCallback((w: Wedding) => write(w), []);
  const patch = useCallback((p: Partial<Wedding>) => {
    const cur = read();
    if (cur) write({ ...cur, ...p });
  }, []);
  const reset = useCallback(() => write(null), []);
  return { wedding, ready: wedding !== NOT_READY, save, patch, reset };
}
