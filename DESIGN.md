# Shaadi OS — Design System

Inspired by the superconnect UI (tactile paper, spring physics, mono-label typography, skeletons that mirror real layout), re-themed for Indian weddings. Product context and plan: `~/.claude/plans/lexical-dazzling-rivest.md`.

## Principles
1. **Tactile, not flat.** Paper, card stock, brass and ink — an invitation suite you can hold.
2. **One physical metaphor per screen, one wow per flow** (hanging wedding card, flipping invitation, date heat-calendar).
2b. **Wedding-native objects only.** Cards, threads, brass, marigold, mandala, kumkum. Nothing borrowed from tech/office life (no badges, lanyards, ID cards, tickets).
3. **Springs for objects, short tweens for UI.** Nothing teleports; nothing waits without a skeleton.
4. **Typography is the voice:** bold sans + italic serif + mono labels.
5. **Warm, never garish.** Colour carries meaning (events, bride/groom side, status), not decoration.
6. **Mobile-first for guests** (RSVP page), **desktop-great for planners**.

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 (tokens in `@theme inline` in `app/globals.css`, no tailwind.config) · `motion` (`motion/react`) · `lucide-react` · `clsx`.
Fonts via `next/font/google`: Inter (`--font-sans`), Fraunces with `opsz` axis, normal + italic (`--font-serif`), IBM Plex Mono 400/500 (`--font-plex-mono`). Optional: Noto Serif Devanagari for Hindi greetings on invitations.

## Colour tokens
| Token | Value | Use |
|---|---|---|
| paper | `#fbf7ef` | Cards, sheets, surfaces |
| sand | `#efe7d8` | Page tint, wells (also viewport theme colour) |
| sand-deep | `#e3d8c3` | Pressed/inset wells |
| stone (body) | `#d9cfbc` | Fixed body background (see recipe) |
| ink | `#221d17` | Text, primary dark buttons |
| muted | `#7a6f5f` | Secondary text |
| line | `rgba(34,29,23,.10)` | Hairlines |
| night | `#14110e` | Omnibar, card backs, dark stage |
| **kumkum** | `#b8321f` | Primary CTA, focus, brand |
| **marigold** | `#e0962b` | Highlights, tape strips, "best date" |
| **mehendi** | `#6b7a3a` | Success / confirmed |
| **peacock** | `#2f6f73` | Info, bride side |
| **rose** | `#c4607a` | Groom side, alt accent |
| gold foil | `linear-gradient(135deg,#e9c46a,#b8862b)` | Invitation foil accents only |

Selection colour: `rgba(184,50,31,.25)`.

**Body background recipe:** `#d9cfbc` + white radial glow (`1100x650 at 50% 8%`, .34 alpha) + brown radial vignette bottom-right (.16 alpha) + `repeating-linear-gradient(0deg, rgba(34,29,23,.05) 0 1px, transparent 1px 3px)`, `background-attachment: fixed`.

**Per-event accents** (Roka, Haldi, Mehendi, Sangeet, Pheras, Reception): each a `solid / soft / ink` triplet, as superconnect's per-card palette. Example: Haldi = marigold `#e0962b` / `#f6e3bd` / `#55380a`. Text on `soft` fills must reach 4.5:1 contrast — verify when final values are set.

There is no dark mode. `night` is a deliberate second surface, not a theme.

