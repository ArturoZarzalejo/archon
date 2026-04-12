'use client';

import { MeshGradient } from '@paper-design/shaders-react';

export function AuroraBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      <MeshGradient
        colors={['#0a0a1e', '#1a0533', '#0c1a3d', '#06060a']}
        speed={0.08}
        distortion={0.4}
        swirl={0.3}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />
      {/* Vignette overlay */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 0%, #06060a 75%)' }}
      />
    </div>
  );
}
