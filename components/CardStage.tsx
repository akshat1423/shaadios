"use client";

import { useEffect, useRef, useState } from "react";
import { CARD_H, CARD_W, CardFaces, type CardData } from "./WeddingCard";

/**
 * The wedding card on its own, no rope: it floats, tilts toward the pointer with a moving sheen, and flips when tapped.
 * Scales down to fit short screens.
 */
export function CardStage({ card, flipped, onFlip, label }: { card: CardData; flipped: boolean; onFlip: () => void; label: string }) {
  const host = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0, gx: 50, gy: 30 });
  const [scale, setScale] = useState(1);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const fit = () => setScale(Math.min(1, (el.clientHeight - 40) / CARD_H, (el.clientWidth - 24) / CARD_W));
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => ro.disconnect();
  }, []);

  const move = (e: React.PointerEvent) => {
    if (reduced || e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    setTilt({ x: (0.5 - py) * 14, y: (px - 0.5) * 18, gx: px * 100, gy: py * 100 });
  };

  return (
    <div ref={host} className="absolute inset-0 flex items-center justify-center overflow-hidden">
      <div style={{ width: CARD_W * scale, height: CARD_H * scale }}>
        <div style={{ width: CARD_W, height: CARD_H, transform: `scale(${scale})`, transformOrigin: "top left", perspective: 1400 }}>
          <div
            role="button"
            tabIndex={0}
            aria-label={label}
            onClick={onFlip}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onFlip())}
            onPointerMove={move}
            onPointerLeave={() => setTilt({ x: 0, y: 0, gx: 50, gy: 30 })}
            className="relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-marigold"
            style={{
              width: CARD_W,
              height: CARD_H,
              transformStyle: "preserve-3d",
              transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y + (flipped ? 180 : 0)}deg)`,
              transition: "transform 0.7s cubic-bezier(.2,.8,.2,1)",
              filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.45))",
            }}
          >
            <CardFaces card={card} />
            {/* a sheen that follows the pointer */}
            <div
              className="pointer-events-none absolute inset-0 rounded-[20px] mix-blend-soft-light"
              style={{ background: `radial-gradient(360px circle at ${tilt.gx}% ${tilt.gy}%, rgba(255,255,255,0.55), transparent 60%)`, backfaceVisibility: "hidden" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
