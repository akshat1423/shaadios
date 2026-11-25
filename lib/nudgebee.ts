/*
 * NudgeBee is an AI-SRE platform: it investigates incidents from alerts, logs and metrics. Shaadi OS reports its own
 * operational events to NudgeBee through its generic Event Webhook (the URL is created in the NudgeBee admin panel):
 * failed Claude / Sarvam calls, Flagsmith being unreachable, a feature kill-switch flipping, the voice pipeline
 * failing. NudgeBee can then correlate and triage them with the rest of the cluster's signals.
 *
 * The webhook payload shape below follows NudgeBee's documented generic format as far as it could be confirmed. If
 * your NudgeBee workspace expects different field names, change `toPayload` only; nothing else depends on it. Without
 * NUDGEBEE_WEBHOOK_URL events are still logged, so the failure trail exists either way. Never throws.
 */

export interface AppEvent {
  title: string;
  message: string;
  severity?: "info" | "warning" | "critical";
  labels?: Record<string, string>;
}

function toPayload(e: AppEvent) {
  return {
    title: e.title,
    description: e.message,
    message: e.message,
    severity: e.severity ?? "warning",
    status: "firing",
    service: "shaadi-os",
    source: "shaadi-os",
    timestamp: new Date().toISOString(),
    labels: { app: "shaadi-os", env: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "dev", ...e.labels },
  };
}

export async function reportEvent(e: AppEvent): Promise<boolean> {
  console.warn(`[nudgebee] ${e.severity ?? "warning"}: ${e.title}: ${e.message}`);
  const url = process.env.NUDGEBEE_WEBHOOK_URL;
  if (!url) return false;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.NUDGEBEE_WEBHOOK_TOKEN && { Authorization: `Bearer ${process.env.NUDGEBEE_WEBHOOK_TOKEN}` }),
      },
      body: JSON.stringify(toPayload(e)),
      signal: AbortSignal.timeout(3_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
