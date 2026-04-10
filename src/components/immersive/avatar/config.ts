export interface AvatarColors {
    body: string;
    joint: string;
    visor: string;
    core: string;
    antennaTip: string;
}

export interface AvatarPhysics {
    /** Base max speed (units/sec) */
    speed: number;
    /** Sprint multiplier on top of base speed */
    sprintMultiplier: number;
    /** Walk animation cycles per second */
    walkSpeed: number;
    /** Acceleration force (units/sec^2) — how fast you reach top speed */
    acceleration: number;
    /** Deceleration force (units/sec^2) — how fast you stop */
    deceleration: number;
    /** Rotation speed (radians/sec) — how fast the character turns */
    rotSpeed: number;
    swingAmplitude: number;
    platformRadius: number;
    baseY: number;
    hipSwayAmount: number;
    torsoTwistFactor: number;
    toeOffFactor: number;
    bounceAmount: number;
    idleSwayAmount: number;
    idleBreathAmount: number;
    headLean: number;
    forwardLean: number;
    turnBankAmount: number;
    headTrackLerp: number;
    stopSettleDuration: number;
    stopSettleAmplitude: number;
    /** Base elbow bend at rest (radians) */
    elbowBaseBend: number;
    /** Extra elbow flex when arm swings forward */
    elbowFlexFactor: number;
    /** Knee flex when leg swings backward */
    kneeFlexFactor: number;
}

export interface AvatarConfig {
    colors: AvatarColors;
    physics: AvatarPhysics;
}

export const DEFAULT_CONFIG: AvatarConfig = {
    colors: {
        body: '#1a1a2e',
        joint: '#16213e',
        visor: '#00f5ff',
        core: '#4060ff',
        antennaTip: '#6366f1',
    },
    physics: {
        speed: 2.8,
        sprintMultiplier: 1.55,
        walkSpeed: 10.5,
        acceleration: 18,
        deceleration: 12,
        rotSpeed: 12,
        swingAmplitude: 0.42,
        platformRadius: 4.5,
        baseY: 0.15,
        hipSwayAmount: 0.028,
        torsoTwistFactor: -0.15,
        toeOffFactor: 0.45,
        bounceAmount: 0.045,
        idleSwayAmount: 0.018,
        idleBreathAmount: 0.014,
        headLean: -0.06,
        forwardLean: -0.04,
        turnBankAmount: 0.02,
        headTrackLerp: 0.03,
        stopSettleDuration: 0.25,
        stopSettleAmplitude: 0.025,
        elbowBaseBend: 0.15,
        elbowFlexFactor: 0.6,
        kneeFlexFactor: 0.5,
    },
};
