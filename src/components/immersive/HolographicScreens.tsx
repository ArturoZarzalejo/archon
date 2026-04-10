'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface HolographicScreensProps {
  accentColor: string;
  agentName: string;
  model?: string;
  healthScore?: number; // 0-100
  tokenCount?: number;
  dependencyCount?: number;
}

/* ------------------------------------------------------------------ */
/*  Canvas-texture factory                                            */
/* ------------------------------------------------------------------ */

function createScreenTexture(
  drawFn: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  accentColor: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 320;
  const ctx = canvas.getContext('2d')!;

  // Dark semi-transparent background
  ctx.fillStyle = 'rgba(10, 10, 30, 0.8)';
  ctx.fillRect(0, 0, 512, 320);

  // Accent color border
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, 504, 312);

  // Call custom draw function
  drawFn(ctx, 512, 320);

  return new THREE.CanvasTexture(canvas);
}

/* ------------------------------------------------------------------ */
/*  Draw helpers (one per screen)                                     */
/* ------------------------------------------------------------------ */

function drawIdentityScreen(
  ctx: CanvasRenderingContext2D,
  _w: number,
  _h: number,
  accent: string,
  agentName: string,
  model?: string,
) {
  // Agent name — large
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px monospace';
  ctx.fillText(agentName, 30, 80);

  // Divider line
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, 100);
  ctx.lineTo(482, 100);
  ctx.stroke();

  // Model label
  ctx.fillStyle = accent;
  ctx.font = '14px monospace';
  ctx.fillText('MODEL', 30, 135);

  ctx.fillStyle = '#ccccdd';
  ctx.font = '20px monospace';
  ctx.fillText(model ?? 'unknown', 30, 165);

  // Provider label
  ctx.fillStyle = accent;
  ctx.font = '14px monospace';
  ctx.fillText('STATUS', 30, 210);

  ctx.fillStyle = '#44ee88';
  ctx.font = '20px monospace';
  ctx.fillText('ACTIVE', 30, 240);

  // Decorative scanline
  ctx.fillStyle = `${accent}18`;
  for (let y = 0; y < 320; y += 4) {
    ctx.fillRect(0, y, 512, 1);
  }
}

function drawHealthScreen(
  ctx: CanvasRenderingContext2D,
  w: number,
  _h: number,
  accent: string,
  healthScore?: number,
) {
  const score = healthScore ?? 0;

  // "HEALTH" label
  ctx.fillStyle = accent;
  ctx.font = '14px monospace';
  ctx.fillText('HEALTH', 30, 50);

  // Big score number
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 80px monospace';
  const scoreText = score > 0 ? String(score) : '--';
  const metrics = ctx.measureText(scoreText);
  ctx.fillText(scoreText, (w - metrics.width) / 2, 160);

  // Percent sign
  if (score > 0) {
    ctx.fillStyle = accent;
    ctx.font = 'bold 32px monospace';
    ctx.fillText('%', (w + metrics.width) / 2 + 6, 160);
  }

  // Health bar background
  const barX = 40;
  const barY = 210;
  const barW = w - 80;
  const barH = 20;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(barX, barY, barW, barH);

  // Health bar fill
  const barColor = score >= 70 ? '#22cc66' : score >= 40 ? '#f59e0b' : '#ef4444';
  ctx.fillStyle = barColor;
  ctx.fillRect(barX, barY, barW * (score / 100), barH);

  // Bar border
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barW, barH);

  // Status text
  ctx.fillStyle = '#aaaacc';
  ctx.font = '14px monospace';
  const statusLabel = score >= 70 ? 'NOMINAL' : score >= 40 ? 'WARNING' : score > 0 ? 'CRITICAL' : 'NO DATA';
  ctx.fillText(statusLabel, barX, barY + 50);

  // Scanlines
  ctx.fillStyle = `${accent}18`;
  for (let y = 0; y < 320; y += 4) {
    ctx.fillRect(0, y, 512, 1);
  }
}

function drawStatsScreen(
  ctx: CanvasRenderingContext2D,
  _w: number,
  _h: number,
  accent: string,
  tokenCount?: number,
  dependencyCount?: number,
) {
  // Title
  ctx.fillStyle = accent;
  ctx.font = '14px monospace';
  ctx.fillText('METRICS', 30, 50);

  // Divider
  ctx.strokeStyle = accent;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, 62);
  ctx.lineTo(482, 62);
  ctx.stroke();

  // Token count
  ctx.fillStyle = '#8888aa';
  ctx.font = '13px monospace';
  ctx.fillText('AVG TOKENS IN', 30, 100);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(tokenCount != null ? tokenCount.toLocaleString() : '--', 30, 135);

  // Dependency count
  ctx.fillStyle = '#8888aa';
  ctx.font = '13px monospace';
  ctx.fillText('CONNECTIONS', 30, 185);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px monospace';
  ctx.fillText(dependencyCount != null ? String(dependencyCount) : '--', 30, 220);

  // Uptime
  ctx.fillStyle = '#8888aa';
  ctx.font = '13px monospace';
  ctx.fillText('UPTIME', 30, 265);

  ctx.fillStyle = '#44ee88';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('99.9%', 30, 295);

  // Scanlines
  ctx.fillStyle = `${accent}18`;
  for (let y = 0; y < 320; y += 4) {
    ctx.fillRect(0, y, 512, 1);
  }
}

