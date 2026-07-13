"use client";

import { useEffect, useState } from "react";
import { motion, useScroll } from "motion/react";

// A slim vertical section rail (desktop only) that fills as you scroll and
// highlights the section in view. Palette-driven; terracotta fill.
const NODES = [
  { id: "top", label: "Overview" },
  { id: "how", label: "How it works" },
  { id: "proof", label: "Why it's safe" },
  { id: "stack", label: "Under the hood" },
  { id: "cta", label: "Get started" },
];

export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const [active, setActive] = useState(0);

  useEffect(() => {
    const sections = NODES.map((n) => document.getElementById(n.id)).filter(
      Boolean,
    ) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = NODES.findIndex((n) => n.id === e.target.id);
            if (idx >= 0) setActive(idx);
          }
        });
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return (
    <div className="fixed right-5 top-1/2 z-40 hidden -translate-y-1/2 lg:block">
      <div className="relative flex flex-col items-center">
        <div
          className="absolute left-1/2 top-2 bottom-2 w-px -translate-x-1/2"
          style={{ background: "var(--color-line)" }}
        />
        <motion.div
          className="absolute left-1/2 top-2 w-px -translate-x-1/2 origin-top"
          style={{
            scaleY: scrollYProgress,
            height: "calc(100% - 16px)",
            background: "var(--color-gold)",
          }}
        />
        {NODES.map((n, i) => {
          const current = i === active;
          const done = i < active;
          return (
            <a
              key={n.id}
              href={`#${n.id}`}
              aria-label={n.label}
              className="group relative z-10 flex items-center py-3"
            >
              <span
                className="pointer-events-none absolute right-6 whitespace-nowrap rounded-md border px-2 py-1 font-mono text-[10px] opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
                style={{
                  borderColor: "var(--color-line)",
                  background: "color-mix(in srgb, var(--color-panel) 90%, transparent)",
                  color: "var(--color-dim)",
                }}
              >
                {n.label}
              </span>
              <span
                className="grid h-3 w-3 place-items-center rounded-full border transition-all duration-300"
                style={{
                  borderColor:
                    current || done ? "var(--color-gold)" : "var(--color-line)",
                  background: current
                    ? "var(--color-gold)"
                    : done
                      ? "var(--color-gold-soft)"
                      : "var(--color-ink)",
                  transform: current ? "scale(1.25)" : "scale(1)",
                }}
              />
            </a>
          );
        })}
      </div>
    </div>
  );
}
