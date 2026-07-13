"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// An orbital gyroscope: three slender rings tilted on different axes, plus a
// small floating core, rotating slowly like a kinetic sculpture. Deliberately
// NOT a tick dial — it frames the 2D clock as an elegant orbit rather than
// duplicating it. Rings ease toward the accent colour as release nears.

type Colors = { gold: string; cool: string; text: string };

function lerpColor(a: THREE.Color, b: THREE.Color, t: number) {
  return a.clone().lerp(b, t);
}

function Gyroscope({
  progress, // 0 = held, 1 = released
  colors,
  reduced,
}: {
  progress: number;
  colors: Colors;
  reduced: boolean;
}) {
  const r1 = useRef<THREE.Mesh>(null);
  const r2 = useRef<THREE.Mesh>(null);
  const r3 = useRef<THREE.Mesh>(null);
  const core = useRef<THREE.Mesh>(null);
  const held = new THREE.Color(colors.cool);
  const hot = new THREE.Color(colors.gold);

  useFrame((state, dt) => {
    const d = reduced ? 0 : dt;
    if (r1.current) r1.current.rotation.z += d * 0.18;
    if (r2.current) {
      r2.current.rotation.x += d * 0.22;
      r2.current.rotation.y += d * 0.1;
    }
    if (r3.current) r3.current.rotation.y += d * 0.15;
    if (core.current) {
      const t = state.clock.elapsedTime;
      core.current.position.y = Math.sin(t * 0.8) * 0.08;
      core.current.rotation.y += d * 0.6;
    }
    // recolor toward accent as progress rises
    const c = lerpColor(held, hot, progress);
    for (const ref of [r1, r2, r3]) {
      const m = ref.current?.material as THREE.MeshStandardMaterial | undefined;
      if (m) {
        m.color.copy(c);
        m.emissive.copy(hot);
        m.emissiveIntensity = progress * 0.5;
      }
    }
    const cm = core.current?.material as THREE.MeshStandardMaterial | undefined;
    if (cm) {
      cm.color.copy(lerpColor(new THREE.Color(colors.text), hot, progress));
      cm.emissive.copy(hot);
      cm.emissiveIntensity = 0.2 + progress * 0.8;
    }
  });

  return (
    <group rotation={[0.5, 0.2, 0]}>
      {/* ring 1 — upright */}
      <mesh ref={r1}>
        <torusGeometry args={[1.9, 0.012, 16, 160]} />
        <meshStandardMaterial roughness={0.35} metalness={0.3} />
      </mesh>
      {/* ring 2 — tilted */}
      <mesh ref={r2} rotation={[Math.PI / 2.4, 0, 0]}>
        <torusGeometry args={[1.55, 0.01, 16, 160]} />
        <meshStandardMaterial roughness={0.35} metalness={0.3} />
      </mesh>
      {/* ring 3 — cross axis */}
      <mesh ref={r3} rotation={[0, Math.PI / 2.6, Math.PI / 6]}>
        <torusGeometry args={[2.2, 0.008, 16, 180]} />
        <meshStandardMaterial roughness={0.35} metalness={0.3} />
      </mesh>
      {/* floating core */}
      <mesh ref={core}>
        <icosahedronGeometry args={[0.28, 0]} />
        <meshStandardMaterial roughness={0.25} metalness={0.4} flatShading />
      </mesh>
    </group>
  );
}

function useThemeColors(): Colors {
  const [c, setC] = useState<Colors>({
    gold: "#c9402b",
    cool: "#b9b3a4",
    text: "#33302b",
  });
  useEffect(() => {
    const s = getComputedStyle(document.documentElement);
    const read = (n: string, fb: string) => s.getPropertyValue(n).trim() || fb;
    setC({
      gold: read("--color-gold", "#c9402b"),
      cool: read("--color-cool", "#b9b3a4"),
      text: read("--color-text", "#33302b"),
    });
  }, []);
  return c;
}

export function HeroDial3D({
  fraction,
  released,
}: {
  fraction: number;
  released: boolean;
}) {
  const colors = useThemeColors();
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  // held (fraction≈1) → 0 progress; as the window depletes, warm up; released → 1
  const progress = released ? 1 : Math.min(1, (1 - fraction) * 0.7);

  return (
    <Canvas
      dpr={[1, 2]}
      camera={{ position: [0, 0, 6], fov: 42 }}
      style={{ width: "100%", height: "100%" }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 4, 5]} intensity={1.5} />
      <directionalLight position={[-4, -3, 2]} intensity={0.35} />
      <Gyroscope progress={progress} colors={colors} reduced={reduced} />
    </Canvas>
  );
}
