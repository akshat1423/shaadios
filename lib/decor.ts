/*
 * The decor model: which parts of a venue can be changed, what each venue starts with, and how a plain-English request
 * becomes concrete edits. Everything in here is pure so it can be tested; the 3D scene and the Claude call sit on top.
 *
 * Three kinds of change, all expressed as an `Edit`:
 *  - colour:    "make the flowers marigold"
 *  - style:     "dome canopy", "floral wall", "petal path" (a different design of the same part)
 *  - presence:  "add a fountain", "remove the garlands" (parts that can be added start hidden)
 *
 * Two parsers produce the same `Edit[]`:
 *  - Claude (app/api/customise) for anything fuzzy: "make it feel like a royal Rajasthani evening".
 *  - `parseLocal` below, deterministic, for the common phrasings and as the fallback when Claude is unavailable.
 */

export const BASE_IDS = [
  "stage",
  "pillars",
  "canopy",
  "drapes",
  "flowers",
  "garlands",
  "aisle",
  "floor",
  "chairs",
  "tables",
  "lights",
  "walls",
] as const;

/** Things the family can bring in. They start hidden unless the venue ships with them. */
export const ADDABLE_IDS = ["arch", "jhula", "fountain", "rangoli", "diyas", "lanterns", "chandeliers", "photobooth", "havan"] as const;

export const ELEMENT_IDS = [...BASE_IDS, ...ADDABLE_IDS] as const;
export type ElementId = (typeof ELEMENT_IDS)[number];
export type AddableId = (typeof ADDABLE_IDS)[number];

export interface ElementMeta {
  label: string;
  /** What this is, in the words Claude and the user share */
  hint: string;
  aliases: string[];
  /** Whether "remove the X" makes sense */
  hideable: boolean;
  /** Can be added to the venue; starts hidden unless the venue ships with it */
  addable?: boolean;
}

export const ELEMENTS: Record<ElementId, ElementMeta> = {
  stage: { label: "Stage", hint: "the raised platform the mandap stands on", aliases: ["stage", "platform", "dais", "mandap base"], hideable: false },
  pillars: { label: "Pillars", hint: "the four posts of the mandap", aliases: ["pillar", "pillars", "pole", "poles", "post", "posts", "stambh", "column", "columns"], hideable: false },
  canopy: { label: "Canopy", hint: "the roof of the mandap", aliases: ["canopy", "roof", "mandap roof", "chhatri"], hideable: true },
  drapes: { label: "Drapes", hint: "fabric curtains and the backdrop behind the stage", aliases: ["drape", "drapes", "curtain", "curtains", "backdrop", "fabric", "cloth", "draping", "background"], hideable: true },
  flowers: { label: "Flowers", hint: "floral arrangements on the stage, pillars and aisle", aliases: ["flower", "flowers", "floral", "florals", "phool", "bloom", "blooms", "roses", "rose", "petals", "arrangements"], hideable: true },
  garlands: { label: "Garlands", hint: "strings of flowers hanging from the canopy", aliases: ["garland", "garlands", "mala", "jaimala", "strings", "hanging flowers", "marigold strings", "latkan"], hideable: true },
  aisle: { label: "Aisle", hint: "the runner the couple walks down", aliases: ["aisle", "runner", "carpet", "walkway", "path"], hideable: true },
  floor: { label: "Floor", hint: "the ground of the venue", aliases: ["floor", "ground", "flooring", "lawn", "grass", "tiles"], hideable: false },
  chairs: { label: "Chairs", hint: "guest seating", aliases: ["chair", "chairs", "seating", "seats", "seat"], hideable: true },
  tables: { label: "Tables", hint: "round dining tables and their linen", aliases: ["table", "tables", "tablecloth", "tablecloths", "linen", "linens"], hideable: true },
  lights: { label: "Fairy lights", hint: "strings of fairy lights overhead", aliases: ["light", "lights", "lighting", "fairy lights", "lamps", "lamp", "bulbs"], hideable: true },
  walls: { label: "Walls", hint: "the venue's architecture: walls, arches, hedges", aliases: ["wall", "walls", "building", "architecture", "hall", "venue", "hedge", "hedges"], hideable: false },

  arch: { label: "Entrance arch", hint: "a floral gate at the start of the aisle", aliases: ["entrance arch", "entry gate", "entrance gate", "flower arch", "floral arch", "welcome arch", "entrance", "gate", "arch", "archway"], hideable: true, addable: true },
  jhula: { label: "Flower swing", hint: "a floral jhula for the couple on the stage", aliases: ["flower swing", "floral swing", "swing", "jhula", "jhoola", "jhoolay"], hideable: true, addable: true },
  fountain: { label: "Fountain", hint: "a water fountain at the entrance", aliases: ["fountain", "fountains", "water feature"], hideable: true, addable: true },
  rangoli: { label: "Rangoli", hint: "floor art on either side of the entrance", aliases: ["rangoli", "rangolis", "kolam", "floor art"], hideable: true, addable: true },
  diyas: { label: "Diyas", hint: "rows of glowing oil lamps along the aisle", aliases: ["diya", "diyas", "deepak", "oil lamps", "oil lamp", "clay lamps"], hideable: true, addable: true },
  lanterns: { label: "Lanterns", hint: "hanging paper lanterns over the guests", aliases: ["lantern", "lanterns", "paper lanterns"], hideable: true, addable: true },
  chandeliers: { label: "Chandeliers", hint: "crystal chandeliers over the aisle", aliases: ["chandelier", "chandeliers"], hideable: true, addable: true },
  photobooth: { label: "Photo wall", hint: "a flower wall for photographs", aliases: ["photo booth", "photobooth", "photo wall", "selfie corner", "selfie wall", "photo corner", "photo backdrop"], hideable: true, addable: true },
  havan: { label: "Havan kund", hint: "the sacred fire pit in the mandap", aliases: ["havan", "havan kund", "hawan", "fire pit", "sacred fire", "agni kund", "agni"], hideable: true, addable: true },
};

