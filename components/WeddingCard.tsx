"use client";

import { useId } from "react";
import { formatDay, formatMonth } from "@/lib/dates";

export const CARD_W = 340;
export const CARD_H = 560;

export interface CardData {
  a: string;
  b: string;
  /** Locked wedding date, "YYYY-MM-DD" */
  date?: string;
  city: string;
  tradition?: string;
  /** Show the Hindu blessing line (Devanagari). Other traditions get a neutral line. */
  hindu?: boolean;
  guests?: number;
  budgetLakh?: number;
  /** Days to go, when the date is locked */
  countdown?: number | null;
}

const GOLD = "#c9973a";
const GOLD_LIGHT = "#f1d48a";
const MAROON = "#5a170d";
const DEVA = '"Kohinoor Devanagari","Devanagari Sangam MN","Noto Serif Devanagari","Mukta",serif';
const MARIGOLD = ["#e8832b", "#f2b53f", "#e0962b", "#f6c453"];

/* Marigold garland columns, swags and pearls, laid out once on the card's 340 x 560 grid. */
const COLUMNS: { x: number; y: number; c: string }[] = [];
for (const x of [24, 316]) for (let i = 0, y = 62; y < 442; i++, y += 10.5) COLUMNS.push({ x: x + Math.sin(i * 0.7) * 1.4, y, c: MARIGOLD[i % 4] });
const along = (x0: number, x1: number, y0: number, sag: number, n: number) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return { x: x0 + (x1 - x0) * t, y: y0 + 4 * sag * t * (1 - t) };
  });
const SWAGS = [...along(24, 112, 100, 24, 14), ...along(112, 228, 100, 30, 20), ...along(228, 316, 100, 24, 14)].map((p, i) => ({ ...p, c: MARIGOLD[i % 4] }));
const PEARLS = [...along(24, 112, 88, 16, 12), ...along(112, 228, 88, 22, 18), ...along(228, 316, 88, 16, 12)];
const PETALS = Array.from({ length: 26 }, (_, i) => {
  const t = ((i * 37) % 100) / 100;
  const y = 452 + t * 100;
  const half = 66 + t * 74;
  return { x: 170 + (((i * 53) % 100) / 100 - 0.5) * 2 * (half - 12), y, c: MARIGOLD[i % 4] };
});

/** A mandala drawn from petals and rings. */
function Mandala({ size, tone }: { size: number; tone: string }) {
  const outer = Array.from({ length: 16 }, (_, i) => i * 22.5);
  const mid = Array.from({ length: 12 }, (_, i) => i * 30 + 15);
  return (
    <svg viewBox="-50 -50 100 100" width={size} height={size} fill="none" stroke={tone} strokeWidth={0.8} aria-hidden>
      <circle r={48} />
      {outer.map((a) => (
        <ellipse key={`o${a}`} cx={0} cy={-35} rx={4.6} ry={10} transform={`rotate(${a})`} />
      ))}
      <circle r={25} strokeWidth={0.5} />
      {mid.map((a) => (
        <ellipse key={`m${a}`} cx={0} cy={-19} rx={3.4} ry={7.5} transform={`rotate(${a})`} />
      ))}
      <circle r={11} />
      <circle r={2.4} fill={tone} stroke="none" />
    </svg>
  );
}

/** A little vine that curls into each corner of the border. */
function Corner({ className, stroke }: { className: string; stroke: string }) {
  return (
    <svg viewBox="0 0 40 40" width={40} height={40} className={className} fill="none" stroke={stroke} strokeWidth={1.2} aria-hidden>
      <path d="M2 2 C 20 2 30 10 30 30" />
      <path d="M2 2 C 2 20 10 30 30 30" strokeWidth={0.7} opacity={0.6} />
      <circle cx={30} cy={30} r={2.4} fill={stroke} stroke="none" />
      <path d="M14 3 C 14 9 18 11 22 10 C 22 5 18 3 14 3 Z" fill={stroke} fillOpacity={0.25} />
      <path d="M3 14 C 9 14 11 18 10 22 C 5 22 3 18 3 14 Z" fill={stroke} fillOpacity={0.25} />
    </svg>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed py-2.5" style={{ borderColor: "rgba(233,196,106,0.25)" }}>
      <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#e9c46a]/70">{k}</span>
      <span className="text-right text-[14px] text-paper/95">{v}</span>
    </div>
  );
}