/* ------------------------------------------------------------------ */
/*  Individual screen sub-component                                   */
/* ------------------------------------------------------------------ */

interface FloatingScreenProps {
  position: [number, number, number];
  rotation: [number, number, number];
  texture: THREE.CanvasTexture;
  accentColor: string;
  phaseOffset: number;
}

function FloatingScreen({ position, rotation, texture, accentColor, phaseOffset }: FloatingScreenProps) {
  const groupRef = useRef<THREE.Group>(null);
  const baseY = position[1];

  const accentColorObj = useMemo(() => new THREE.Color(accentColor), [accentColor]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.getElapsedTime();
    groupRef.current.position.y = baseY + Math.sin(t * 0.8 + phaseOffset) * 0.15;
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Screen surface */}
      <mesh>
        <planeGeometry args={[2.5, 1.5]} />
        <meshStandardMaterial
          map={texture}
          transparent
          opacity={0.2}
          emissive={accentColorObj}
          emissiveIntensity={0.15}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Border frame — four thin edges */}
      {/* Top edge */}
      <mesh position={[0, 0.75, 0.01]}>
        <boxGeometry args={[2.55, 0.02, 0.02]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColorObj}
          emissiveIntensity={0.8}
          transparent
          opacity={0.6}
        />
      </mesh>
      {/* Bottom edge */}
      <mesh position={[0, -0.75, 0.01]}>
        <boxGeometry args={[2.55, 0.02, 0.02]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColorObj}
          emissiveIntensity={0.8}
          transparent
          opacity={0.6}
        />
      </mesh>
      {/* Left edge */}
      <mesh position={[-1.25, 0, 0.01]}>
        <boxGeometry args={[0.02, 1.52, 0.02]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColorObj}
          emissiveIntensity={0.8}
          transparent
          opacity={0.6}
        />
      </mesh>
      {/* Right edge */}
      <mesh position={[1.25, 0, 0.01]}>
        <boxGeometry args={[0.02, 1.52, 0.02]} />
        <meshStandardMaterial
          color={accentColor}
          emissive={accentColorObj}
          emissiveIntensity={0.8}
          transparent
          opacity={0.6}
        />
      </mesh>

      {/* Point light for local glow */}
      <pointLight color={accentColor} intensity={0.4} distance={5} decay={2} position={[0, 0, 0.5]} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export default function HolographicScreens({
  accentColor,
  agentName,
  model,
  healthScore,
  tokenCount,
  dependencyCount,
}: HolographicScreensProps) {
  // Memoize textures — only recreate when data props change
  const identityTexture = useMemo(
    () => createScreenTexture((ctx, w, h) => drawIdentityScreen(ctx, w, h, accentColor, agentName, model), accentColor),
    [accentColor, agentName, model],
  );

  const healthTexture = useMemo(
    () => createScreenTexture((ctx, w, h) => drawHealthScreen(ctx, w, h, accentColor, healthScore), accentColor),
    [accentColor, healthScore],
  );

  const statsTexture = useMemo(
    () => createScreenTexture((ctx, w, h) => drawStatsScreen(ctx, w, h, accentColor, tokenCount, dependencyCount), accentColor),
    [accentColor, tokenCount, dependencyCount],
  );

  return (
    <group>
      {/* Screen 1 (left) — Identity */}
      <FloatingScreen
        position={[-4, 2.5, -2]}
        rotation={[0, Math.PI / 6, 0]}
        texture={identityTexture}
        accentColor={accentColor}
        phaseOffset={0}
      />

      {/* Screen 2 (center-back) — Health */}
      <FloatingScreen
        position={[0, 3, -4]}
        rotation={[0, 0, 0]}
        texture={healthTexture}
        accentColor={accentColor}
        phaseOffset={2.1}
      />

      {/* Screen 3 (right) — Stats */}
      <FloatingScreen
        position={[4, 2.5, -2]}
        rotation={[0, -Math.PI / 6, 0]}
        texture={statsTexture}
        accentColor={accentColor}
        phaseOffset={4.2}
      />
    </group>
  );
}