/* ------------------------------------------------------------------ design styles */

export interface StyleOption {
  id: string;
  label: string;
  /** Phrases that choose this style. Keep them specific: they are matched as whole words. */
  aliases: string[];
}

/** Different designs of the same part. The first option is the default. */
export const STYLES: Partial<Record<ElementId, StyleOption[]>> = {
  stage: [
    { id: "rectangle", label: "Rectangle", aliases: ["rectangular stage", "rectangle stage", "square stage"] },
    { id: "round", label: "Round", aliases: ["round stage", "circular stage", "circle stage"] },
    { id: "tiered", label: "Tiered", aliases: ["tiered stage", "two tier stage", "two-tier stage", "stepped stage", "multi level stage", "tiered"] },
  ],
  canopy: [
    { id: "pyramid", label: "Pyramid", aliases: ["pyramid canopy", "pyramid roof", "peaked canopy", "pointed canopy"] },
    { id: "dome", label: "Dome", aliases: ["dome canopy", "domed canopy", "dome roof", "dome", "domed", "gumbad"] },
    { id: "flat", label: "Flat", aliases: ["flat canopy", "flat roof", "flat top canopy"] },
    { id: "frame", label: "Open frame", aliases: ["open frame", "frame only", "open canopy", "no cloth canopy", "bare frame"] },
  ],
  pillars: [
    { id: "round", label: "Round", aliases: ["round pillars", "round pillar", "round columns"] },
    { id: "square", label: "Square", aliases: ["square pillars", "square pillar", "square columns", "square posts"] },
    { id: "fluted", label: "Fluted", aliases: ["fluted pillars", "fluted", "ribbed pillars", "carved pillars", "ribbed columns"] },
  ],
  drapes: [
    { id: "pleated", label: "Pleated", aliases: ["pleated drapes", "pleated", "pleated backdrop"] },
    { id: "plain", label: "Plain", aliases: ["plain drapes", "plain backdrop", "smooth drapes", "plain curtains"] },
    { id: "floral", label: "Floral wall", aliases: ["floral wall", "flower wall", "floral backdrop", "flower backdrop", "floral drapes", "wall of flowers"] },
  ],
  flowers: [
    { id: "natural", label: "Natural", aliases: ["natural flowers", "regular flowers"] },
    { id: "lush", label: "Lush", aliases: ["lush flowers", "lush", "more flowers", "lots of flowers", "overflowing flowers", "abundant flowers", "full of flowers", "heavy flowers"] },
    { id: "sparse", label: "Minimal", aliases: ["minimal flowers", "fewer flowers", "less flowers", "sparse flowers", "sparse", "simple flowers", "minimalist flowers"] },
  ],
  garlands: [
    { id: "strands", label: "Strands", aliases: ["strand garlands", "marigold strands"] },
    { id: "jhumar", label: "Jhumar", aliases: ["jhumar", "jhumars", "long garlands", "tiered garlands", "chandelier garlands"] },
  ],
  aisle: [
    { id: "runner", label: "Runner", aliases: ["plain aisle", "plain runner", "carpet aisle", "runner aisle"] },
    { id: "petals", label: "Petal path", aliases: ["petal aisle", "petal path", "petal runner", "rose petals", "petals on the aisle", "flower petal aisle", "petal carpet"] },
  ],
  lights: [
    { id: "strings", label: "Strings", aliases: ["string lights", "fairy strings", "overhead lights"] },
    { id: "curtain", label: "Curtain", aliases: ["curtain lights", "fairy curtain", "light curtain", "lights curtain", "string curtain", "fairy light curtain"] },
  ],
  floor: [
    { id: "plain", label: "Plain", aliases: ["plain floor"] },
    { id: "checker", label: "Checkerboard", aliases: ["checkerboard", "checker floor", "checkered", "chequered", "marble floor", "chess floor"] },
  ],
  arch: [
    { id: "round", label: "Round", aliases: ["round arch", "round gate"] },
    { id: "pointed", label: "Pointed", aliases: ["pointed arch", "mehrab", "mughal arch", "pointed gate"] },
    { id: "square", label: "Square", aliases: ["square arch", "square gate", "rectangular arch"] },
  ],
};

