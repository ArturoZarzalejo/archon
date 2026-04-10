export function AuroraBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" style={{ background: '#06060a' }}>
      {/* Violet orb */}
      <div
        className="aurora-orb-1 absolute -top-1/4 -left-1/4 h-[600px] w-[600px] rounded-full opacity-30 blur-[120px] mix-blend-screen"
        style={{ background: 'conic-gradient(from 0deg, #7c3aed, #4f46e5, #6366f1, #7c3aed)' }}
      />
      {/* Teal orb */}
      <div
        className="aurora-orb-2 absolute top-1/3 -right-1/4 h-[500px] w-[500px] rounded-full opacity-25 blur-[100px] mix-blend-screen"
        style={{ background: 'conic-gradient(from 120deg, #06b6d4, #14b8a6, #0ea5e9, #06b6d4)' }}
      />
      {/* Rose/amber orb */}
      <div
        className="aurora-orb-3 absolute -bottom-1/4 left-1/3 h-[550px] w-[550px] rounded-full opacity-20 blur-[110px] mix-blend-screen"
        style={{ background: 'conic-gradient(from 240deg, #f43f5e, #f59e0b, #ec4899, #f43f5e)' }}
      />
      {/* Vignette */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 0%, #06060a 70%)' }}
      />
    </div>
  );
}
