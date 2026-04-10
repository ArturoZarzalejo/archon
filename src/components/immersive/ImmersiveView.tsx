'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Bot } from 'lucide-react';

const ImmersiveScene = dynamic(() => import('./ImmersiveScene'), { ssr: false });

interface ImmersiveViewProps {
    agentCount: number;
}

export default function ImmersiveView({ agentCount }: ImmersiveViewProps) {
    return (
        <div className="fixed inset-0 bg-[#0a0a1e]">
            {/* Full-screen 3D scene */}
            <ImmersiveScene />

            {/* Exit button — top-left */}
            <div className="fixed top-5 left-5 z-50">
                <Link
                    href="/"
                    className="flex items-center gap-2 px-4 py-2 rounded-xl glass glass-interactive text-text-secondary hover:text-text transition-colors text-sm font-medium"
                >
                    <ArrowLeft size={16} />
                    <span>Back to Catalog</span>
                </Link>
            </div>

            {/* Agent count overlay — top-right */}
            <div className="fixed top-5 right-5 z-50">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl glass">
                    <Bot size={16} className="text-text-muted" />
                    <span className="text-sm font-medium text-text-secondary tabular-nums">
                        {agentCount} agent{agentCount !== 1 ? 's' : ''}
                    </span>
                </div>
            </div>

            {/* WASD hint — bottom-right */}
            <div className="fixed bottom-5 right-5 z-50">
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl glass text-text-muted text-xs">
                    <div className="flex flex-col items-center gap-0.5">
                        <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">W</kbd>
                        <div className="flex gap-0.5">
                            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">A</kbd>
                            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">S</kbd>
                            <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">D</kbd>
                        </div>
                    </div>
                    <span className="text-text-secondary">Move</span>
                    <div className="h-3 w-px bg-white/10" />
                    <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">Shift</kbd>
                    <span className="text-text-secondary">Sprint</span>
                </div>
            </div>
        </div>
    );
}