export const defaultStyle = (el: ElementId): string => STYLES[el]?.[0].id ?? "";

/* ------------------------------------------------------------------ venues */

export type VenueId = "palace" | "garden" | "banquet";

export interface Venue {
  id: VenueId;
  name: string;
  tagline: string;
  /** Who this suits, in a line */
  suits: string;
  defaults: Record<ElementId, string>;
  /** Added parts this venue already has when you walk in */
  extras: AddableId[];
  /** Scene backdrop: sky/ceiling colour and fog */
  backdrop: string;
}

/** Starting colours for the parts a family can add; shared by every venue. */
const EXTRA_COLOURS: Record<AddableId, string> = {
  arch: "#e0962b",
  jhula: "#e57393",
  fountain: "#e8dcc0",
  rangoli: "#e0962b",
  diyas: "#c0662a",
  lanterns: "#e8832b",
  chandeliers: "#ffe0a0",
  photobooth: "#e57393",
  havan: "#a0522d",
};

export const VENUES: Record<VenueId, Venue> = {
  palace: {
    id: "palace",
    name: "Palace courtyard",
    tagline: "Sandstone arches, an open sky, a Rajasthani evening",
    suits: "Jaipur, Udaipur, heritage havelis",
    backdrop: "#2a1a24",
    extras: ["rangoli"],
    defaults: {
      stage: "#c9a063",
      pillars: "#e8dcc0",
      canopy: "#d9822b",
      drapes: "#fbf7ef",
      flowers: "#e0962b",
      garlands: "#e0962b",
      aisle: "#b8321f",
      floor: "#d8c4a0",
      chairs: "#f2e6c9",
      tables: "#fbf7ef",
      lights: "#ffd98a",
      walls: "#d9a066",
      ...EXTRA_COLOURS,
    },
  },
  garden: {
    id: "garden",
    name: "Garden lawn",
    tagline: "Open grass, tall trees, fairy lights at dusk",
    suits: "Farmhouses, resorts, any city with a green plot",
    backdrop: "#1b2a3a",
    extras: [],
    defaults: {
      stage: "#fbf7ef",
      pillars: "#fbf7ef",
      canopy: "#f3e9d2",
      drapes: "#f6efe0",
      flowers: "#e57393",
      garlands: "#f2d43d",
      aisle: "#f0e4cf",
      floor: "#5f9a4a",
      chairs: "#f6efe0",
      tables: "#fbf7ef",
      lights: "#fff0c2",
      walls: "#7da86a",
      ...EXTRA_COLOURS,
      arch: "#f6efe0",
    },
  },
  banquet: {
    id: "banquet",
    name: "Grand banquet hall",
    tagline: "Chandeliers, deep drapes, a ballroom glow",
    suits: "Delhi, Mumbai, any city hotel ballroom",
    backdrop: "#1a1216",
    extras: ["chandeliers"],
    defaults: {
      stage: "#6d1a1a",
      pillars: "#d4a838",
      canopy: "#fbf7ef",
      drapes: "#6d1a1a",
      flowers: "#fbf7ef",
      garlands: "#d4a838",
      aisle: "#8c1c1c",
      floor: "#3a2a22",
      chairs: "#d4a838",
      tables: "#6d1a1a",
      lights: "#ffe0a0",
      walls: "#2a2024",
      ...EXTRA_COLOURS,
      arch: "#d4a838",
      chandeliers: "#ffe0a0",
    },
  },
};

