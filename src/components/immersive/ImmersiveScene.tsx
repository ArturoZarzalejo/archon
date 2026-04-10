'use client';

// Suppress THREE.Clock deprecation — MUST be before any @react-three imports
import './patchThreeClock';

import { useRef, useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, KeyboardControls } from '@react-three/drei';
import { DEFAULT_CONFIG } from './avatar/config';
import AgentAvatar from './AgentAvatar';
import Platform from './Platform';
import HolographicScreens from './HolographicScreens';
import * as THREE from 'three';

/**
 * Lazy-load postprocessing so the `postprocessing` module doesn't execute
 * WebGL detection code at import time (crashes Safari before Canvas mounts).
 */
const SceneBloom = lazy(() => import('./SceneBloom'));

function buildConfig(accentColor?: string) {
    // Map accent hex to visor/core/antenna colors
    const visor = accentColor ?? '#007aff';
    const core = accentColor ? blendColor(accentColor, '#5856d6', 0.5) : '#5856d6';
    const antenna = accentColor ? blendColor(accentColor, '#af52de', 0.4) : '#af52de';

    return {
        ...DEFAULT_CONFIG,
        physics: {
            ...DEFAULT_CONFIG.physics,
            platformRadius: 11,
        },
        colors: {
            ...DEFAULT_CONFIG.colors,
            body: '#2a2a3e',
            joint: '#22223a',
            visor,
            core,
            antennaTip: antenna,
        },
    };
}

