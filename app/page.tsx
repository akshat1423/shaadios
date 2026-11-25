"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Home } from "@/components/Home";
import { Landing } from "@/components/Landing";
import { Onboarding } from "@/components/Onboarding";
import { useWedding } from "@/lib/store";

export default function Page() {
  const { wedding, ready, save, patch, reset } = useWedding();
  const [phase, setPhase] = useState<"landing" | "onboarding">("landing");

  const screen = !ready ? "boot" : wedding ? "app" : phase;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screen}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: screen === "onboarding" ? 0.55 : 0.45 }}
      >
        {screen === "boot" && <div className="min-h-screen" aria-busy />}
        {screen === "landing" && <Landing onStart={() => setPhase("onboarding")} />}
        {screen === "onboarding" && <Onboarding onDone={save} />}
        {screen === "app" && wedding && (
          <Home
            wedding={wedding}
            onPatch={patch}
            onReset={() => {
              reset();
              setPhase("landing");
            }}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
}