export const VENUE_IDS = Object.keys(VENUES) as VenueId[];

export interface DecorState {
  color: string;
  visible: boolean;
  /** One of STYLES[element], or "" for parts with a single design */
  style: string;
}
/** What the family changed from the venue's defaults. Only changes are stored. */
export type DecorOverrides = Partial<Record<ElementId, Partial<DecorState>>>;

export function resolveDecor(venue: VenueId, overrides: DecorOverrides | undefined): Record<ElementId, DecorState> {
  const v = VENUES[venue];
  const out = {} as Record<ElementId, DecorState> ;
  for (const id of ELEMENT_IDS) {
    const startsVisible = !ELEMENTS[id].addable || v.extras.includes(id as AddableId);
    out[id] = { color: v.defaults[id], visible: startsVisible, style: defaultStyle(id), ...overrides?.[id] };
  }
  return out;
}

export interface Edit {
  element: ElementId;
  color?: string;
  visible?: boolean;
  style?: string;
}

export function applyEdits(overrides: DecorOverrides | undefined, edits: Edit[]): DecorOverrides {
  const next: DecorOverrides = { ...overrides };
  for (const e of edits) {
    next[e.element] = {
      ...next[e.element],
      ...(e.color !== undefined && { color: e.color }),
      ...(e.visible !== undefined && { visible: e.visible }),
      ...(e.style !== undefined && { style: e.style }),
    };
  }
  return next;
}

export const HEX = /^#[0-9a-f]{6}$/i;

export const isStyleOf = (el: ElementId, style: string) => STYLES[el]?.some((s) => s.id === style) ?? false;

/* ------------------------------------------------------------------ colour helpers */

function hexToHsl(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const to = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, "0");
  return `#${to(r)}${to(g)}${to(b)}`;
}

export function shade(hex: string, dl: number, ds = 0): string {
  const [h, s, l] = hexToHsl(hex);
  return hslToHex(h, Math.min(1, Math.max(0, s + ds)), Math.min(0.96, Math.max(0.05, l + dl)));
}

/** Lightness 0–1, for choosing readable label colours */
export const lightness = (hex: string) => hexToHsl(hex)[2];

/* ------------------------------------------------------------------ colour names */

