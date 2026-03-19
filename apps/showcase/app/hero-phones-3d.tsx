"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type ScreenKind = "programs" | "home" | "messages";

export function HeroPhones3D() {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0.2, 8.3], fov: 31 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <color attach="background" args={["#000000"]} />
        <fog attach="fog" args={["#07110c", 7.5, 19]} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 6, 6]} intensity={2.4} color="#f0fdf4" />
        <directionalLight position={[-5, 2, 3]} intensity={1.4} color="#86efac" />
        <pointLight position={[0, -1, 4]} intensity={1.4} color="#22c55e" />
        <pointLight position={[0, 3.5, 3]} intensity={0.8} color="#dcfce7" />
        <HeroRig />
      </Canvas>
    </div>
  );
}

function HeroRig() {
  const rigRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (!rigRef.current) return;
    rigRef.current.rotation.y = Math.sin(t * 0.25) * 0.12;
    rigRef.current.position.y = Math.sin(t * 0.4) * 0.08;
  });

  return (
    <group ref={rigRef} position={[0, 0, 0]}>
      <Phone
        kind="programs"
        position={[-2.8, 0.22, -1.2]}
        rotation={[0.2, 0.68, -0.14]}
        scale={0.98}
      />
      <Phone
        kind="home"
        position={[0, 0.12, 1.5]}
        rotation={[0.06, 0, -0.01]}
        scale={1.16}
        featured
      />
      <Phone
        kind="messages"
        position={[2.8, 0.24, -1.2]}
        rotation={[0.2, -0.68, 0.14]}
        scale={0.98}
      />
      <mesh position={[0, -1.1, -3.1]} rotation={[0.24, 0, 0]}>
        <torusGeometry args={[3.5, 0.06, 24, 120]} />
        <meshBasicMaterial color="#22c55e" transparent opacity={0.22} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -3.25, 0]}>
        <circleGeometry args={[6.2, 64]} />
        <meshBasicMaterial color="#14532d" transparent opacity={0.12} />
      </mesh>
      <Particles />
    </group>
  );
}

function Phone({
  kind,
  position,
  rotation,
  scale,
  featured = false,
}: {
  kind: ScreenKind;
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  featured?: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const texture = useScreenTexture(kind);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (!groupRef.current) return;
    groupRef.current.position.y = position[1] + Math.sin(t * 0.8 + position[0]) * 0.08;
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <mesh position={[0, 0, -0.12]}>
        <boxGeometry args={[2.62, 5.24, 0.1]} />
        <meshStandardMaterial color="#020617" metalness={0.95} roughness={0.3} />
      </mesh>

      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.52, 5.12, 0.22]} />
        <meshStandardMaterial color="#0b1220" metalness={0.88} roughness={0.22} />
      </mesh>

      <mesh position={[0, 0, 0.105]}>
        <planeGeometry args={[2.36, 4.9]} />
        <meshStandardMaterial color="#050b14" metalness={0.2} roughness={0.08} transparent opacity={0.94} />
      </mesh>

      <mesh position={[0, 0, 0.118]}>
        <planeGeometry args={[2.24, 4.76]} />
        <meshStandardMaterial map={texture} emissive="#ffffff" emissiveIntensity={featured ? 0.28 : 0.18} />
      </mesh>

      <mesh position={[0.14, 0.1, 0.121]}>
        <planeGeometry args={[0.22, 4.2]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.045} />
      </mesh>

      <mesh position={[0, 2.22, 0.125]}>
        <planeGeometry args={[0.84, 0.16]} />
        <meshBasicMaterial color="#020617" />
      </mesh>

      <mesh position={[0, -2.88, -0.08]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.72, 32]} />
        <meshBasicMaterial color={featured ? "#22c55e" : "#0f172a"} transparent opacity={featured ? 0.18 : 0.12} />
      </mesh>

      <group position={[0.64, 2.06, 0.13]}>
        <mesh position={[0, 0, 0]}>
          <circleGeometry args={[0.12, 20]} />
          <meshBasicMaterial color="#111827" />
        </mesh>
        <mesh position={[-0.22, 0, 0]}>
          <circleGeometry args={[0.07, 20]} />
          <meshBasicMaterial color="#0f172a" />
        </mesh>
      </group>

      <mesh position={[1.3, 0.72, 0]}>
        <boxGeometry args={[0.04, 0.46, 0.06]} />
        <meshStandardMaterial color="#18212f" metalness={0.9} roughness={0.25} />
      </mesh>

      <mesh position={[-1.3, 0.4, 0]}>
        <boxGeometry args={[0.04, 0.72, 0.06]} />
        <meshStandardMaterial color="#18212f" metalness={0.9} roughness={0.25} />
      </mesh>
    </group>
  );
}

function Particles() {
  const pointsRef = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const array = new Float32Array(120 * 3);

    for (let i = 0; i < 120; i += 1) {
      array[i * 3] = (Math.random() - 0.5) * 11;
      array[i * 3 + 1] = (Math.random() - 0.5) * 8;
      array[i * 3 + 2] = (Math.random() - 0.5) * 6 - 1;
    }

    return array;
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;
    pointsRef.current.rotation.y = state.clock.getElapsedTime() * 0.03;
  });

  return (
    <points ref={pointsRef} position={[0, 0.1, -1.6]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.045} color="#dcfce7" transparent opacity={0.58} sizeAttenuation />
    </points>
  );
}