/** The front: a carved golden gate, marigold garlands, a panelled door and a red carpet that carries the date. */
function Front({ card }: { card: CardData }) {
  const id = useId().replace(/:/g, "");
  const first = (s: string) => s.trim().split(/\s+/)[0] || "—";
  const [monthName, year] = card.date ? formatMonth(card.date.slice(0, 7)).split(" ") : ["", ""];
  const day = card.date ? card.date.slice(8).replace(/^0/, "") : "";

  return (
    <div
      className="card-shadow absolute inset-0 overflow-hidden rounded-[20px]"
      style={{ backfaceVisibility: "hidden", background: "linear-gradient(170deg, #f3dc9a 0%, #d9ab4a 38%, #b98a2c 100%)" }}
    >
      <svg viewBox="0 0 340 560" className="absolute inset-0 h-full w-full" aria-hidden>
        <defs>
          <pattern id={`${id}-carve`} width="14" height="14" patternUnits="userSpaceOnUse">
            <path d="M7 1 L13 7 L7 13 L1 7 Z" fill="none" stroke="#7a5412" strokeWidth="0.6" opacity="0.22" />
          </pattern>
          <linearGradient id={`${id}-door`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#b8801c" />
            <stop offset="1" stopColor="#7a4f0e" />
          </linearGradient>
          <linearGradient id={`${id}-frame`} x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#a8761f" />
            <stop offset="0.5" stopColor="#d9ab4a" />
            <stop offset="1" stopColor="#a8761f" />
          </linearGradient>
          <linearGradient id={`${id}-carpet`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#d4513b" />
            <stop offset="1" stopColor="#8f2415" />
          </linearGradient>
          <radialGradient id={`${id}-glow`}>
            <stop offset="0" stopColor="#ffe9a8" stopOpacity="0.9" />
            <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="340" height="560" fill={`url(#${id}-carve)`} />

        {/* lantern domes */}
        {[62, 278].map((x) => (
          <g key={x}>
            <circle cx={x} cy={64} r={22} fill={`url(#${id}-glow)`} />
            <path d={`M${x - 17} 70 a17 17 0 0 1 34 0 Z`} fill="#8d6417" stroke={GOLD_LIGHT} strokeWidth="1.2" />
            <rect x={x - 12} y={70} width={24} height={12} rx={2} fill="#3d2a08" stroke={GOLD_LIGHT} strokeWidth="1" />
            <rect x={x - 6} y={72} width={12} height={8} rx={1.5} fill="#ffd77a" />
            <line x1={x} y1={50} x2={x} y2={44} stroke={GOLD_LIGHT} strokeWidth="1.5" />
            <circle cx={x} cy={42} r={2.4} fill={GOLD_LIGHT} />
          </g>
        ))}

        {/* carved frame and the panelled door */}
        <path d="M50 448 V226 A120 120 0 0 1 290 226 V448 Z" fill={`url(#${id}-frame)`} stroke={GOLD_LIGHT} strokeWidth="2" />
        <path d="M60 448 V228 A110 110 0 0 1 280 228 V448 Z" fill="none" stroke="#7a5412" strokeWidth="1" opacity="0.7" />
        <path d="M72 448 V230 A98 98 0 0 1 268 230 V448 Z" fill={`url(#${id}-door)`} stroke={GOLD_LIGHT} strokeWidth="3" />
        <line x1="170" y1="134" x2="170" y2="448" stroke="#3d2a08" strokeWidth="2" opacity="0.55" />
        {[250, 312, 374].map((y) => (
          <g key={y}>
            <rect x="84" y={y} width="76" height="50" rx="3" fill="rgba(255,235,170,0.07)" stroke={GOLD_LIGHT} strokeWidth="0.9" opacity="0.8" />
            <rect x="180" y={y} width="76" height="50" rx="3" fill="rgba(255,235,170,0.07)" stroke={GOLD_LIGHT} strokeWidth="0.9" opacity="0.8" />
            {[88, 156].map((x) => <circle key={`l${x}`} cx={x} cy={y + 5} r="1.6" fill={GOLD_LIGHT} />)}
            {[184, 252].map((x) => <circle key={`r${x}`} cx={x} cy={y + 5} r="1.6" fill={GOLD_LIGHT} />)}
          </g>
        ))}
        <circle cx="160" cy="352" r="3.4" fill={GOLD_LIGHT} />
        <circle cx="180" cy="352" r="3.4" fill={GOLD_LIGHT} />

        {/* red carpet */}
        <polygon points="104,448 236,448 312,560 28,560" fill={`url(#${id}-carpet)`} />
        <line x1="104" y1="448" x2="28" y2="560" stroke={GOLD_LIGHT} strokeWidth="3" />
        <line x1="236" y1="448" x2="312" y2="560" stroke={GOLD_LIGHT} strokeWidth="3" />
        {PETALS.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={1.9} fill={p.c} opacity="0.85" />)}

        {/* diyas along the carpet */}
        {[0.28, 0.56, 0.84].flatMap((t) =>
          [-1, 1].map((s) => {
            const x = s < 0 ? 104 - 76 * t - 8 : 236 + 76 * t + 8;
            const y = 448 + 112 * t;
            return (
              <g key={`${t}${s}`}>
                <circle cx={x} cy={y - 3} r={9} fill={`url(#${id}-glow)`} />
                <path d={`M${x - 5} ${y} a5 5 0 0 0 10 0 Z`} fill="#8d4a14" />
                <ellipse cx={x} cy={y - 3} rx="2" ry="3.4" fill="#ffd27a" />
              </g>
            );
          }),
        )}

        {/* rose vases */}
        {[36, 304].map((x) => (
          <g key={x}>
            <path d={`M${x - 14} 470 L${x + 14} 470 L${x + 9} 448 L${x - 9} 448 Z`} fill="#b8862b" stroke={GOLD_LIGHT} strokeWidth="1" />
            {[[-8, -8], [8, -9], [0, -13], [-13, 0], [13, -1], [-3, -2], [6, 3], [-8, 5]].map(([dx, dy], i) => (
              <circle key={i} cx={x + dx} cy={444 + dy} r={7.5} fill={i % 2 ? "#b0122b" : "#c62828"} stroke="#7d0e1a" strokeWidth="0.6" />
            ))}
          </g>
        ))}

        {/* garlands */}
        {COLUMNS.map((p, i) => <circle key={`c${i}`} cx={p.x} cy={p.y} r={7.2} fill={p.c} stroke="#b4651a" strokeWidth="0.5" />)}
        {SWAGS.map((p, i) => <circle key={`s${i}`} cx={p.x} cy={p.y} r={5.2} fill={p.c} stroke="#b4651a" strokeWidth="0.4" />)}
        {PEARLS.map((p, i) => <circle key={`p${i}`} cx={p.x} cy={p.y} r={2.6} fill="#fbf7ef" stroke="#cdb98a" strokeWidth="0.4" />)}
      </svg>

      {/* border and corners */}
      <div className="absolute inset-[8px] rounded-[14px] border-[1.5px]" style={{ borderColor: MAROON }} />
      <div className="absolute inset-[13px] rounded-[10px] border" style={{ borderColor: "rgba(90,23,13,0.45)" }} />
      <Corner className="absolute left-[14px] top-[14px]" stroke={MAROON} />
      <Corner className="absolute right-[14px] top-[14px] -scale-x-100" stroke={MAROON} />

      {/* the blessing */}
      <p className="absolute inset-x-0 top-[17px] text-center text-[12px] leading-none tracking-[0.04em]" style={{ color: MAROON, fontFamily: card.hindu ? DEVA : undefined }}>
        {card.hindu ? "॥ श्री गणेशाय नमः ॥" : <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Together with their families</span>}
      </p>

      {/* the couple, on the door */}
      <div className="absolute left-1/2 top-[186px] w-[172px] -translate-x-1/2 text-center">
        <p className="font-mono text-[9px] uppercase tracking-[0.26em]" style={{ color: GOLD_LIGHT }}>Save the date</p>
        <div className="mt-2 rounded-[14px] border px-3 py-4" style={{ background: "rgba(48,12,6,0.88)", borderColor: GOLD_LIGHT, boxShadow: "0 8px 24px -8px rgba(0,0,0,0.6)" }}>
          <h3 className="truncate font-serif text-[34px] font-normal italic leading-none tracking-[-0.03em] text-[#fbf1d2]">{first(card.a)}</h3>
          <p className="my-1.5 font-mono text-[9.5px] uppercase tracking-[0.3em]" style={{ color: GOLD_LIGHT }}>weds</p>
          <h3 className="truncate font-serif text-[34px] font-normal italic leading-none tracking-[-0.03em] text-[#fbf1d2]">{first(card.b)}</h3>
        </div>
      </div>

      {/* the date, on the carpet */}
      <div className="absolute inset-x-0 bottom-[22px] text-center" style={{ textShadow: "0 1px 6px rgba(60,10,5,0.7)" }}>
        {card.date ? (
          <>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.28em] text-[#ffe9b8]">{formatDay(card.date)}</p>
            <p className="mt-0.5 flex items-baseline justify-center gap-2 text-[#fff6dd]">
              <span className="font-serif text-[15px] italic">{monthName}</span>
              <span className="font-serif text-[38px] font-semibold leading-none tracking-[-0.04em]">{day}</span>
              <span className="font-serif text-[15px] italic">{year}</span>
            </p>
          </>
        ) : (
          <>
            <p className="font-serif text-[19px] italic text-[#fff6dd]">Date to be announced</p>
            <p className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.2em] text-[#ffe9b8]/80">{card.hindu ? "muhurat awaited" : "save the date"}</p>
          </>
        )}
        <p className="mt-1.5 font-mono text-[9.5px] uppercase tracking-[0.26em] text-[#ffe9b8]">— {card.city} —</p>
        {card.countdown != null && card.countdown >= 0 && (
          <p className="mt-1 font-mono text-[9px] tracking-[0.14em] text-[#ffd27a]">{card.countdown === 0 ? "TODAY" : `${card.countdown} DAYS TO GO`}</p>
        )}
      </div>
    </div>
  );
}

/** Both faces of the wedding card. Rendered inside a 3D space, so each face hides its back. */
export function CardFaces({ card }: { card: CardData }) {
  const first = (s: string) => s.trim().split(/\s+/)[0] || "—";
  const [monthName, year] = card.date ? formatMonth(card.date.slice(0, 7)).split(" ") : ["", ""];

  return (
    <>
      <Front card={card} />

      {/* Back: the plan so far, on deep maroon */}
      <div
        className="card-shadow absolute inset-0 overflow-hidden rounded-[20px]"
        style={{
          backfaceVisibility: "hidden",
          transform: "rotateY(180deg)",
          background: "radial-gradient(260px 200px at 20% 0%, rgba(255,255,255,0.1), transparent 70%), linear-gradient(160deg, #8f2415, #5a170d)",
        }}
      >
        <div className="absolute inset-[9px] rounded-[14px] border-[1.5px]" style={{ borderColor: GOLD }} />
        <div className="absolute inset-[14px] rounded-[10px] border" style={{ borderColor: "rgba(201,151,58,0.4)" }} />
        <div className="absolute -right-10 -top-10 opacity-25" aria-hidden>
          <Mandala size={190} tone={GOLD_LIGHT} />
        </div>
        <div className="relative flex h-full flex-col px-9 pb-8 pt-10">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.22em] text-[#f1d48a]">The plan so far</p>
          <div className="mt-3">
            <Row k="Couple" v={`${first(card.a)} & ${first(card.b)}`} />
            <Row k="City" v={card.city} />
            <Row k="Guests" v={card.guests ? `${card.guests}` : "—"} />
            <Row k="Budget" v={card.budgetLakh ? `₹${card.budgetLakh} lakh` : "—"} />
            <Row k="Calendar" v={card.tradition ?? "—"} />
            <Row k="Date" v={card.date ? `${formatDay(card.date)}, ${card.date.slice(8).replace(/^0/, "")} ${monthName} ${year}` : "Not locked"} />
          </div>
          <p className="mt-auto text-center font-serif text-[15px] italic text-[#f1d48a]/80">with love, and a little planning</p>
        </div>
      </div>
    </>
  );
}
