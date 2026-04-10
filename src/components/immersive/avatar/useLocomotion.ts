'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import type { AvatarPhysics } from './config';

// Reusable temp objects — zero allocations per frame
const _inputDir = new THREE.Vector3();
const _diff = new THREE.Vector3();
const _targetVel = new THREE.Vector3();
const _targetQuat = new THREE.Quaternion();
const _cameraFwd = new THREE.Vector3();
const _cameraRt = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);

export interface LocomotionRefs {
    group: React.RefObject<THREE.Group | null>;
    body: React.RefObject<THREE.Group | null>;
    torso: React.RefObject<THREE.Group | null>;
    head: React.RefObject<THREE.Group | null>;
    leftArm: React.RefObject<THREE.Group | null>;
    rightArm: React.RefObject<THREE.Group | null>;
    leftLeg: React.RefObject<THREE.Group | null>;
    rightLeg: React.RefObject<THREE.Group | null>;
    leftForearm: React.RefObject<THREE.Group | null>;
    rightForearm: React.RefObject<THREE.Group | null>;
    leftLowerLeg: React.RefObject<THREE.Group | null>;
    rightLowerLeg: React.RefObject<THREE.Group | null>;
    leftFoot: React.RefObject<THREE.Group | null>;
    rightFoot: React.RefObject<THREE.Group | null>;
}