## Typography
- **Wordmark / headings:** bold Inter at tracking `-0.045em` to `-0.05em`, then an italic Fraunces phrase at `-0.035em`; line-height 0.94–0.98. Wordmark: "shaadi" bold + "os" italic serif.
- **H1:** `clamp(40px, min(5vw, 8.4vh), 74px)`. **Onboarding hero:** `clamp(52px, 9vw, 112px)`. **Card names:** 25–31px bold.
- **Mono labels (the system's voice):** Plex Mono, uppercase, 9.5–13px, tracking 0.06–0.2em. Numbered section heads `(01) DATE`; counters `[326] guests`, `02 / 06`; spec rows `LABEL :: value`.
- **Body:** Inter 12.5–16px, antialiased. Hierarchy through ink opacity `/55` → `/80`.

## Surfaces
- **Radii:** card 26px (photo inset 18px) · sheet 28px · omnibar 22px · dropdown 16px · keycap 10px · segmented outer `rounded-xl` / inner `rounded-lg` · chips, pills, toasts full.
- **`.card-shadow` (5 layers):** `0 1px 0 rgba(255,255,255,.9) inset`, `0 0 0 1px rgba(34,29,23,.08)`, `0 2px 4px rgba(60,40,20,.08)`, `0 12px 24px -6px rgba(60,40,20,.22)`, `0 32px 60px -20px rgba(60,40,20,.35)`.
- **`.paper`:** inline-SVG `feTurbulence` noise (`baseFrequency .85`) tinted brown at .09 alpha over `#fbf7ef`.
- **`.dots`:** `radial-gradient(circle, rgba(34,29,23,.1) 1.7px, transparent 2.1px)` at 14px spacing.
- **`.night-card`:** `#14110e` + top-left white radial glow + faint horizontal grille lines.
- **Perforation edges** (half-circle bites), **taped scraps** (rotate ±2–3° + marigold tape strip) for storytelling.
- **Hairlines:** `border-ink/10`; `border-dashed` for forms, stitching, perforations.
- **Blur:** scrims only (`bg-ink/30 backdrop-blur-[3px]`) and dark control overlays (`bg-night/70 backdrop-blur`). Glare layers use `mix-blend-soft-light`; seals use `mix-blend-multiply`.
- All textures are CSS/SVG — no image assets.

## Motion
**Springs (objects):**
| Where | stiffness / damping / mass |
|---|---|
| Deck cards | 230 / 24 / 0.9 |
| Card flip (`rotateY 0↔180`) | 140 / 18 / 0.8 |
| Grid items (stagger `min(i,12)×25ms`) | 260 / 26 |
| Sheets (`y 60, scale .98 → 0, 1`) | 300 / 30 |
| Toasts | 300 / 26 |
| Dial | 520 / 17 / 0.7 |
| Tilt (`useSpring`) | 220 / 18 |

**Tweens (UI):** `easeOut` 0.4–0.7s; dropdowns 0.14s; tooltips 0.12s; camera/pan easeOutCubic `1-(1-t)^3` over 650ms.

**Screen transitions:** `AnimatePresence mode="wait"` crossfades (0.45–0.55s) with `y 24 → 0` enter and `y -16` exit. Superconnect has no router-level or View Transitions use; here we add the **View Transitions API** for shared-element hops (tab → detail, invitation thumbnail → full preview), with `layoutId` in `motion` as the fallback.

**Micro-interactions:**
- Tilt ≤ 9° with a glare `radial-gradient(420px circle at gx% gy%, rgba(255,255,255,.5), transparent 60%)`; disabled for touch pointers.
- Keycap buttons: 4px solid under-shadow (`#b3a78f`; kumkum variant `#7d2214`); `:active` → `translateY(3px)`, under-shadow 1px, 80ms; hover `brightness(1.03)`.
- Hover swing: `rotate [0,-2.6,1.9,-1.1,.5,0]` over 1.3s, `transform-origin 50% -40px`.
- Drag: `whileDrag {scale 1.03, rotate 3}`, `dragElastic .6`; commit a swipe at offset > 110px or velocity > 600.
- Focus: `ring-2 ring-kumkum`; fields `focus:border-kumkum`.
- Haptics on dial detents: `navigator.vibrate(6)`.

**Loading:**
- Skeletons mirror the real layout exactly (no layout shift). Diagonal `.sweep` band: `linear-gradient(105deg, transparent 15%, rgba(255,255,255,.6) 50%, transparent 85%)` translating `-100% → 100%` over 1.6s; dark variant at .12 alpha.
- "Reading your shaadi…" four-step ticker, 750ms per step, minimum 2.8s.

**Reduced motion:** apply `prefers-reduced-motion` globally (superconnect only handles the lanyard and sweep): springs → instant, sweep off, lanyard static, no tilt.

Animate `transform` and `opacity` only.

## Signature interactions
1. **Hanging wedding card** — the invitation itself, hung from a red-and-gold moli thread through a brass ring under a marigold toran (physics adapted from superconnect `Lanyard.tsx`). Ivory stock, gold double border with corner vines, kumkum arch holding a gold mandala, Devanagari blessing (Hindu calendar only), serif italic names, month · day · year date block, "N days to go". Drag to swing, tap to flip to the maroon back with the plan summary. Never an ID badge, lanyard text, or "pass".
2. **Date dial** — drum over candidate dates; detents snap to muhurats; price-pressure and attendance bars animate as you turn.
3. **Invitation card** — tilt + glare, gold-foil edge, flips to a per-event schedule, paper-grain stock, print-ready export.
4. **Omnibar quick-add** — "Sharma family 6 Jaipur Jain bride side" → dashed terra-style "Understood as" ghost chips → Enter pins.
5. **RSVP postcards** — replies fan out; accepted = stamp, declined = soft fade; headcount counter ticks up.
6. **Rubber-stamp seal** on locked decisions (date locked, venue booked) — worn-ink SVG displacement filter.

## Layout & components
- **Header:** wordmark + mono `[326] guests` counter + segmented tabs (Date · Venue · Budget · Guests · Invites; active pill `bg-night text-paper`, shadow `0 2px 6px rgba(0,0,0,.35)`) + kumkum keycap "Add".
- **Footer:** fixed mono 10.5px status bar fading from stone.
- **Shortcuts:** `/` or ⌘K search, `N` add, `G` guests, `D` date; Esc closes sheets; ⌘Enter saves.
- **Landing:** 47/53 split — promise + 3-step list + CTA left; dark `graph-bg` stage with the hanging pass right; taped pain-point scraps fade up staggered.
- **Cards:** front = photo/date, serial `Nº 014`, two-line name, footer `dd.mm.yy / CODE`; back = `night-card` with schedule and a deterministic barcode.
- **Sheets/modals:** `paper`, `rounded-t-[28px]` on mobile, centred `rounded-[28px]` on `sm+`, `max-h-[92vh]`, scrim `bg-ink/30 backdrop-blur-[3px]`; primary pill `bg-ink hover:bg-kumkum disabled:opacity-35`.
- **Forms:** giant borderless underlined inputs for onboarding (`clamp(28px,3.6vw,46px)`, `border-b-2`, focus kumkum); dashed-underline mono inputs in spec panels.
- **Chips:** `rounded-full bg-ink/6 text-ink/80` 12px; accent `bg-kumkum/12 text-kumkum`; ghost = dashed kumkum.
- **Empty states:** keycap icon tile + 28px bold headline + mono hint + keycap actions.
- **Toast:** bottom-centre `bg-ink text-paper` pill with mehendi check, 3.2s auto-dismiss.
- **Guest RSVP page (`/r/[token]`):** single column, thumb-reach CTAs, one question per screen, per-event toggles, diet chips (Veg / Jain / Vegan / Non-veg), travel city/ETA last, confirmation stamp. Touch targets ≥ 44px.

## Accessibility & performance
Full keyboard paths; visible focus rings; 4.5:1 text contrast; LCP < 2.5s on 4G; `next/image` for photos; skeleton → data with zero layout shift; Lighthouse a11y ≥ 95.

## Source reference (superconnect)
Newest UI: `~/superconnect/.claude/worktrees/superconnect-ui` (branch `wispr-flow`). Port, don't import: `app/globals.css`, `components/Lanyard.tsx`, `Card.tsx`, `Omnibar.tsx`, `Skeleton.tsx`, `Onboarding.tsx`, `Detail.tsx`, `PostCards.tsx`, `Seal.tsx`, `PostDial.tsx`.
