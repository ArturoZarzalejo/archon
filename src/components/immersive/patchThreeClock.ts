/**
 * Suppress THREE.Clock deprecation warning from @react-three/fiber.
 *
 * Three.js r183+ deprecated THREE.Clock in favor of THREE.Timer.
 * R3F 9.5.0 still uses Clock internally. This filters out the
 * specific deprecation message from console.warn.
 *
 * Import this BEFORE any @react-three/* imports.
 */

if (typeof window !== 'undefined') {
    const _origWarn = console.warn;
    console.warn = (...args: unknown[]) => {
        const msg = typeof args[0] === 'string' ? args[0] : '';
        if (msg.includes('THREE.Clock') || (msg.includes('THREE.') && msg.includes('deprecated') && msg.includes('Timer'))) {
            return; // Suppress THREE.Clock deprecation
        }
        _origWarn.apply(console, args);
    };
}
