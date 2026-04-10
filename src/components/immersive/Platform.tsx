'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function GlowRing({ radius, color, speed }: { radius: number; color: string; speed: number }) {
    const ref = useRef<THREE.Mesh>(null);

    useFrame(() => {
        if (ref.current) {
            ref.current.rotation.z = (performance.now() / 1000) * speed;
        }
    });

    return (
        <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[radius - 0.03, radius, 64]} />
            <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={0.8}
                transparent
                opacity={0.7}
                side={THREE.DoubleSide}
            />
        </mesh>
    );
}

/** Semantic rings: MODEL (inner), PROMPT (mid), TOOLS (outer) */
function GridLines({ accentColor }: { accentColor: string }) {
    const layers: { radius: number; opacity: number }[] = [
        { radius: 3.0, opacity: 0.08 },   // MODEL layer
        { radius: 6.0, opacity: 0.06 },   // PROMPT layer
        { radius: 9.0, opacity: 0.04 },   // TOOLS layer
    ];

    return (
        <group position={[0, 0.005, 0]}>
            {layers.map((layer, i) => (
                <mesh key={i} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[layer.radius - 0.02, layer.radius, 64]} />
                    <meshBasicMaterial
                        color={accentColor}
                        transparent
                        opacity={layer.opacity}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            ))}
        </group>
    );
}

/* ------------------------------------------------------------------ */
/*  Dependency nodes — small glowing spheres on inner / outer rings   */
/* ------------------------------------------------------------------ */

function DependencyNodes({
    dependencies,
    feeds,
    accentColor,
}: {
    dependencies: string[];
    feeds: string[];
    accentColor: string;
}) {
    const groupRef = useRef<THREE.Group>(null);

    // Pre-compute positions
    const depPositions = useMemo(
        () =>
            dependencies.map((_, i) => {
                const angle = (2 * Math.PI * i) / dependencies.length;
                return [Math.cos(angle) * 4, 0.15, Math.sin(angle) * 4] as [number, number, number];
            }),
        [dependencies],
    );

    const feedPositions = useMemo(
        () =>
            feeds.map((_, i) => {
                const angle = (2 * Math.PI * i) / feeds.length;
                return [Math.cos(angle) * 8, 0.15, Math.sin(angle) * 8] as [number, number, number];
            }),
        [feeds],
    );

    // Pulse emissive intensity
    useFrame(() => {
        if (!groupRef.current) return;
        const t = performance.now() / 1000;
        groupRef.current.children.forEach((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mat = (child as THREE.Mesh).material as THREE.MeshStandardMaterial;
                if (mat.emissiveIntensity !== undefined) {
                    mat.emissiveIntensity = 0.75 + 0.25 * Math.sin(t * 2);
                }
            }
        });
    });

    // Build THREE.Line objects for center-to-node connections
    const lineObjects = useMemo(() => {
        const center = new THREE.Vector3(0, 0.1, 0);
        const mat = new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.12 });
        return [...depPositions, ...feedPositions].map((pos) => {
            const geo = new THREE.BufferGeometry().setFromPoints([
                center,
                new THREE.Vector3(...pos),
            ]);
            return new THREE.Line(geo, mat);
        });
    }, [depPositions, feedPositions]);

    if (dependencies.length === 0 && feeds.length === 0) return null;

    return (
        <group ref={groupRef}>
            {/* Dependency spheres — inner ring, white/60% */}
            {depPositions.map((pos, i) => (
                <mesh key={`dep-${i}`} position={pos}>
                    <sphereGeometry args={[0.15, 16, 16]} />
                    <meshStandardMaterial
                        color="#ffffff"
                        emissive="#ffffff"
                        emissiveIntensity={0.75}
                        transparent
                        opacity={0.6}
                    />
                </mesh>
            ))}

            {/* Feed spheres — outer ring, accent colored */}
            {feedPositions.map((pos, i) => (
                <mesh key={`feed-${i}`} position={pos}>
                    <sphereGeometry args={[0.15, 16, 16]} />
                    <meshStandardMaterial
                        color={accentColor}
                        emissive={accentColor}
                        emissiveIntensity={0.75}
                        transparent
                        opacity={0.8}
                    />
                </mesh>
            ))}

            {/* Lines from center to each node */}
            {lineObjects.map((obj, i) => (
                <primitive key={`line-${i}`} object={obj} />
            ))}
        </group>
    );
}

interface PlatformProps {
    glowColor?: string;
    dependencies?: string[];
    feeds?: string[];
}

export default function Platform({ glowColor, dependencies = [], feeds = [] }: PlatformProps = {}) {
    const outer = glowColor ?? '#4060ff';
    const inner = glowColor ? blendHex(glowColor, '#6366f1', 0.4) : '#6366f1';
    const accent = glowColor ?? '#4060ff';

    return (
        <group>
            {/* Main platform disc */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
                <circleGeometry args={[12, 64]} />
                <meshStandardMaterial
                    color="#0a0a14"
                    metalness={0.9}
                    roughness={0.15}
                />
            </mesh>

            {/* Outer glow ring — provider colored */}
            <GlowRing radius={11.8} color={outer} speed={0.15} />

            {/* Inner decorative ring */}
            <GlowRing radius={7.0} color={inner} speed={-0.1} />

            {/* Semantic grid rings (MODEL / PROMPT / TOOLS) */}
            <GridLines accentColor={accent} />

            {/* Dependency & feed nodes on the platform */}
            <DependencyNodes dependencies={dependencies} feeds={feeds} accentColor={accent} />
        </group>
    );
}

function blendHex(a: string, b: string, t: number): string {
    const p = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const ca = p(a), cb = p(b);
    return '#' + ca.map((v, i) => Math.round(v * (1 - t) + cb[i] * t).toString(16).padStart(2, '0')).join('');
}
