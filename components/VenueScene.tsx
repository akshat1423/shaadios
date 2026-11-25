"use client";

import { useEffect, useRef } from "react";
import type { DecorState, ElementId, VenueId } from "@/lib/decor";
import { createVenueScene, type VenueController, type ViewPreset } from "@/lib/venue3d";

interface Props {
  venue: VenueId;
  state: Record<ElementId, DecorState>;
  selected: ElementId | null;
  view: ViewPreset;
  onPick: (el: ElementId | null) => void;
  onHover: (el: ElementId | null, clientX: number, clientY: number) => void;
  onFail: (reason: string) => void;
}

/** Hosts the three.js scene. The scene is rebuilt only when the venue changes; colours and visibility just update it. */
export function VenueScene({ venue, state, selected, view, onPick, onHover, onFail }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const ctl = useRef<VenueController | null>(null);

  // Latest props, readable from the long-lived scene without rebuilding it.
  const latest = useRef({ state, selected, view, onPick, onHover, onFail });
  useEffect(() => {
    latest.current = { state, selected, view, onPick, onHover, onFail };
  });

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let c: VenueController;
    try {
      c = createVenueScene(el, venue, {
        onPick: (e) => latest.current.onPick(e),
        onHover: (e, x, y) => latest.current.onHover(e, x, y),
      });
    } catch (err) {
      latest.current.onFail(err instanceof Error ? err.message : "WebGL is not available");
      return;
    }
    ctl.current = c;
    c.apply(latest.current.state);
    c.setSelected(latest.current.selected);
    return () => {
      c.dispose();
      ctl.current = null;
    };
  }, [venue]);

  useEffect(() => {
    ctl.current?.apply(state);
  }, [state]);
  useEffect(() => {
    ctl.current?.setSelected(selected);
  }, [selected]);
  const first = useRef(true);
  useEffect(() => {
    // the scene opens on the entrance view by itself; only react to the user choosing a view afterwards
    if (first.current) {
      first.current = false;
      return;
    }
    ctl.current?.setView(view);
  }, [view]);

  return <div ref={host} className="absolute inset-0" role="img" aria-label="3D view of the venue. Drag to look around, scroll to zoom, click a part to select it." />;
}
