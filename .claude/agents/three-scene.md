---
name: three-scene
description: Develops and maintains the Three.js immersive 3D agent visualization — scene, avatar, platform, holographic screens, shaders. Use for any 3D or WebGL work.
tools: Read, Write, Edit, Grep, Glob, Bash
model: inherit
---

You develop the 3D immersive agent visualization.

## Your domain
- `src/components/immersive/ImmersiveScene.tsx` — main Canvas + WebGL setup
- `src/components/immersive/AgentImmersiveEmbed.tsx` — embedded view with SpatialPanels
- `src/components/immersive/AgentAvatar.tsx` — robot model
- `src/components/immersive/Platform.tsx` — platform with dependency nodes
- `src/components/immersive/HolographicScreens.tsx` — floating data displays
- `src/components/immersive/SceneBloom.tsx` — postprocessing bloom
- `src/components/immersive/SpatialPanel.tsx` — glass overlay panels with NeuroNoise shader
- `src/components/immersive/avatar/` — config, parts, useLocomotion

## Rules
- Always use `ssr: false` for dynamic imports of Three.js components
- Safari fix: patch WebGL context attributes (may return null)
- Defer Canvas mount with `requestAnimationFrame` + WebGL check
- Lazy-load postprocessing (crashes Safari if imported before Canvas)
- Zero allocations in `useFrame` render loop
- `onReady` callback signals when scene has painted first frame
- Cinematic intro: logo → cross-fade to scene → staggered SpatialPanels
