"use client";

/*
 * The Release Ring — Paylance's signature element (instrument / dial style).
 * A tick-mark gauge for the review window: ticks deplete in the neutral "held"
 * tone while funds are in escrow, then the whole dial ignites in the accent
 * when payment is RELEASED. Colour encodes the hero mechanic: the timeout, not
 * the platform, pays the freelancer. All colours are CSS vars → palette-proof.
 */

type Props = {
  /** 0..1 — portion of the review window remaining (1 = full, 0 = deadline). */
  fraction: number;
  /** true once funds are released (dial fills + ignites accent). */
  released?: boolean;
  size?: number;
  /** center label (e.g. countdown "1:04" or "PAID"). */
  label?: string;
  sublabel?: string;
};

const TICKS = 64;

export function ReleaseRing({
  fraction,
  released = false,
  size = 260,
  label,
  sublabel,
}: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const rOuter = size / 2 - 6;
  const clamped = Math.max(0, Math.min(1, fraction));
  const shown = released ? 1 : clamped;

  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const t = i / TICKS;
    const angle = -Math.PI / 2 + t * 2 * Math.PI; // start at top, clockwise
    const isMajor = i % 8 === 0;
    const len = isMajor ? size * 0.052 : size * 0.03;
    const rIn = rOuter - len;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const active = t < shown + 1e-6;
    const color = released
      ? "var(--color-gold)"
      : active
        ? "var(--color-cool)"
        : "var(--color-line)";
    return (
      <line
        key={i}
        x1={cx + rOuter * cos}
        y1={cy + rOuter * sin}
        x2={cx + rIn * cos}
        y2={cy + rIn * sin}
        stroke={color}
        strokeWidth={isMajor ? 2 : 1.25}
        strokeLinecap="round"
        style={{
          transition: "stroke 0.4s ease, opacity 0.4s ease",
          opacity: active || released ? 1 : 0.45,
        }}
      />
    );
  });

  return (
    <div
      style={{ width: size, height: size }}
      className="relative grid place-items-center"
    >
      <svg
        width={size}
        height={size}
        style={{
          filter: released
            ? "drop-shadow(0 0 12px color-mix(in srgb, var(--color-gold) 45%, transparent))"
            : "none",
          transition: "filter 0.5s ease",
        }}
      >
        {ticks}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          {label && (
            <div
              className="font-mono tnum"
              style={{
                fontSize: size * 0.16,
                fontWeight: 500,
                color: released ? "var(--color-gold)" : "var(--color-text)",
                lineHeight: 1,
              }}
            >
              {label}
            </div>
          )}
          {sublabel && (
            <div
              className="eyebrow mt-2"
              style={{
                color: released ? "var(--color-gold)" : "var(--color-mute)",
              }}
            >
              {sublabel}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
