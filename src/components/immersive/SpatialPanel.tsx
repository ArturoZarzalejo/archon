'use client';

import { useState, useRef, useCallback } from 'react';
import { ChevronUp, ChevronDown, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { NeuroNoise } from '@paper-design/shaders-react';

const ENTER_ANIMATION: Record<string, string> = {
    bottom: 'spatial-enter-bottom',
    right: 'spatial-enter-right',
    left: 'spatial-enter-left',
    scale: 'spatial-enter-scale',
};

const EXIT_ANIMATION: Record<string, string> = {
    bottom: 'spatial-exit-bottom',
    right: 'spatial-exit-right',
    left: 'spatial-exit-left',
    scale: 'spatial-exit-scale',
};

export interface SpatialPanelProps {
    panelId: string;
    title: string;
    icon?: ReactNode;
    accent?: string;
    collapsible?: boolean;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
    closable?: boolean;
    onClose?: () => void;
    headerActions?: ReactNode;
    children: ReactNode;
    enterFrom?: 'bottom' | 'right' | 'left' | 'scale';
    exitTo?: 'bottom' | 'right' | 'left' | 'scale';
    staggerIndex?: number;
    exiting?: boolean;
    onExitComplete?: () => void;
    focused?: boolean;
    width?: string;
    height?: string;
    onPointerDown?: () => void;
    layer?: number;
}

export default function SpatialPanel({
    panelId,
    title,
    icon,
    accent = '#6366f1',
    collapsible = false,
    collapsed = false,
    onToggleCollapse,
    closable = false,
    onClose,
    headerActions,
    children,
    enterFrom = 'scale',
    exitTo = 'scale',
    staggerIndex = 0,
    exiting = false,
    onExitComplete,
    focused,
    width,
    height,
    onPointerDown,
    layer = 10,
}: SpatialPanelProps) {
    const [mounted, setMounted] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    const handleAnimationEnd = useCallback(() => {
        if (exiting) {
            onExitComplete?.();
        } else if (!mounted) {
            setMounted(true);
        }
    }, [exiting, onExitComplete, mounted]);

    const enterAnim = ENTER_ANIMATION[enterFrom] ?? ENTER_ANIMATION.scale;
    const exitAnim = EXIT_ANIMATION[exitTo] ?? EXIT_ANIMATION.scale;

    // Base delay (400ms) waits for the 3D scene to fade in, then stagger each panel
    const staggerDelay = 400 + staggerIndex * 80;

    const resolvedOpacity = exiting
        ? undefined
        : !mounted
            ? 0
            : focused === undefined
                ? 1
                : focused
                    ? 1
                    : 0.88;

    const resolvedTransform = !mounted
        ? undefined
        : focused === undefined
            ? undefined
            : focused
                ? 'scale(1.01)'
                : 'scale(0.99)';

    const resolvedBoxShadow = focused
        ? `0 0 40px ${accent}22, 0 0 80px ${accent}0a`
        : 'none';

    const animation = exiting
        ? `${exitAnim} 0.25s cubic-bezier(0.2, 0, 0, 1) forwards`
        : mounted
            ? 'none'
            : `${enterAnim} 0.3s cubic-bezier(0.2, 0, 0, 1) ${staggerDelay}ms both`;

    return (
        <div
            ref={ref}
            data-panel-id={panelId}
            className="glass-highlight rounded-2xl overflow-hidden relative"
            style={{
                '--spatial-accent': accent,
                background: 'linear-gradient(135deg, rgba(10, 10, 30, 0.88), rgba(10, 10, 30, 0.80))',
                backdropFilter: 'blur(32px) saturate(1.5)',
                WebkitBackdropFilter: 'blur(32px) saturate(1.5)',
                border: `1px solid ${accent}33`,
                boxShadow: `${resolvedBoxShadow}, inset 0 1px 0 rgba(255,255,255,0.06)`,
                opacity: resolvedOpacity,
                transform: resolvedTransform,
                transition: 'opacity 0.3s, transform 0.35s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.3s',
                animation,
                zIndex: layer,
                width: width ?? undefined,
            } as React.CSSProperties}
            onAnimationEnd={handleAnimationEnd}
            onPointerDown={onPointerDown}
        >
            {/* Shader background — subtle neural texture */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden opacity-[0.06] pointer-events-none">
                <NeuroNoise
                    colorFront={accent}
                    colorMid={accent}
                    colorBack="rgba(10,10,30,1)"
                    speed={0.3}
                    brightness={0.5}
                    contrast={0.8}
                    style={{ width: '100%', height: '100%' }}
                />
            </div>

            {/* Header */}
            {title && (
                <div className="relative z-10 flex items-center gap-2.5 px-4 pt-3 pb-2">
                    {icon && (
                        <div
                            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                            style={{ backgroundColor: `${accent}26` }}
                        >
                            {icon}
                        </div>
                    )}
                    <span
                        className="text-[11px] font-semibold tracking-widest uppercase truncate flex-1"
                        style={{ color: accent }}
                    >
                        {title}
                    </span>

                    {/* Header actions slot */}
                    {headerActions}

                    {/* Collapse button */}
                    {collapsible && onToggleCollapse && (
                        <button
                            onClick={onToggleCollapse}
                            className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                            title={collapsed ? 'Expand' : 'Collapse'}
                        >
                            {collapsed
                                ? <ChevronDown className="w-3.5 h-3.5 text-white/40" />
                                : <ChevronUp className="w-3.5 h-3.5 text-white/40" />}
                        </button>
                    )}

                    {/* Close button */}
                    {closable && onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
                            title="Close"
                        >
                            <X className="w-3.5 h-3.5 text-white/40" />
                        </button>
                    )}
                </div>
            )}

            {/* Content */}
            {!collapsed && (
                <div className="relative z-10 px-4 pb-4" style={{ minHeight: height }}>
                    {children}
                </div>
            )}
        </div>
    );
}
