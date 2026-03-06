import React from 'react';
import { RoadmapNode } from './types';

export type NodeStatus = 'locked' | 'available' | 'in_progress' | 'completed';

interface KnowledgeMapProps {
    nodes: RoadmapNode[];
    activeNodeId: string | undefined;
    nodeStatuses: Record<string, NodeStatus>;
    onNodeClick: (node: RoadmapNode) => void;
}

const statusConfig: Record<NodeStatus, { icon: string; ring: string; bg: string; glow: string; label: string }> = {
    locked: { icon: '🔒', ring: 'border-gray-700', bg: 'bg-gray-800', glow: '', label: 'Заблокировано' },
    available: { icon: '🟡', ring: 'border-amber-500', bg: 'bg-amber-900/30', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.25)]', label: 'Доступно' },
    in_progress: { icon: '🔵', ring: 'border-blue-500', bg: 'bg-blue-900/30', glow: 'shadow-[0_0_16px_rgba(59,130,246,0.35)]', label: 'В процессе' },
    completed: { icon: '✅', ring: 'border-emerald-500', bg: 'bg-emerald-900/30', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.25)]', label: 'Завершено' }
};

export const KnowledgeMap: React.FC<KnowledgeMapProps> = ({ nodes, activeNodeId, nodeStatuses, onNodeClick }) => {
    return (
        <div className="flex flex-col gap-1 py-2 relative">
            {nodes.map((node, idx) => {
                const status = nodeStatuses[node.id || `node_${idx}`] || 'available';
                const isActive = (node.id || `node_${idx}`) === activeNodeId;
                const config = statusConfig[status];
                const isLocked = status === 'locked';
                const quizCount = node.active_recall_questions?.length || 0;

                return (
                    <div key={node.id || idx} className="relative">
                        {/* Connecting line */}
                        {idx < nodes.length - 1 && (
                            <div className="absolute left-[22px] top-[52px] w-[2px] h-[calc(100%-20px)] z-0">
                                <div className={`w-full h-full ${status === 'completed'
                                        ? 'bg-gradient-to-b from-emerald-500 to-emerald-500/30'
                                        : 'bg-gradient-to-b from-gray-700 to-gray-800'
                                    }`} />
                            </div>
                        )}

                        {/* Node card */}
                        <div
                            onClick={() => !isLocked && onNodeClick(node)}
                            className={`relative z-10 flex items-start gap-4 p-3.5 rounded-2xl transition-all duration-300
                                ${isLocked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                                ${isActive
                                    ? `border-2 ${config.ring} ${config.bg} ${config.glow} scale-[1.02]`
                                    : `border-2 border-transparent hover:border-gray-700 hover:bg-gray-800/60`
                                }
                            `}
                        >
                            {/* Node circle */}
                            <div className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 border-2 transition-all text-lg
                                ${isActive
                                    ? `${config.ring} ${config.bg} ${config.glow}`
                                    : status === 'completed'
                                        ? 'border-emerald-600 bg-emerald-900/40'
                                        : status === 'locked'
                                            ? 'border-gray-700 bg-gray-800'
                                            : `${config.ring} ${config.bg}`
                                }`}
                            >
                                {status === 'completed' ? '✓' : status === 'locked' ? '🔒' : node.day}
                            </div>

                            {/* Node info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded-md ${status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                                            status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                                                status === 'available' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-gray-700 text-gray-500'
                                        }`}>
                                        {config.label}
                                    </span>
                                </div>
                                <h3 className={`font-semibold text-sm leading-snug line-clamp-2 ${isActive ? 'text-white' :
                                        isLocked ? 'text-gray-600' : 'text-gray-300'
                                    }`}>
                                    {node.title}
                                </h3>

                                {/* Progress indicators */}
                                {!isLocked && (
                                    <div className="flex items-center gap-3 mt-2">
                                        <div className="flex items-center gap-1 text-[11px] text-gray-500">
                                            <span>📖</span> Теория
                                        </div>
                                        <div className="flex items-center gap-1 text-[11px] text-gray-500">
                                            <span>💻</span> Задача
                                        </div>
                                        {quizCount > 0 && (
                                            <div className="flex items-center gap-1 text-[11px] text-gray-500">
                                                <span>🧠</span> {quizCount} Q
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Active indicator arrow */}
                            {isActive && (
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-l-full" />
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};