export const COLOURS: Record<string, string> = {
  red: "#c62828",
  crimson: "#b0122b",
  maroon: "#6d1a1a",
  kumkum: "#b8321f",
  sindoor: "#d63c1f",
  vermilion: "#d63c1f",
  pink: "#ec6f9a",
  rose: "#e57393",
  blush: "#f4c2c2",
  magenta: "#c2185b",
  fuchsia: "#d81b8a",
  peach: "#ffb88c",
  coral: "#ff7f6b",
  orange: "#ef8a1f",
  saffron: "#f4900c",
  marigold: "#e0962b",
  mustard: "#d4a017",
  yellow: "#f2d43d",
  haldi: "#f0c419",
  gold: "#d4a838",
  golden: "#d4a838",
  champagne: "#e8d5b0",
  cream: "#f6ecd2",
  ivory: "#fbf7ef",
  white: "#fafafa",
  offwhite: "#f3efe6",
  beige: "#d9c7a3",
  brown: "#6b4a2f",
  copper: "#b4683a",
  bronze: "#8c6a2f",
  olive: "#708238",
  green: "#3f8f4a",
  emerald: "#0f7b5a",
  mint: "#a8dcc3",
  sage: "#9caf88",
  mehendi: "#6b7a3a",
  teal: "#1f8a8a",
  turquoise: "#30b8b0",
  peacock: "#1b6f7a",
  sky: "#7ec8e3",
  blue: "#2f6fd6",
  "royal blue": "#1f3fa8",
  "powder blue": "#b7d3ea",
  navy: "#14284b",
  indigo: "#3f3b9a",
  lavender: "#b9a6e3",
  lilac: "#c8a2c8",
  purple: "#7b3fa0",
  violet: "#6a3fb5",
  plum: "#6e2c5a",
  wine: "#722f37",
  grey: "#8a8a8a",
  gray: "#8a8a8a",
  silver: "#c0c0c0",
  black: "#1a1a1a",
  charcoal: "#36393d",
  "hot pink": "#e91e8c",
  "baby pink": "#f8c8dc",
  "royal red": "#a31621",
  "forest green": "#2d5a3a",
  "bottle green": "#0b4a35",
  "rose gold": "#d9a79a",
  "sea green": "#2e8b6e",
};

/** Words that nudge a base colour: lightness delta and saturation delta. */
const MODIFIERS: Record<string, [number, number]> = {
  dark: [-0.16, 0],
  deep: [-0.12, 0.05],
  rich: [-0.08, 0.08],
  light: [0.14, -0.05],
  pale: [0.22, -0.15],
  pastel: [0.25, -0.2],
  soft: [0.12, -0.12],
  bright: [0.05, 0.2],
  vibrant: [0.02, 0.25],
  muted: [0, -0.3],
};

const NAMES_BY_LENGTH = Object.keys(COLOURS).sort((a, b) => b.length - a.length);

interface Found {
  hex: string;
  /** The phrase matched, modifier included, so it can be removed before looking for elements */
  phrase: string;
}