/** Simple hex color blend */
function blendColor(a: string, b: string, t: number): string {
    const parse = (hex: string) => [
        parseInt(hex.slice(1, 3), 16),
        parseInt(hex.slice(3, 5), 16),
        parseInt(hex.slice(5, 7), 16),
    ];
    const ca = parse(a), cb = parse(b);
    const mix = ca.map((v, i) => Math.round(v * (1 - t) + cb[i] * t));
    return `#${mix.map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

const keyMap = [
    { name: 'forward', keys: ['KeyW', 'ArrowUp'] },
    { name: 'backward', keys: ['KeyS', 'ArrowDown'] },
    { name: 'left', keys: ['KeyA', 'ArrowLeft'] },
    { name: 'right', keys: ['KeyD', 'ArrowRight'] },
    { name: 'sprint', keys: ['ShiftLeft', 'ShiftRight'] },
];

const _targetPos = new THREE.Vector3(0, 0.7, 0);
const ORBIT_TARGET: [number, number, number] = [0, 0.7, 0];

/* ------------------------------------------------------------------ */
/*  AgentAura — health-based glow around the robot                    */
/* ------------------------------------------------------------------ */

function healthToColor(healthScore: number | undefined, accentColor: string): string {
    if (healthScore === undefined) return accentColor;
    if (healthScore >= 80) return '#22c55e'; // green
    if (healthScore >= 50) return '#f59e0b'; // amber
    return '#ef4444';                        // red
}

function AgentAura({ healthScore, accentColor }: { healthScore?: number; accentColor: string }) {
    const ref = useRef<THREE.Mesh>(null);
    const auraColor = healthToColor(healthScore, accentColor);

    useFrame(() => {
        if (!ref.current) return;
        const mat = ref.current.material as THREE.MeshStandardMaterial;
        const t = performance.now() / 1000;
        mat.emissiveIntensity = 0.45 + 0.15 * Math.sin(t * 1.2);
    });

    return (
        <mesh ref={ref} position={[0, 1, 0]}>
            <sphereGeometry args={[1.2, 16, 16]} />
            <meshStandardMaterial
                color={auraColor}
                emissive={auraColor}
                emissiveIntensity={0.45}
                transparent
                opacity={0.09}
                side={THREE.BackSide}
                depthWrite={false}
            />
        </mesh>
    );
}

function CameraRig({ robotRef }: { robotRef: React.RefObject<THREE.Group | null> }) {
    useFrame((state) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const controls = (state as any).controls;
        if (!robotRef.current || !controls?.target?.lerp) return;

        const pos = robotRef.current.position;
        _targetPos.set(pos.x, 0.7, pos.z);
        controls.target.lerp(_targetPos, 0.09);
    });

    return null;
}

interface ImmersiveSceneProps {
    accentColor?: string;
    onReady?: () => void;
    agentName?: string;
    model?: string;
    healthScore?: number;
    tokenCount?: number;
    dependencyCount?: number;
    dependencies?: string[];
    feeds?: string[];
}

export default function ImmersiveScene({ accentColor, onReady, agentName, model, healthScore, tokenCount, dependencyCount, dependencies, feeds }: ImmersiveSceneProps = {}) {
    const robotRef = useRef<THREE.Group>(null);
    const [sceneKey, setSceneKey] = useState(0);
    const [glReady, setGlReady] = useState(false);

    // Defer Canvas mount — Safari crashes if R3F tries to create the WebGL
    // context synchronously before the DOM container is fully laid out.
    // Wait one animation frame, then verify WebGL is actually available.
    useEffect(() => {
        const raf = requestAnimationFrame(() => {
            try {
                const testCanvas = document.createElement('canvas');
                const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
                if (gl) {
                    const ext = gl.getExtension('WEBGL_lose_context');
                    if (ext) ext.loseContext();
                    setGlReady(true);
                }
            } catch {
                // WebGL not available — Canvas will not mount
            }
        });
        return () => cancelAnimationFrame(raf);
    }, []);

    // Safari fix: R3F and postprocessing both call
    //   renderer.getContext().getContextAttributes().alpha
    // without null-checking. Safari's getContextAttributes() can return
    // null when context is transitional (spec-compliant). Using gl as a
    // factory function lets us patch BEFORE R3F reads the attributes.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const createRenderer = useCallback((defaults: any) => {
        const renderer = new THREE.WebGLRenderer({
            canvas: defaults.canvas,
            alpha: true,
            antialias: true,
            powerPreference: 'high-performance',
        });

        const ctx = renderer.getContext();
        if (ctx) {
            const original = ctx.getContextAttributes.bind(ctx);
            ctx.getContextAttributes = () =>
                original() ?? {
                    alpha: true, antialias: true, depth: true, stencil: false,
                    premultipliedAlpha: true, preserveDrawingBuffer: false,
                    powerPreference: 'default', failIfMajorPerformanceCaveat: false,
                    desynchronized: false,
                };
        }

        return renderer;
    }, []);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const contextLostHandler = useRef<((e: Event) => void) | null>(null);

    const handleCreated = useCallback(({ gl }: { gl: THREE.WebGLRenderer }) => {
        const handler = (e: Event) => {
            e.preventDefault();
            setTimeout(() => setSceneKey((k) => k + 1), 300);
        };
        canvasRef.current = gl.domElement;
        contextLostHandler.current = handler;
        gl.domElement.addEventListener('webglcontextlost', handler);
        // Signal ready after first frame renders
        requestAnimationFrame(() => onReady?.());
    }, []);

    // Cleanup webglcontextlost listener when Canvas remounts (sceneKey change)
    useEffect(() => () => {
        if (canvasRef.current && contextLostHandler.current) {
            canvasRef.current.removeEventListener('webglcontextlost', contextLostHandler.current);
        }
    }, [sceneKey]);

    return (
        <KeyboardControls map={keyMap}>
            <div style={{ width: '100%', height: '100%', touchAction: 'none' }}>
                {!glReady ? null : <Canvas
                    key={sceneKey}
                    gl={createRenderer}
                    dpr={[1, 1.5]}
                    camera={{ position: [0, 3, 12], fov: 48 }}
                    style={{ background: 'transparent' }}
                    onCreated={handleCreated}
                >
                    <ambientLight color="#dde0f0" intensity={0.15} />
                    <directionalLight position={[5, 8, 5]} intensity={0.35} color="#ffffff" />

                    <fog attach="fog" args={['#0a0a1e', 30, 55]} />

                    <Environment preset="night" />

                    <AgentAvatar ref={robotRef} config={buildConfig(accentColor)} />
                    <AgentAura healthScore={healthScore} accentColor={accentColor ?? '#007aff'} />

                    <Platform glowColor={accentColor} dependencies={dependencies} feeds={feeds} />

                    {agentName && (
                        <HolographicScreens
                            accentColor={accentColor ?? '#007aff'}
                            agentName={agentName}
                            model={model}
                            healthScore={healthScore}
                            tokenCount={tokenCount}
                            dependencyCount={dependencyCount}
                        />
                    )}

                    <OrbitControls
                        makeDefault
                        enablePan={false}
                        minDistance={3}
                        maxDistance={22}
                        minPolarAngle={Math.PI / 6}
                        maxPolarAngle={Math.PI / 2.2}
                        target={ORBIT_TARGET}
                    />

                    <CameraRig robotRef={robotRef} />

                    {/* Bloom loaded lazily — postprocessing module crashes Safari
                        if imported before WebGL context exists */}
                    <Suspense fallback={null}>
                        <SceneBloom />
                    </Suspense>
                </Canvas>}
            </div>
        </KeyboardControls>
    );
}
