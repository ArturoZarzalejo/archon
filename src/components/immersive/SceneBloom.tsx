'use client';

import { useState, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

/**
 * Deferred Bloom — waits for the WebGL context to stabilise before mounting.
 * Uses a ref in useFrame (no setState in the render loop) and a polling
 * useEffect to bridge to React state.
 */
export default function SceneBloom() {
    const { gl } = useThree();
    const [ready, setReady] = useState(false);
    const readyRef = useRef(false);

    // Check context readiness inside the frame loop (no setState here)
    useFrame(() => {
        if (readyRef.current) return;
        try {
            const ctx = gl.getContext();
            if (ctx && ctx.getContextAttributes()) {
                readyRef.current = true;
            }
        } catch {
            // Context not ready yet — retry next frame
        }
    });

    // Bridge ref -> React state outside the render loop
    useEffect(() => {
        if (ready) return;
        const id = setInterval(() => {
            if (readyRef.current) setReady(true);
        }, 32);
        return () => clearInterval(id);
    }, [ready]);

    if (!ready) return null;

    return (
        <EffectComposer multisampling={0}>
            <Bloom
                mipmapBlur
                intensity={0.4}
                luminanceThreshold={0.9}
                luminanceSmoothing={0.4}
                radius={0.9}
                levels={5}
            />
        </EffectComposer>
    );
}
