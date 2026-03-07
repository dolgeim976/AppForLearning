import React, { useState, useCallback } from 'react';
import { RoadmapNode } from './types';
import { exportTrackToMarkdown } from './exportUtils';
import { KnowledgeMap, NodeStatus } from './KnowledgeMap';
import { MicroLoopView } from './MicroLoopView';
import { FinalBossView } from './FinalBossView';

interface LearningDashboardProps {
    topic: string;
    nodes: RoadmapNode[];
}

type TabType = 'theory' | 'boss';

export const LearningDashboard: React.FC<LearningDashboardProps> = ({ topic, nodes }) => {
    const [activeNode, setActiveNode] = useState<RoadmapNode | null>(nodes[0] || null);
    const [activeTab, setActiveTab] = useState<TabType>('theory');
    const [mapCollapsed, setMapCollapsed] = useState(() => window.innerWidth < 768);

    // Knowledge Map State: track per-node status
    const [nodeStatuses, setNodeStatuses] = useState<Record<string, NodeStatus>>(() => {
        const initial: Record<string, NodeStatus> = {};
        nodes.forEach((node, idx) => {
            const nodeId = node.id || `node_${idx}`;
            if (idx === 0) {
                initial[nodeId] = 'in_progress';
            } else {
                initial[nodeId] = 'available';
            }
        });
        return initial;
    });

    // Reset states when changing nodes + update statuses
    const handleNodeChange = useCallback((node: RoadmapNode) => {
        if (activeNode) {
            const prevId = activeNode.id || `node_${nodes.indexOf(activeNode)}`;
            setNodeStatuses(prev => ({
                ...prev,
                [prevId]: prev[prevId] === 'in_progress' ? 'completed' : prev[prevId]
            }));
        }

        const newId = node.id || `node_${nodes.indexOf(node)}`;
        setNodeStatuses(prev => ({
            ...prev,
            [newId]: prev[newId] !== 'completed' ? 'in_progress' : prev[newId]
        }));

        setActiveNode(node);
        setActiveTab('theory');
        if (window.innerWidth < 768) {
            setMapCollapsed(true);
        }
    }, [activeNode, nodes]);

    if (!activeNode) return <div className="p-8 text-white">Загрузка трека...</div>;

    const activeNodeId = activeNode.id || `node_${nodes.indexOf(activeNode)}`;

    return (
        <div className="flex h-full w-full bg-[#0b1120] text-gray-200 overflow-hidden font-sans min-w-0">

            {/* 1. БОКОВАЯ ПАНЕЛЬ С КАРТОЙ */}
            <div className={\`h-full absolute md:static inset-y-0 left-0 z-30 border-r border-gray-800 flex flex-col bg-gray-950 shadow-2xl transition-all duration-300 \${mapCollapsed ? '-translate-x-full md:translate-x-0 w-0 md:w-12 min-w-0 max-w-none shrink-0' : 'translate-x-0 w-full md:w-1/4 md:min-w-[300px] md:max-w-[400px] shrink-0'}\`}>
            {mapCollapsed ? (
                <button
                    onClick={() => setMapCollapsed(false)}
                    className="h-full flex flex-col items-center justify-center gap-2 text-gray-500 hover:text-white hover:bg-gray-800/50 transition-colors"
                    title="Развернуть карту"
                >
                    <span className="text-lg">▶</span>
                    <span className="text-[10px] tracking-widest uppercase" style={{ writingMode: 'vertical-rl' }}>Карта</span>
                </button>
            ) : (
                <>
                    <div className="flex items-center gap-3 p-6 pb-2">
                        <span className="text-2xl">🗺️</span>
                        <h1 className="text-xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 flex-1" title={topic}>
                            {topic}
                        </h1>
                        <button
                            onClick={() => setMapCollapsed(true)}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
                            title="Свернуть"
                        >
                            <span className="text-sm">◀</span>
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-4 border-b border-gray-800 pb-4 px-6">Карта знаний • {nodes.length} уроков</p>

                    <div className="flex-1 overflow-y-auto pr-1 px-6">
                        <KnowledgeMap
                            nodes={nodes}
                            activeNodeId={activeNodeId}
                            nodeStatuses={nodeStatuses}
                            onNodeClick={handleNodeChange}
                        />
                    </div>

                    {/* Progress bar */}
                    <div className="pt-4 border-t border-gray-800 mt-4 px-6">
                        <div className="flex justify-between text-xs text-gray-500 mb-2">
                            <span>Прогресс</span>
                            <span>{Object.values(nodeStatuses).filter(s => s === 'completed').length} / {nodes.length}</span>
                        </div>
                        <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                                style={{ width: \`\${(Object.values(nodeStatuses).filter(s => s === 'completed').length / nodes.length) * 100}%\` }}
                                />
                        </div>
                    </div>

                    <div className="pt-4 px-6 pb-6">
                        <button
                            onClick={() => exportTrackToMarkdown({ topic, roadmap_nodes: nodes })}
                            className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-95"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                            Скачать конспект
                        </button>
                    </div>
                </>
            )}
        </div>

            {/* 2. ОСНОВНАЯ ПАНЕЛЬ С ВКЛАДКАМИ */ }
    <div className="flex-1 h-full flex flex-col bg-gray-900 relative min-w-0">

        {/* Persistent Status Micro-Bar */}
        {/* 2. ОСНОВНАЯ ПАНЕЛЬ С ВКЛАДКАМИ */}
        <div className="flex-1 h-full flex flex-col bg-gray-900 relative min-w-0">

            {/* Persistent Status Micro-Bar */}
            <div className="bg-gray-950 border-b border-gray-800/50 px-4 md:px-12 py-2 flex items-center justify-between text-xs overflow-x-auto whitespace-nowrap min-w-0">
                <div className="flex items-center gap-2">
                    {/* Hamburger for mobile map */}
                    <button onClick={() => setMapCollapsed(false)} className="md:hidden mr-2 p-1 text-gray-400 hover:text-white bg-gray-800 rounded">
                        <span className="text-sm">🗺️</span>
                    </button>
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-gray-500">
                        <span className="hover:text-gray-300 cursor-default">{topic}</span>
                        <span className="text-gray-700">›</span>
                        <span className="text-blue-400 font-medium">День {activeNode.day}</span>
                        <span className="text-gray-700">›</span>
                        <span className={`font-medium ${activeTab === 'theory' ? 'text-blue-400' : 'text-rose-400'}`}>
                            {activeTab === 'theory' ? '📚 Обучение' : '👾 Финальный Босс'}
                        </span>
                    </div>
                </div>
                {/* Mini Stats */}
                <div className="flex items-center gap-4 text-gray-500">
                    <span className="flex items-center gap-1.5">
                        ✅ <span className="text-emerald-400 font-bold">{Object.values(nodeStatuses).filter(s => s === 'completed').length}</span>/{nodes.length}
                    </span>
                    <span className="text-gray-800">|</span>
                    <span className="flex items-center gap-1.5">
                        🔄 <span className="text-blue-400 font-bold">{activeNode.micro_loops?.length || 0}</span> микро-лупов
                    </span>
                </div>
            </div>

            {/* Заголовок текущего узла и Навигация табов */}
            <div className="pt-6 md:pt-8 px-4 md:px-12 pb-0 border-b border-gray-800 bg-gray-900 sticky top-0 z-10 w-full shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-4 md:mb-6 animate-fade-in">
                    <span className="bg-blue-500/20 text-blue-400 font-bold px-3 py-1.5 rounded-lg text-xs md:text-sm uppercase tracking-wider w-fit">День {activeNode.day}</span>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-white">{activeNode.title}</h2>
                </div>

                <div className="flex gap-6 md:gap-10 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <button
                        onClick={() => setActiveTab('theory')}
                        className={`pb-4 font-semibold text-lg transition-all relative flex items-center gap-2 ${activeTab === 'theory' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        <span>📚</span> Обучение
                        {activeTab === 'theory' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 rounded-t-full tab-indicator"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('boss')}
                        className={`pb-4 font-semibold text-lg transition-all relative flex items-center gap-2 ${activeTab === 'boss' ? 'text-rose-400' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        <span>👾</span> Финальный Босс
                        {activeTab === 'boss' && <div className="absolute bottom-0 left-0 w-full h-1 bg-rose-500 rounded-t-full tab-indicator"></div>}
                    </button>
                </div>
            </div>

            {/* Контент активного таба */}
            <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-[#0b1120]">
                {activeTab === 'theory' && (
                    <div className="max-w-5xl mx-auto space-y-6 md:space-y-12 pb-16">

                        {/* Narrative Hook */}
                        <div className="group animate-fade-in-up">
                            <div className="p-8 md:p-10 bg-gradient-to-br from-indigo-900/40 to-purple-900/30 rounded-3xl border border-indigo-700/40 shadow-2xl relative overflow-hidden card-hover">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                <h3 className="text-xl font-bold text-indigo-300 flex items-center gap-3 mb-4">
                                    <span className="text-2xl">🎭</span> {activeNode.narrative_hook?.title || "Зачем это нужно?"}
                                </h3>
                                <p className="text-indigo-100/90 text-lg md:text-xl leading-relaxed italic border-l-4 border-indigo-500/50 pl-4">
                                    {activeNode.narrative_hook?.analogy}
                                </p>
                            </div>
                        </div>

                        {/* Micro Loops */}
                        {activeNode.micro_loops?.length > 0 ? (
                            <div className="space-y-10">
                                {activeNode.micro_loops.map((loop, idx) => (
                                    <MicroLoopView key={idx} loop={loop} index={idx} />
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-20 text-gray-500 bg-gray-900/50 rounded-3xl border border-gray-800">
                                <p className="mb-2 text-xl">🚀 Здесь пока пусто.</p>
                                <p className="text-sm">Контент сгенерирован в старом формате. Сгенерируйте новый трек.</p>
                            </div>
                        )}

                    </div>
                )}

                {activeTab === 'boss' && (
                    <div className="max-w-5xl mx-auto py-6 pb-16 animate-fade-in-up">
                        {activeNode.final_boss_practice ? (
                            <FinalBossView boss={activeNode.final_boss_practice} />
                        ) : (
                            <div className="text-center py-20 text-gray-500 bg-gray-900/50 rounded-3xl border border-gray-800">
                                <p className="mb-2 text-xl">👾 Босс еще не прибыл.</p>
                                <p className="text-sm">Задание отсутствует в текущем JSON формате.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

        );
};
