/*
 * A marigold toran: the garland hung across a doorway at a wedding. Static SVG, built once from a sagging curve.
 * `slice` keeps the flowers round at any stage width (the garland just shows more or less of itself).
 */

const W = 800;
const SWAG = 200; // distance between hooks
const FLOWERS = [
  "#e0962b",
  "#f2b53f",
  "#e8832b",
  "#f2b53f",
  "#b8321f",
];

const sag = (x: number) => 6 + 30 * Math.sin((Math.PI * (x % SWAG)) / SWAG);

const flowers: { x: number; y: number; c: string; r: number }[] = [];
for (let x = 4, i = 0; x < W; x += 13, i++) flowers.push({ x, y: sag(x), c: FLOWERS[i % FLOWERS.length], r: 6.5 });

const leaves: { x: number; y: number; a: number }[] = [];
for (let x = 10; x < W; x += 26) leaves.push({ x, y: sag(x) + 6, a: ((x / 26) % 2 ? 1 : -1) * 28 });

const drops: { x: number; y: number }[] = [];
for (let x = SWAG / 2; x < W; x += SWAG) drops.push({ x, y: sag(x) });

export function Toran({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${W} 96`} preserveAspectRatio="xMidYMin slice" className={className} aria-hidden>
      <path d={`M0 6 ${Array.from({ length: W / SWAG }, (_, i) => `Q ${i * SWAG + SWAG / 2} 66 ${(i + 1) * SWAG} 6`).join(" ")}`} fill="none" stroke="#7d5a1a" strokeWidth={1.2} opacity={0.8} />
      {leaves.map((l) => (
        <ellipse key={`l${l.x}`} cx={l.x} cy={l.y} rx={3} ry={7} fill="#6b7a3a" transform={`rotate(${l.a} ${l.x} ${l.y})`} />
      ))}
      {drops.map((d) => (
        <g key={`d${d.x}`}>
          <line x1={d.x} y1={d.y} x2={d.x} y2={d.y + 22} stroke="#e9c46a" strokeWidth={1} />
          <circle cx={d.x} cy={d.y + 25} r={4} fill="#e9c46a" />
          <circle cx={d.x} cy={d.y + 25} r={1.6} fill="#8a5d12" />
        </g>
      ))}
      {flowers.map((f) => (
        <g key={`f${f.x}`}>
          <circle cx={f.x} cy={f.y} r={f.r} fill={f.c} />
          <circle cx={f.x} cy={f.y} r={f.r * 0.45} fill="rgba(255,255,255,0.28)" />
        </g>
      ))}
    </svg>
  );
}