function findColour(text: string): Found | null {
  for (const name of NAMES_BY_LENGTH) {
    const re = new RegExp(`(?:\\b(${Object.keys(MODIFIERS).join("|")})\\s+)?\\b${name.replace(/ /g, "\\s+")}\\b`, "i");
    const m = text.match(re);
    if (m) {
      let hex = COLOURS[name];
      if (m[1]) {
        const [dl, ds] = MODIFIERS[m[1].toLowerCase()];
        hex = shade(hex, dl, ds);
      }
      return { hex, phrase: m[0] };
    }
  }
  const raw = text.match(/#[0-9a-f]{6}\b/i);
  return raw ? { hex: raw[0].toLowerCase(), phrase: raw[0] } : null;
}

const phraseRe = (alias: string) => new RegExp(`\\b${alias.replace(/[-\s]+/g, "[-\\s]+")}\\b`, "i");

function findElements(text: string): ElementId[] {
  const out: ElementId[] = [];
  const aliasList = ELEMENT_IDS.flatMap((id) => ELEMENTS[id].aliases.map((a) => [a, id] as const)).sort((a, b) => b[0].length - a[0].length);
  let rest = ` ${text} `;
  for (const [alias, id] of aliasList) {
    const re = phraseRe(alias);
    if (re.test(rest)) {
      if (!out.includes(id)) out.push(id);
      rest = rest.replace(re, " ");
    }
  }
  return out;
}

const STYLE_ALIASES = ELEMENT_IDS.flatMap((el) =>
  (STYLES[el] ?? []).flatMap((opt) => opt.aliases.map((alias) => ({ el, style: opt.id, alias }))),
).sort((a, b) => b.alias.length - a.alias.length);

/** Pull style phrases ("dome canopy", "floral wall") out of a clause. Returns the style edits and the text left over. */
function takeStyles(text: string): { edits: Edit[]; rest: string } {
  const edits: Edit[] = [];
  let rest = text;
  for (const { el, style, alias } of STYLE_ALIASES) {
    const re = phraseRe(alias);
    if (re.test(rest)) {
      edits.push({ element: el, style });
      rest = rest.replace(re, " ");
    }
  }
  return { edits, rest };
}

/** Everything that is decoration the couple chooses, as opposed to the venue itself. */
const DECOR_ONLY: ElementId[] = ["stage", "pillars", "canopy", "drapes", "flowers", "garlands", "aisle", "chairs", "tables"];
const PRIMARY: ElementId[] = ["drapes", "aisle", "chairs", "tables", "stage"];
const ACCENT: ElementId[] = ["pillars", "canopy", "garlands", "lights", "flowers"];

export interface Understood {
  edits: Edit[];
  /** Parts of the request that could not be turned into an edit */
  unresolved: string[];
  /** One line telling the user what changed */
  message: string;
}

const HIDE = /\b(remove|hide|delete|without|get rid of|no more|take away|take out|skip|don'?t want|do not want)\b/i;
const SHOW = /\b(add|show|bring back|restore|put back|include|install|place|put in|put up|want a|want an|need a|need an|with a|with an|give me|get me|build|set up)\b/i;
const DARKER = /\b(darker|deeper|richer)\b/i;
const LIGHTER = /\b(lighter|paler|softer|brighter)\b/i;

/** Merge edits so each part appears once; later instructions win field by field. */
function merge(edits: Edit[]): Edit[] {
  const by = new Map<ElementId, Edit>();
  for (const e of edits) {
    const cur = by.get(e.element) ?? { element: e.element };
    by.set(e.element, {
      ...cur,
      ...(e.color !== undefined && { color: e.color }),
      ...(e.visible !== undefined && { visible: e.visible }),
      ...(e.style !== undefined && { style: e.style }),
    });
  }
  return [...by.values()];
}

/** Deterministic parse of a request. `current` lets "darker" be relative, and lets colouring a hidden part show it. */
export function parseLocal(input: string, current: Record<ElementId, DecorState>): Understood {
  const text = input.toLowerCase().replace(/\s+/g, " ").trim();
  const edits: Edit[] = [];
  const unresolved: string[] = [];
  let pending: ElementId[] = [];

  const colour = (el: ElementId, hex: string, show: boolean): Edit => ({
    element: el,
    color: hex,
    ...((show || !current[el].visible) && { visible: true }),
  });

  const clauses = text.split(/\s*(?:,|;|&|\band\b|\bthen\b|\balso\b)\s*/).filter(Boolean);

  // A bare palette ("royal red and gold") with no parts named: first colour leads, second accents.
  const wholeStyles = takeStyles(text);
  const wholeElements = findElements(wholeStyles.rest);
  const colours: Found[] = [];
  if (wholeStyles.edits.length === 0 && wholeElements.length === 0 && !/\b(everything|all|whole|entire)\b/.test(text)) {
    let rest = text;
    for (let i = 0; i < 2; i++) {
      const f = findColour(rest);
      if (!f) break;
      colours.push(f);
      rest = rest.replace(f.phrase, " ");
    }
    if (colours.length === 2) {
      for (const id of PRIMARY) edits.push({ element: id, color: colours[0].hex });
      for (const id of ACCENT) edits.push({ element: id, color: colours[1].hex });
      return { edits, unresolved, message: `Palette set: ${colours[0].phrase} as the main colour, ${colours[1].phrase} as the accent.` };
    }
  }

  for (const clause of clauses) {
    const styled = takeStyles(clause);
    const found = findColour(styled.rest);
    const stripped = found ? styled.rest.replace(found.phrase, " ") : styled.rest;
    const named = findElements(stripped);
    const styleEls = styled.edits.map((e) => e.element);
    let elements = [...new Set([...styleEls, ...named])];
    if (/\b(everything|all of it|the whole|entire|all decor)\b/.test(clause)) elements = [...DECOR_ONLY];

    if (HIDE.test(clause) && named.length) {
      for (const el of named) {
        if (ELEMENTS[el].hideable) edits.push({ element: el, visible: false });
        else unresolved.push(`${ELEMENTS[el].label} can't be removed, only recoloured`);
      }
      continue;
    }

    const wantsShow = SHOW.test(clause);
    edits.push(...styled.edits);
    // choosing a design for something that isn't in the venue yet ("pointed arch") brings it in
    for (const s of styled.edits) if (ELEMENTS[s.element].addable && !current[s.element].visible) edits.push({ element: s.element, visible: true });
    if (wantsShow) for (const el of named) edits.push({ element: el, visible: true });

    if (!elements.length) {
      if (found && pending.length) {
        for (const el of pending) edits.push(colour(el, found.hex, false));
        pending = [];
      } else if (found) unresolved.push(`I found the colour "${found.phrase}" but not what to apply it to`);
      else unresolved.push(`I couldn't tell what "${clause}" should change`);
      continue;
    }
    if (found) {
      for (const el of [...pending, ...elements]) edits.push(colour(el, found.hex, wantsShow));
      pending = [];
    } else if ((DARKER.test(clause) || LIGHTER.test(clause)) && elements.length) {
      const dl = DARKER.test(clause) ? -0.12 : 0.12;
      for (const el of elements) edits.push({ element: el, color: shade(current[el].color, dl) });
    } else if (!styled.edits.length && !wantsShow) {
      pending.push(...elements);
    }
  }
  for (const el of pending) unresolved.push(`No colour given for the ${ELEMENTS[el].label.toLowerCase()}`);

  const merged = merge(edits);
  const message = merged.length
    ? `Updated ${merged.map((e) => ELEMENTS[e.element].label.toLowerCase()).join(", ")}.`
    : "I couldn't find anything to change in that.";
  return { edits: merged, unresolved, message };
}

/** Parts and what they are now, for the model's prompt. */
export function describeScene(venue: VenueId, state: Record<ElementId, DecorState>): string {
  return [
    `Venue: ${VENUES[venue].name}`,
    ...ELEMENT_IDS.map((id) => {
      const s = state[id];
      const style = s.style ? `, style ${s.style}` : "";
      return `- ${id} (${ELEMENTS[id].hint}): ${s.visible ? `${s.color}${style}` : "not in the venue"}`;
    }),
  ].join("\n");
}

/** What the model may choose for each part, written for its prompt. */
export function describeOptions(): string {
  return ELEMENT_IDS.map((id) => {
    const m = ELEMENTS[id];
    const styles = STYLES[id];
    return [
      `- ${id}: ${m.hint}.`,
      m.addable ? " Can be added (starts out of the venue unless shown in the scene)." : m.hideable ? " Can be removed." : " Can be recoloured or restyled, not removed.",
      styles ? ` Styles: ${styles.map((s) => `${s.id} (${s.label})`).join(", ")}.` : "",
    ].join("");
  }).join("\n");
}