function useScreenTexture(kind: ScreenKind) {
  return useMemo(() => makeScreenTexture(kind), [kind]);
}

function makeScreenTexture(kind: ScreenKind) {
  const width = 768;
  const height = 1536;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    return new THREE.CanvasTexture(canvas);
  }

  const green = "#22c55e";
  const text = "#ecfdf5";
  const muted = "rgba(220,252,231,0.68)";
  const panel = "#0e1726";
  const panelSoft = "#132032";

  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, "#101b14");
  gradient.addColorStop(0.45, "#0d1721");
  gradient.addColorStop(1, "#091018");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "rgba(34,197,94,0.12)";
  ctx.beginPath();
  ctx.arc(width * 0.8, height * 0.18, 220, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width * 0.18, height * 0.78, 260, 0, Math.PI * 2);
  ctx.fill();

  roundRect(ctx, 52, 92, width - 104, 236, 34, `${green}33`);
  roundRect(ctx, 516, 116, 152, 54, 24, "rgba(220,252,231,0.16)");
  ctx.fillStyle = "rgba(236,253,245,0.78)";
  ctx.font = "700 28px Inter, sans-serif";
  ctx.fillText(kind === "home" ? "Your app" : kind === "programs" ? "Training options" : "Coach support", 78, 140);
  ctx.fillStyle = text;
  ctx.font = "700 52px Inter, sans-serif";
  ctx.fillText(kind === "home" ? "Welcome back" : kind === "programs" ? "Choose your plan" : "Coach chat", 78, 204);
  ctx.fillStyle = muted;
  ctx.font = "28px Inter, sans-serif";
  ctx.fillText(
    kind === "home"
      ? "Sessions, updates, and support in one place."
      : kind === "programs"
        ? "Pick the level of support that fits your family."
        : "Message your coach and get feedback fast.",
    78,
    252
  );

  if (kind === "home") {
    for (let i = 0; i < 3; i += 1) {
      roundRect(ctx, 58 + i * 216, 366, 190, 140, 28, i === 1 ? `${green}33` : "rgba(255,255,255,0.06)");
    }
    roundRect(ctx, 52, 548, width - 104, 186, 30, "rgba(255,255,255,0.06)");
    roundRect(ctx, 52, 766, width - 104, 186, 30, panelSoft);
    roundRect(ctx, 52, 984, width - 104, 186, 30, "rgba(255,255,255,0.05)");
    roundRect(ctx, 92, 570, 180, 40, 20, `${green}55`);
  }

  if (kind === "programs") {
    const cards = [
      { y: 366, title: "PHP Program", body: "Structured weekly coaching", active: false },
      { y: 592, title: "PHP Plus", body: "Recovery, nutrition, and family support", active: true },
      { y: 818, title: "PHP Premium", body: "Direct coach support and feedback", active: false },
    ];
    cards.forEach((card) => {
      roundRect(ctx, 52, card.y, width - 104, 178, 30, card.active ? `${green}33` : "rgba(255,255,255,0.06)");
      ctx.fillStyle = text;
      ctx.font = "700 34px Inter, sans-serif";
      ctx.fillText(card.title, 82, card.y + 68);
      ctx.fillStyle = muted;
      ctx.font = "26px Inter, sans-serif";
      ctx.fillText(card.body, 82, card.y + 112);
      if (card.active) {
        roundRect(ctx, 520, card.y + 34, 140, 48, 22, `${green}66`);
      }
    });
  }

  if (kind === "messages") {
    const bubbles = [
      { x: 52, y: 392, w: 430, h: 120, active: false },
      { x: 210, y: 548, w: 506, h: 138, active: true },
      { x: 52, y: 734, w: 462, h: 120, active: false },
      { x: 170, y: 892, w: 546, h: 132, active: true },
    ];
    bubbles.forEach((bubble) => {
      roundRect(ctx, bubble.x, bubble.y, bubble.w, bubble.h, 28, bubble.active ? `${green}33` : panel);
    });
    roundRect(ctx, 52, 1186, width - 104, 108, 28, "rgba(255,255,255,0.06)");
    roundRect(ctx, 480, 414, 150, 42, 21, `${green}55`);
  }

  roundRect(ctx, 44, 1362, width - 88, 108, 32, "rgba(255,255,255,0.05)");
  const tabs = ["Programs", "Messages", "Home", "Schedule", "More"];
  tabs.forEach((tab, index) => {
    const x = 58 + index * 138;
    roundRect(ctx, x, 1380, 122, 72, 36, tab.toLowerCase() === kind ? `${green}55` : "rgba(255,255,255,0.02)");
    ctx.fillStyle = tab.toLowerCase() === kind ? "#052e16" : muted;
    ctx.font = "700 20px Inter, sans-serif";
    ctx.fillText(tab, x + 18, 1426);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string
) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  ctx.fill();
}
