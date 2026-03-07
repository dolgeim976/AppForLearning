import React, { useState } from 'react';
import { RoadmapNode } from './types';
import { exportTrackToMarkdown } from './exportUtils';
import { MicroLoopView } from './MicroLoopView';
import { FinalBossView } from './FinalBossView';
import { PracticeTaskView } from './PracticeTaskView';

interface LearningDashboardProps {
    topic: string;
    nodes: RoadmapNode[];
}

type TabType = 'theory' | 'practice' | 'boss';

export const LearningDashboard: React.FC<LearningDashboardProps> = ({ topic, nodes }) => {
    const activeNode = nodes[0] || null;
    const [activeTab, setActiveTab] = useState<TabType>('theory');

    if (!activeNode) return <div className="p-8 text-white h-[100dvh] flex items-center justify-center">Загрузка контента...</div>;

    const exportToMd = () => {
        exportTrackToMarkdown({ topic, roadmap_nodes: nodes });
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#0b1120] text-gray-200 overflow-hidden font-sans min-w-0">

            {/* Persistent Status Micro-Bar */}
            <div className="bg-gray-950 border-b border-gray-800/50 px-4 md:px-12 py-3 flex items-center justify-between text-xs overflow-x-auto whitespace-nowrap min-w-0">
                <div className="flex items-center gap-2">
                    {/* Breadcrumb */}
                    <div className="flex items-center gap-2 text-gray-500">
                        <span className="hover:text-gray-300 cursor-default font-bold">{topic}</span>
                        <span className="text-gray-700">›</span>
                        <span className="text-blue-400 font-medium">День {activeNode.day}</span>
                        <span className="text-gray-700">›</span>
                        <span className={`font-medium ${activeTab === 'theory' ? 'text-blue-400' : activeTab === 'practice' ? 'text-indigo-400' : 'text-rose-400'}`}>
                            {activeTab === 'theory' ? '📚 Обучение' : activeTab === 'practice' ? '💻 Практика' : '👾 Финальный Босс'}
                        </span>
                    </div>
                </div>
                {/* Mini Stats and Actions */}
                <div className="flex items-center gap-4 text-gray-500">
                    <span className="flex items-center gap-1.5">
                        🔄 <span className="text-blue-400 font-bold">{activeNode.micro_loops?.length || 0}</span> микро-лупов
                    </span>
                    <button
                        onClick={exportToMd}
                        className="py-1 px-3 bg-gray-800 hover:bg-gray-700 rounded-md text-gray-300 transition-colors flex items-center gap-1.5 border border-gray-700/50"
                        title="Скачать Markdown конспект"
                    >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        <span>Экспорт MD</span>
                    </button>
                </div>
            </div>

            {/* Заголовок текущего узла и Навигация табов */}
            <div className="pt-6 md:pt-8 px-4 md:px-12 pb-0 border-b border-gray-800 bg-gray-900 sticky top-0 z-10 w-full shadow-sm">
                <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 mb-4 md:mb-6 animate-fade-in">
                    <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold px-3 py-1.5 rounded-lg text-xs md:text-sm uppercase tracking-wider w-fit">Учебный Блок</span>
                    <h2 className="text-2xl md:text-3xl font-extrabold text-white">{activeNode.title || topic}</h2>
                </div>

                <div className="flex gap-6 md:gap-10 overflow-x-auto whitespace-nowrap scrollbar-hide">
                    <button
                        onClick={() => setActiveTab('theory')}
                        className={`pb-4 font-semibold text-lg transition-all relative flex items-center gap-2 ${activeTab === 'theory' ? 'text-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        <span>📚</span> Теория и Закрепление
                        {activeTab === 'theory' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 rounded-t-full tab-indicator"></div>}
                    </button>
                    <button
                        onClick={() => setActiveTab('practice')}
                        className={`pb-4 font-semibold text-lg transition-all relative flex items-center gap-2 ${activeTab === 'practice' ? 'text-indigo-400' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        <span>💻</span> Практика
                        {activeTab === 'practice' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 rounded-t-full tab-indicator"></div>}
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

                {activeTab === 'practice' && (
                    <div className="max-w-5xl mx-auto py-6 pb-16 animate-fade-in-up">
                        {activeNode.practice_task ? (
                            <PracticeTaskView task={activeNode.practice_task} />
                        ) : (
                            <div className="text-center py-20 text-gray-500 bg-gray-900/50 rounded-3xl border border-gray-800">
                                <p className="mb-2 text-xl">💻 Свободная практика.</p>
                                <p className="text-sm">Для этой темы не предусмотрена конкретная практическая задача.</p>
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
