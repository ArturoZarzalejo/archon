'use client';

import { useRef, forwardRef, useImperativeHandle } from 'react';
import * as THREE from 'three';
import { DEFAULT_CONFIG, type AvatarConfig } from './avatar/config';
import { useLocomotion } from './avatar/useLocomotion';
import { Head, Torso, Arm, Leg } from './avatar/parts';

interface AgentAvatarProps {
    config?: AvatarConfig;
}

const AgentAvatar = forwardRef<THREE.Group, AgentAvatarProps>(
    function AgentAvatar({ config = DEFAULT_CONFIG }, ref) {
        const groupRef = useRef<THREE.Group>(null);
        const bodyRef = useRef<THREE.Group>(null);
        const torsoRef = useRef<THREE.Group>(null);
        const leftArmRef = useRef<THREE.Group>(null);
        const rightArmRef = useRef<THREE.Group>(null);
        const leftForearmRef = useRef<THREE.Group>(null);
        const rightForearmRef = useRef<THREE.Group>(null);
        const leftLegRef = useRef<THREE.Group>(null);
        const rightLegRef = useRef<THREE.Group>(null);
        const leftLowerLegRef = useRef<THREE.Group>(null);
        const rightLowerLegRef = useRef<THREE.Group>(null);
        const leftFootRef = useRef<THREE.Group>(null);
        const rightFootRef = useRef<THREE.Group>(null);
        const headRef = useRef<THREE.Group>(null);

        useImperativeHandle(ref, () => groupRef.current!);

        useLocomotion(
            {
                group: groupRef,
                body: bodyRef,
                torso: torsoRef,
                head: headRef,
                leftArm: leftArmRef,
                rightArm: rightArmRef,
                leftForearm: leftForearmRef,
                rightForearm: rightForearmRef,
                leftLeg: leftLegRef,
                rightLeg: rightLegRef,
                leftLowerLeg: leftLowerLegRef,
                rightLowerLeg: rightLowerLegRef,
                leftFoot: leftFootRef,
                rightFoot: rightFootRef,
            },
            config.physics,
        );

        const { colors } = config;
        const { baseY } = config.physics;

        return (
            <group ref={groupRef} position={[0, baseY, 0]}>
                <group ref={bodyRef}>
                    <Head colors={colors} groupRef={headRef} />
                    <Torso colors={colors} groupRef={torsoRef} />
                    <Arm colors={colors} side={1} groupRef={rightArmRef} forearmRef={rightForearmRef} />
                    <Arm colors={colors} side={-1} groupRef={leftArmRef} forearmRef={leftForearmRef} />
                    <Leg colors={colors} side={1} groupRef={rightLegRef} lowerLegRef={rightLowerLegRef} footRef={rightFootRef} />
                    <Leg colors={colors} side={-1} groupRef={leftLegRef} lowerLegRef={leftLowerLegRef} footRef={leftFootRef} />
                </group>
            </group>
        );
    },
);

export default AgentAvatar;
