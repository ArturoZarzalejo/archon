'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import type { AvatarColors } from './config';

export function PulsingMaterial({ color, intensity = 1, speed = 2, baseIntensity = 0.5 }: { color: string; intensity?: number; speed?: number; baseIntensity?: number }) {
    const ref = useRef<THREE.MeshStandardMaterial>(null);

    useFrame(() => {
        if (ref.current) {
            const t = performance.now() / 1000;
            const pulse = (Math.sin(t * speed) + 1) / 2;
            ref.current.emissiveIntensity = baseIntensity + pulse * intensity;
        }
    });

    return (
        <meshStandardMaterial
            ref={ref}
            color={color}
            emissive={color}
            emissiveIntensity={1}
            metalness={0.5}
            roughness={0.3}
        />
    );
}

export function Head({ colors, groupRef, visorSpeed, visorIntensity }: { colors: AvatarColors; groupRef?: React.RefObject<THREE.Group | null>; visorSpeed?: number; visorIntensity?: number }) {
    return (
        <group ref={groupRef} position={[0, 1.55, 0]}>
            <RoundedBox args={[0.4, 0.35, 0.35]} radius={0.06} smoothness={4}>
                <meshStandardMaterial color={colors.body} metalness={0.8} roughness={0.25} />
            </RoundedBox>
            <mesh position={[0, 0.02, 0.16]}>
                <boxGeometry args={[0.3, 0.1, 0.04]} />
                <PulsingMaterial color={colors.visor} intensity={visorIntensity ?? 0.8} speed={visorSpeed ?? 2} />
            </mesh>
            <mesh position={[0, 0.22, 0]}>
                <cylinderGeometry args={[0.015, 0.02, 0.12, 8]} />
                <meshStandardMaterial color={colors.joint} metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.32, 0]}>
                <sphereGeometry args={[0.03, 12, 12]} />
                <PulsingMaterial color={colors.antennaTip} intensity={0.6} />
            </mesh>
        </group>
    );
}

export function Torso({ colors, groupRef }: { colors: AvatarColors; groupRef?: React.RefObject<THREE.Group | null> }) {
    return (
        <group ref={groupRef} position={[0, 0.95, 0]}>
            <RoundedBox args={[0.6, 0.7, 0.3]} radius={0.06} smoothness={4}>
                <meshStandardMaterial color={colors.body} metalness={0.8} roughness={0.25} />
            </RoundedBox>
            <mesh position={[0, 0.05, 0.16]}>
                <sphereGeometry args={[0.06, 16, 16]} />
                <PulsingMaterial color={colors.core} intensity={1} />
            </mesh>
            <mesh position={[0, 0.2, 0.151]}>
                <boxGeometry args={[0.35, 0.015, 0.005]} />
                <meshStandardMaterial color={colors.joint} metalness={0.6} roughness={0.3} />
            </mesh>
            <mesh position={[0, -0.15, 0.151]}>
                <boxGeometry args={[0.35, 0.015, 0.005]} />
                <meshStandardMaterial color={colors.joint} metalness={0.6} roughness={0.3} />
            </mesh>
        </group>
    );
}

export function Arm({ colors, side, groupRef, forearmRef }: { colors: AvatarColors; side: 1 | -1; groupRef?: React.RefObject<THREE.Group | null>; forearmRef?: React.RefObject<THREE.Group | null> }) {
    const x = side * 0.4;
    return (
        <group ref={groupRef} position={[x, 1.15, 0]}>
            {/* Shoulder joint */}
            <mesh>
                <sphereGeometry args={[0.065, 12, 12]} />
                <meshStandardMaterial color={colors.joint} metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Upper arm */}
            <mesh position={[0, -0.18, 0]}>
                <cylinderGeometry args={[0.04, 0.045, 0.25, 8]} />
                <meshStandardMaterial color={colors.body} metalness={0.8} roughness={0.25} />
            </mesh>
            {/* Elbow pivot — forearm rotates from here */}
            <group ref={forearmRef} position={[0, -0.33, 0]}>
                <mesh>
                    <sphereGeometry args={[0.05, 12, 12]} />
                    <meshStandardMaterial color={colors.joint} metalness={0.6} roughness={0.3} />
                </mesh>
                <mesh position={[0, -0.17, 0]}>
                    <cylinderGeometry args={[0.035, 0.04, 0.25, 8]} />
                    <meshStandardMaterial color={colors.body} metalness={0.8} roughness={0.25} />
                </mesh>
                <mesh position={[0, -0.33, 0]}>
                    <sphereGeometry args={[0.045, 12, 12]} />
                    <meshStandardMaterial color={colors.joint} metalness={0.6} roughness={0.3} />
                </mesh>
            </group>
        </group>
    );
}

export function Leg({ colors, side, groupRef, lowerLegRef, footRef }: { colors: AvatarColors; side: 1 | -1; groupRef?: React.RefObject<THREE.Group | null>; lowerLegRef?: React.RefObject<THREE.Group | null>; footRef?: React.RefObject<THREE.Group | null> }) {
    const x = side * 0.15;
    return (
        <group ref={groupRef} position={[x, 0.5, 0]}>
            {/* Hip joint */}
            <mesh>
                <sphereGeometry args={[0.06, 12, 12]} />
                <meshStandardMaterial color={colors.joint} metalness={0.6} roughness={0.3} />
            </mesh>
            {/* Upper leg */}
            <mesh position={[0, -0.17, 0]}>
                <cylinderGeometry args={[0.05, 0.055, 0.25, 8]} />
                <meshStandardMaterial color={colors.body} metalness={0.8} roughness={0.25} />
            </mesh>
            {/* Knee pivot — lower leg rotates from here */}
            <group ref={lowerLegRef} position={[0, -0.32, 0]}>
                <mesh>
                    <sphereGeometry args={[0.055, 12, 12]} />
                    <meshStandardMaterial color={colors.joint} metalness={0.6} roughness={0.3} />
                </mesh>
                <mesh position={[0, -0.16, 0]}>
                    <cylinderGeometry args={[0.04, 0.05, 0.22, 8]} />
                    <meshStandardMaterial color={colors.body} metalness={0.8} roughness={0.25} />
                </mesh>
                <group ref={footRef} position={[0, -0.30, 0.02]}>
                    <RoundedBox args={[0.1, 0.05, 0.14]} radius={0.015} smoothness={4}>
                        <meshStandardMaterial color={colors.body} metalness={0.8} roughness={0.25} />
                    </RoundedBox>
                </group>
            </group>
        </group>
    );
}