export function useLocomotion(
    refs: LocomotionRefs,
    physics: AvatarPhysics,
) {
    const velocity = useRef(new THREE.Vector3(0, 0, 0));
    const walkPhase = useRef(0);
    const prevYaw = useRef(0);
    const yawVelocity = useRef(0);
    const headYaw = useRef(0);
    const wasMoving = useRef(false);
    const settleTimer = useRef(0);
    const idleLookTarget = useRef(0);
    const idleLookTimer = useRef(3 + Math.random() * 4);
    const smoothIntensity = useRef(0);

    const [, getKeys] = useKeyboardControls();

    useFrame(({ camera }, delta) => {
        const root = refs.group.current;
        if (!root) return;

        // Skip movement while typing in an input (e.g. drei <Html> forms)
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;

        // Clamp delta to avoid physics explosions on tab-switch
        const dt = Math.min(delta, 0.05);

        const { forward, backward, left, right, sprint } = getKeys() as {
            forward: boolean;
            backward: boolean;
            left: boolean;
            right: boolean;
            sprint: boolean;
        };

        // ── Camera-relative axes ──
        camera.getWorldDirection(_cameraFwd);
        _cameraFwd.y = 0;
        _cameraFwd.normalize();
        _cameraRt.setFromMatrixColumn(camera.matrixWorld, 0);
        _cameraRt.y = 0;
        _cameraRt.normalize();

        // ── Input direction (WASD only — no nav-target system) ──
        _inputDir.set(0, 0, 0);
        if (forward) _inputDir.add(_cameraFwd);
        if (backward) _inputDir.sub(_cameraFwd);
        if (right) _inputDir.add(_cameraRt);
        if (left) _inputDir.sub(_cameraRt);
        const hasInput = _inputDir.lengthSq() > 0;

        // ── Max speed (walk vs sprint) ──
        const maxSpeed = sprint && hasInput
            ? physics.speed * physics.sprintMultiplier
            : physics.speed;

        // ── Acceleration-based velocity (not lerp!) ──
        if (hasInput) {
            _inputDir.normalize();
            _targetVel.copy(_inputDir).multiplyScalar(maxSpeed);

            // MoveTowards: immediate response, natural ramp
            _diff.subVectors(_targetVel, velocity.current);
            const diffLen = _diff.length();
            const step = physics.acceleration * dt;
            if (diffLen <= step) {
                velocity.current.copy(_targetVel);
            } else {
                _diff.multiplyScalar(step / diffLen);
                velocity.current.add(_diff);
            }

            // ── Rotation: direct angular speed (not slerp) ──
            const targetAngle = Math.atan2(_inputDir.x, _inputDir.z);
            _targetQuat.setFromAxisAngle(_yAxis, targetAngle);
            const rotStep = Math.min(physics.rotSpeed * dt, 1);
            root.quaternion.slerp(_targetQuat, rotStep);

        } else {
            // ── Friction deceleration: linear, not asymptotic ──
            const speed = velocity.current.length();
            if (speed > 0.01) {
                const decel = physics.deceleration * dt;
                const newSpeed = Math.max(0, speed - decel);
                velocity.current.multiplyScalar(newSpeed / speed);
            } else {
                velocity.current.set(0, 0, 0);
            }
        }

        // ── Apply velocity ──
        root.position.x += velocity.current.x * dt;
        root.position.z += velocity.current.z * dt;

        // ── Platform boundary (soft edge + hard clamp) ──
        const dist = Math.sqrt(root.position.x ** 2 + root.position.z ** 2);
        const edgeZone = physics.platformRadius * 0.88;
        if (dist > edgeZone) {
            const overFactor = (dist - edgeZone) / (physics.platformRadius - edgeZone);
            const damping = 1 - Math.min(overFactor * 0.5, 0.9);
            velocity.current.multiplyScalar(damping);
        }
        if (dist > physics.platformRadius) {
            const s = physics.platformRadius / dist;
            root.position.x *= s;
            root.position.z *= s;
            velocity.current.multiplyScalar(0.2);
        }

        // ── Walk cycle — continues during deceleration for natural stride ──
        const speed = velocity.current.length();
        if (speed > 0.05) {
            const speedRatio = speed / physics.speed;
            walkPhase.current += dt * physics.walkSpeed * Math.max(speedRatio, 0.4);
        }

        // ── Intensity & animation ──
        const rawIntensity = Math.min(speed / physics.speed, 1.5); // can exceed 1 when sprinting
        smoothIntensity.current = THREE.MathUtils.lerp(
            smoothIntensity.current,
            rawIntensity,
            hasInput ? 0.15 : 0.08,
        );
        const intensity = smoothIntensity.current;
        const clampedIntensity = Math.min(intensity, 1); // for animations that shouldn't exceed 1
        const swing = Math.sin(walkPhase.current) * physics.swingAmplitude * clampedIntensity;

        // Sprint makes strides wider
        const sprintSwingBoost = intensity > 1 ? 1 + (intensity - 1) * 0.4 : 1;

        // ── Yaw velocity (for banking) ──
        const yaw = Math.atan2(
            2 * (root.quaternion.w * root.quaternion.y),
            1 - 2 * (root.quaternion.y * root.quaternion.y),
        );
        let yawDelta = yaw - prevYaw.current;
        if (yawDelta > Math.PI) yawDelta -= Math.PI * 2;
        if (yawDelta < -Math.PI) yawDelta += Math.PI * 2;
        yawVelocity.current = THREE.MathUtils.lerp(
            yawVelocity.current,
            dt > 0 ? yawDelta / dt : 0,
            0.08,
        );
        prevYaw.current = yaw;

        // ── Stop-settle ──
        const isMoving = intensity > 0.08;
        if (wasMoving.current && !isMoving) {
            settleTimer.current = physics.stopSettleDuration;
        }
        wasMoving.current = isMoving;

        // ── Limbs (shoulder & hip swing) ──
        const boostedSwing = swing * sprintSwingBoost;
        if (refs.leftArm.current) refs.leftArm.current.rotation.x = boostedSwing;
        if (refs.rightArm.current) refs.rightArm.current.rotation.x = -boostedSwing;
        if (refs.leftLeg.current) refs.leftLeg.current.rotation.x = -boostedSwing;
        if (refs.rightLeg.current) refs.rightLeg.current.rotation.x = boostedSwing;

        // ── Elbows (flex on forward swing, maintain bend on back swing) ──
        const leftArmSwing = boostedSwing;
        const rightArmSwing = -boostedSwing;
        if (refs.leftForearm.current) {
            const flex = physics.elbowBaseBend
                + Math.max(0, leftArmSwing) * physics.elbowFlexFactor
                + Math.max(0, -leftArmSwing) * physics.elbowFlexFactor * 0.25;
            refs.leftForearm.current.rotation.x = THREE.MathUtils.lerp(
                refs.leftForearm.current.rotation.x, -flex, 0.15,
            );
        }
        if (refs.rightForearm.current) {
            const flex = physics.elbowBaseBend
                + Math.max(0, rightArmSwing) * physics.elbowFlexFactor
                + Math.max(0, -rightArmSwing) * physics.elbowFlexFactor * 0.25;
            refs.rightForearm.current.rotation.x = THREE.MathUtils.lerp(
                refs.rightForearm.current.rotation.x, -flex, 0.15,
            );
        }

        // ── Knees (flex when leg swings backward, slight flex forward) ──
        const leftLegSwing = -boostedSwing;
        const rightLegSwing = boostedSwing;
        if (refs.leftLowerLeg.current) {
            const flex = Math.max(0, -leftLegSwing) * physics.kneeFlexFactor
                + Math.max(0, leftLegSwing) * physics.kneeFlexFactor * 0.3;
            refs.leftLowerLeg.current.rotation.x = THREE.MathUtils.lerp(
                refs.leftLowerLeg.current.rotation.x, flex, 0.15,
            );
        }
        if (refs.rightLowerLeg.current) {
            const flex = Math.max(0, -rightLegSwing) * physics.kneeFlexFactor
                + Math.max(0, rightLegSwing) * physics.kneeFlexFactor * 0.3;
            refs.rightLowerLeg.current.rotation.x = THREE.MathUtils.lerp(
                refs.rightLowerLeg.current.rotation.x, flex, 0.15,
            );
        }

        // ── Feet (compensate leg chain ~65% to stay mostly level + toe-off) ──
        const leftToeOff = Math.max(0, boostedSwing) * physics.toeOffFactor;
        const rightToeOff = Math.max(0, -boostedSwing) * physics.toeOffFactor;
        if (refs.leftFoot.current) {
            const legRot = refs.leftLeg.current?.rotation.x ?? 0;
            const kneeRot = refs.leftLowerLeg.current?.rotation.x ?? 0;
            refs.leftFoot.current.rotation.x = -(legRot + kneeRot) * 0.65 + leftToeOff;
        }
        if (refs.rightFoot.current) {
            const legRot = refs.rightLeg.current?.rotation.x ?? 0;
            const kneeRot = refs.rightLowerLeg.current?.rotation.x ?? 0;
            refs.rightFoot.current.rotation.x = -(legRot + kneeRot) * 0.65 + rightToeOff;
        }

        // ── Body dynamics ──
        if (refs.body.current) {
            const targetSway = clampedIntensity > 0.01
                ? Math.sin(walkPhase.current) * physics.hipSwayAmount * clampedIntensity
                : 0;

            // Forward lean — increases when sprinting
            let targetLeanX = clampedIntensity * physics.forwardLean;
            if (intensity > 1) {
                targetLeanX *= 1 + (intensity - 1) * 0.6; // extra lean when sprinting
            }

            const bankTarget = -yawVelocity.current * physics.turnBankAmount * clampedIntensity;

            // Stop-settle
            if (settleTimer.current > 0) {
                settleTimer.current -= dt;
                const t = 1 - settleTimer.current / physics.stopSettleDuration;
                const settle = Math.sin(t * Math.PI * 2) * (1 - t) * physics.stopSettleAmplitude;
                targetLeanX += settle;
            }

            refs.body.current.rotation.z = THREE.MathUtils.lerp(
                refs.body.current.rotation.z,
                targetSway + bankTarget,
                0.1,
            );
            refs.body.current.rotation.x = THREE.MathUtils.lerp(
                refs.body.current.rotation.x,
                targetLeanX,
                0.08,
            );
        }

        // ── Torso twist ──
        if (refs.torso.current) {
            const targetTwist = swing * physics.torsoTwistFactor * sprintSwingBoost;
            refs.torso.current.rotation.y = THREE.MathUtils.lerp(
                refs.torso.current.rotation.y,
                targetTwist,
                0.1,
            );
        }

        // ── Head ──
        if (refs.head.current) {
            const lean = clampedIntensity > 0.1 ? physics.headLean : 0;
            refs.head.current.rotation.x = THREE.MathUtils.lerp(
                refs.head.current.rotation.x,
                lean,
                0.1,
            );

            if (isMoving) {
                const moveAngle = Math.atan2(velocity.current.x, velocity.current.z);
                const headTarget = (moveAngle - yaw) * 0.12;
                headYaw.current = THREE.MathUtils.lerp(
                    headYaw.current,
                    headTarget,
                    physics.headTrackLerp,
                );
            } else {
                idleLookTimer.current -= dt;
                if (idleLookTimer.current <= 0) {
                    idleLookTarget.current = (Math.random() - 0.5) * 0.5;
                    idleLookTimer.current = 2.5 + Math.random() * 4;
                }
                headYaw.current = THREE.MathUtils.lerp(
                    headYaw.current,
                    idleLookTarget.current,
                    0.02,
                );
            }
            refs.head.current.rotation.y = headYaw.current;
        }

        // ── Vertical: idle vs walk bounce ──
        if (intensity < 0.01) {
            const t = performance.now() / 1000;
            root.position.y = THREE.MathUtils.lerp(root.position.y, physics.baseY, 0.08);

            if (refs.body.current) {
                const idleSway = Math.sin(t * 0.7) * physics.idleSwayAmount;
                refs.body.current.rotation.z = THREE.MathUtils.lerp(
                    refs.body.current.rotation.z,
                    idleSway,
                    0.04,
                );
                refs.body.current.rotation.x = THREE.MathUtils.lerp(
                    refs.body.current.rotation.x,
                    0,
                    0.05,
                );
            }
            if (refs.torso.current) {
                const breath = 1 + Math.sin(t * 1.2) * physics.idleBreathAmount;
                refs.torso.current.scale.y = THREE.MathUtils.lerp(
                    refs.torso.current.scale.y,
                    breath,
                    0.05,
                );
            }

            // Weight shifting — slow alternating leg bend
            const weightPhase = Math.sin(t * 0.4) * 0.03;
            if (refs.leftLeg.current) {
                refs.leftLeg.current.rotation.x = THREE.MathUtils.lerp(
                    refs.leftLeg.current.rotation.x, weightPhase, 0.04,
                );
            }
            if (refs.rightLeg.current) {
                refs.rightLeg.current.rotation.x = THREE.MathUtils.lerp(
                    refs.rightLeg.current.rotation.x, -weightPhase, 0.04,
                );
            }

            // Idle arm relax — subtle sway
            if (refs.leftArm.current) {
                refs.leftArm.current.rotation.x = THREE.MathUtils.lerp(
                    refs.leftArm.current.rotation.x, Math.sin(t * 0.5 + 1) * 0.02, 0.04,
                );
            }
            if (refs.rightArm.current) {
                refs.rightArm.current.rotation.x = THREE.MathUtils.lerp(
                    refs.rightArm.current.rotation.x, Math.sin(t * 0.5) * 0.02, 0.04,
                );
            }

            // Head look range — wider + slight pitch nod
            if (refs.head.current) {
                refs.head.current.rotation.x = THREE.MathUtils.lerp(
                    refs.head.current.rotation.x, Math.sin(t * 0.3) * 0.03, 0.03,
                );
            }
        } else {
            const bouncePhase = Math.abs(Math.sin(walkPhase.current));
            const sprintBounceBoost = intensity > 1 ? 1 + (intensity - 1) * 0.5 : 1;
            const bodyBounce = bouncePhase * physics.bounceAmount * clampedIntensity * sprintBounceBoost;
            root.position.y = THREE.MathUtils.lerp(
                root.position.y,
                physics.baseY + bodyBounce,
                0.18,
            );
            if (refs.torso.current) {
                refs.torso.current.scale.y = THREE.MathUtils.lerp(
                    refs.torso.current.scale.y,
                    1,
                    0.12,
                );
            }
        }
    });
}
