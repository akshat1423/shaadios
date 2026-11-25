/*
 * The feature flags Shaadi OS reads from Flagsmith. Create these (same names) in your Flagsmith project; any that are
 * missing, or if Flagsmith is unreachable, fall back to DEFAULT_FLAGS so the app always works.
 *
 *  nl_parser           remote config. "claude" or "basic": who understands "make the flowers marigold"
 *  ai_kill_switch      boolean. ON = never call Claude or Sarvam's translation (cost / incident switch)
 *  studio_addons       boolean. the Add tab (fountain, flower swing, diyas, ...) in the Venue Studio
 *  voice_input         boolean. the microphone in the Venue Studio (Sarvam speech-to-text)
 *  regional_languages  boolean. understand and reply in Hindi / Tamil / ... (Sarvam translation)
 */
export const FLAG_NAMES = ["nl_parser", "ai_kill_switch", "studio_addons", "voice_input", "regional_languages"] as const;
export type FlagName = (typeof FLAG_NAMES)[number];

export interface Flag {
  enabled: boolean;
  value: string | number | boolean | null;
}
export type Flags = Record<FlagName, Flag>;

export const DEFAULT_FLAGS: Flags = {
  nl_parser: { enabled: true, value: "claude" },
  ai_kill_switch: { enabled: false, value: null },
  studio_addons: { enabled: true, value: null },
  voice_input: { enabled: true, value: null },
  regional_languages: { enabled: true, value: null },
};

export type FlagSource = "flagsmith" | "defaults";
