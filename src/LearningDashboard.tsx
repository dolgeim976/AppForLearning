import React, { useState, useCallback } from 'react';
import { RoadmapNode } from './types';
import { exportTrackToMarkdown } from './exportUtils';
import { KnowledgeMap, NodeStatus } from './KnowledgeMap';
import { MarkdownRenderer } from './MarkdownRenderer';

interface LearningDashboardProps {
    topic: string;
    nodes: RoadmapNode[];
}

type TabType = 'theory' | 'practice' | 'quiz';

export const LearningDashboard: React.FC<LearningDashboardProps> = ({ topic, nodes }) => {
    const [activeNode, setActiveNode] = useState<RoadmapNode | null>(nodes[0] || null);
    const [activeTab, setActiveTab] = useState<TabType>('theory');
    const [mapCollapsed, setMapCollapsed] = useState(() => window.innerWidth < 768);
    // Quiz State
    const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
    const [quizCardIndex, setQuizCardIndex] = useState(0);
    const [quizCardRevealed, setQuizCardRevealed] = useState(false);
    const [quizFinished, setQuizFinished] = useState(false);

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
        // Mark previous node as completed (if it was in_progress)
        if (activeNode) {
            const prevId = activeNode.id || `node_${nodes.indexOf(activeNode)}`;
            setNodeStatuses(prev => ({
                ...prev,
                [prevId]: prev[prevId] === 'in_progress' ? 'completed' : prev[prevId]
            }));
        }

        // Mark new node as in_progress
        const newId = node.id || `node_${nodes.indexOf(node)}`;
        setNodeStatuses(prev => ({
            ...prev,
            [newId]: prev[newId] !== 'completed' ? 'in_progress' : prev[newId]
        }));

        setActiveNode(node);
        setActiveTab('theory');
        setUserAnswers({});
        setQuizCardIndex(0);
        setQuizCardRevealed(false);
        setQuizFinished(false);
        if (window.innerWidth < 768) {
            setMapCollapsed(true);
        }
    }, [activeNode, nodes]);

    if (!activeNode) return <div className="p-8 text-white">Загрузка трека...</div>;

    const activeNodeId = activeNode.id || `node_${nodes.indexOf(activeNode)}`;

    // -------------- Keyboard Shortcuts --------------
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (activeTab !== 'quiz') return;
            const questions = activeNode.active_recall_questions || [];

            if (quizFinished) {
                if (e.key === 'Enter') {
                    setQuizCardIndex(0); setQuizCardRevealed(false); setQuizFinished(false); setUserAnswers({});
                }
                return;
            }

            if (!quizCardRevealed) {
                // Numeric selection 1-4
                const numKey = parseInt(e.key);
                const q = questions[quizCardIndex];
                if (!isNaN(numKey) && Array.isArray(q?.options) && numKey >= 1 && numKey <= q.options.length) {
                    setUserAnswers(prev => ({ ...prev, [quizCardIndex]: q.options[numKey - 1] }));
                }

                // Enter to submit
                if (e.key === 'Enter' && userAnswers[quizCardIndex]) {
                    setQuizCardRevealed(true);
                }
            } else {
                // Enter to go to next
                if (e.key === 'Enter') {
                    if (quizCardIndex + 1 >= questions.length) {
                        setQuizFinished(true);
                    } else {
                        setQuizCardIndex(prev => prev + 1);
                        setQuizCardRevealed(false);
                    }
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeTab, quizFinished, quizCardIndex, quizCardRevealed, userAnswers, activeNode.active_recall_questions]);
    // --------------------------------------------------------------------------------

    return (
        <div className="flex h-full w-full bg-[#0b1120] text-gray-200 overflow-hidden font-sans min-w-0">

            {/* 1. БОКОВАЯ ПАНЕЛЬ С КАРТОЙ */}
            <div className={`h-full absolute md:static inset-y-0 left-0 z-30 border-r border-gray-800 flex flex-col bg-gray-950 shadow-2xl transition-all duration-300 ${mapCollapsed ? '-translate-x-full md:translate-x-0 w-0 md:w-12 min-w-0 max-w-none shrink-0' : 'translate-x-0 w-full md:w-1/4 md:min-w-[300px] md:max-w-[400px] shrink-0'}`}>
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
                                    style={{ width: `${(Object.values(nodeStatuses).filter(s => s === 'completed').length / nodes.length) * 100}%` }}
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
                            <span className={`font-medium ${activeTab === 'theory' ? 'text-blue-400' :
                                activeTab === 'practice' ? 'text-emerald-400' : 'text-rose-400'
                                }`}>
                                {activeTab === 'theory' ? '📚 Теория' :
                                    activeTab === 'practice' ? '💻 Практика' : '🧠 Quiz'}
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
                            🧠 <span className="text-rose-400 font-bold">{activeNode.active_recall_questions?.length || 0}</span> вопросов
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
                            <span>📚</span> Теория
                            {activeTab === 'theory' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 rounded-t-full tab-indicator"></div>}
                        </button>
                        <button
                            onClick={() => setActiveTab('practice')}
                            className={`pb-4 font-semibold text-lg transition-all relative flex items-center gap-2 ${activeTab === 'practice' ? 'text-emerald-400' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            <span>💻</span> Практика
                            {activeTab === 'practice' && <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500 rounded-t-full tab-indicator"></div>}
                        </button>
                        <button
                            onClick={() => setActiveTab('quiz')}
                            className={`pb-4 font-semibold text-lg transition-all relative flex items-center gap-2 ${activeTab === 'quiz' ? 'text-rose-400' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            <span>🧠</span> Quiz
                            {activeNode.active_recall_questions && activeNode.active_recall_questions.length > 0 && (
                                <span className="bg-rose-500/20 text-rose-400 text-xs font-bold px-2 py-0.5 rounded-full">{activeNode.active_recall_questions.length}</span>
                            )}
                            {activeTab === 'quiz' && <div className="absolute bottom-0 left-0 w-full h-1 bg-rose-500 rounded-t-full tab-indicator"></div>}
                        </button>
                    </div>
                </div>

                {/* Контент активного таба */}
                <div className="flex-1 overflow-y-auto p-4 md:p-12 bg-[#0b1120]"> {/* Немного более глубокий фон для контента */}
                    {activeTab === 'theory' && (
                        <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 pb-16">

                            {/* 1. Narrative Hook — collapsible */}
                            <details open className="group animate-fade-in-up">
                                <summary className="cursor-pointer list-none">
                                    <div className="p-4 md:p-6 bg-gradient-to-br from-indigo-900/50 to-purple-900/40 rounded-2xl border border-indigo-700/40 shadow-lg relative overflow-hidden card-hover">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                                        <h3 className="text-lg font-bold text-indigo-300 flex items-center gap-3">
                                            <span className="text-xl">🎭</span> Зачем это нужно?
                                            <span className="ml-auto text-xs text-indigo-500 group-open:rotate-180 transition-transform duration-200">▼</span>
                                        </h3>
                                    </div>
                                </summary>
                                <div className="mt-2 p-6 bg-indigo-900/20 rounded-2xl border border-indigo-700/20">
                                    <p className="text-indigo-100/90 text-lg leading-relaxed italic">
                                        {activeNode.narrative_hook}
                                    </p>
                                </div>
                            </details>

                            {/* 2. Analogy — collapsible */}
                            <details open className="group animate-fade-in-up">
                                <summary className="cursor-pointer list-none">
                                    <div className="p-6 bg-gradient-to-br from-amber-900/30 to-orange-900/30 rounded-2xl border border-amber-700/30 shadow-lg card-hover">
                                        <h3 className="text-lg font-bold text-amber-300 flex items-center gap-3">
                                            <span className="text-xl">💡</span> Аналогия из реальной жизни
                                            <span className="ml-auto text-xs text-amber-500 group-open:rotate-180 transition-transform duration-200">▼</span>
                                        </h3>
                                    </div>
                                </summary>
                                <div className="mt-2 p-6 bg-amber-900/15 rounded-2xl border border-amber-700/20">
                                    <p className="text-amber-100/80 text-lg leading-relaxed">
                                        {activeNode.analogy}
                                    </p>
                                </div>
                            </details>

                            {/* 3. Detailed Theory — always visible, rendered as Markdown */}
                            <section className="animate-fade-in-up">
                                <h3 className="text-2xl font-bold text-gray-100 mb-4 flex items-center gap-3 border-b border-gray-800 pb-2">
                                    <span className="text-blue-400">#</span> Подробный конспект
                                </h3>
                                <div className="bg-gray-800/40 p-4 md:p-8 rounded-2xl border border-gray-800 shadow-sm overflow-x-auto">
                                    <MarkdownRenderer content={activeNode.detailed_theory} />
                                </div>
                            </section>

                            {/* 4. Common Pitfalls — collapsible, rendered as Markdown */}
                            <details className="group animate-fade-in-up">
                                <summary className="cursor-pointer list-none">
                                    <div className="p-6 bg-gradient-to-br from-rose-900/30 to-red-900/20 rounded-2xl border border-rose-700/30 shadow-lg card-hover">
                                        <h3 className="text-lg font-bold text-rose-300 flex items-center gap-3">
                                            <span className="text-xl">⚠️</span> Частые ошибки новичков
                                            <span className="ml-auto text-xs text-rose-500 group-open:rotate-180 transition-transform duration-200">▼</span>
                                        </h3>
                                    </div>
                                </summary>
                                <div className="mt-2 p-6 bg-rose-900/15 rounded-2xl border border-rose-700/20">
                                    <MarkdownRenderer content={activeNode.common_pitfalls} />
                                </div>
                            </details>

                            {/* 5. Practical Examples — collapsible, rendered as Markdown */}
                            <details className="group animate-fade-in-up">
                                <summary className="cursor-pointer list-none">
                                    <div className="p-6 rounded-2xl border border-gray-700 bg-gray-800/30 card-hover">
                                        <h3 className="text-lg font-bold text-gray-100 flex items-center gap-3">
                                            <span className="text-emerald-400">✨</span> Практические примеры
                                            <span className="ml-auto text-xs text-gray-500 group-open:rotate-180 transition-transform duration-200">▼</span>
                                        </h3>
                                    </div>
                                </summary>
                                <div className="mt-2 p-6 bg-gray-950 rounded-2xl border border-gray-800 shadow-sm">
                                    <MarkdownRenderer content={activeNode.practical_examples} />
                                </div>
                            </details>

                            {/* 6. Interleaving — collapsible */}
                            <details className="group animate-fade-in-up">
                                <summary className="cursor-pointer list-none">
                                    <div className="p-6 bg-gradient-to-r from-teal-900/40 to-cyan-900/40 rounded-2xl border border-teal-800/50 shadow-inner card-hover">
                                        <h3 className="text-lg font-bold text-teal-300 flex items-center gap-3">
                                            <span>🔄</span> Интерливинг (Связь с прошлым)
                                            <span className="ml-auto text-xs text-teal-500 group-open:rotate-180 transition-transform duration-200">▼</span>
                                        </h3>
                                    </div>
                                </summary>
                                <div className="mt-2 p-6 bg-teal-900/15 rounded-2xl border border-teal-700/20">
                                    <MarkdownRenderer content={activeNode.interleaving_tasks} />
                                </div>
                            </details>
                        </div>
                    )}

                    {activeTab === 'practice' && (
                        <div className="max-w-7xl mx-auto py-6 pb-16 animate-fade-in-up">

                            {/* Task Type & Difficulty Header */}
                            <div className="flex items-center gap-3 flex-wrap mb-6">
                                <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${activeNode.practice_type === 'debugging' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                                    activeNode.practice_type === 'replication' ? 'bg-violet-500/20 text-violet-400 border-violet-500/30' :
                                        'bg-blue-500/20 text-blue-400 border-blue-500/30'
                                    }`}>
                                    {activeNode.practice_type === 'debugging' ? '🐛 Debugging' :
                                        activeNode.practice_type === 'replication' ? '📝 Replication' :
                                            '⚡ Algorithmic'}
                                </span>
                                <span className={`text-xs font-bold px-3 py-1.5 rounded-lg border ${activeNode.practice_difficulty === 'easy' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                                    activeNode.practice_difficulty === 'hard' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                                        'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                                    }`}>
                                    {activeNode.practice_difficulty === 'easy' ? '🟢 Easy' :
                                        activeNode.practice_difficulty === 'hard' ? '🔴 Hard' :
                                            '🟡 Medium'}
                                </span>
                            </div>

                            {/* Task Description */}
                            <div className="p-8 bg-gray-800/60 rounded-2xl border border-gray-700 shadow-sm mb-6">
                                <h3 className="text-xl font-bold text-blue-400 mb-4 flex items-center gap-2">
                                    <span>🎯</span> Задание
                                </h3>
                                <MarkdownRenderer content={activeNode.practice_task} />
                            </div>

                            {/* Requirements Checklist */}
                            {activeNode.practice_requirements && activeNode.practice_requirements.length > 0 && (
                                <div className="p-8 bg-gradient-to-br from-indigo-900/20 to-blue-900/20 rounded-2xl border border-indigo-700/30 mb-6">
                                    <h3 className="text-lg font-bold text-indigo-300 mb-4 flex items-center gap-2">
                                        <span>✅</span> Чеклист требований
                                    </h3>
                                    <div className="space-y-3">
                                        {activeNode.practice_requirements.map((req, idx) => (
                                            <label key={idx} className="flex items-start gap-3 cursor-pointer group">
                                                <input type="checkbox" className="mt-1 w-4 h-4 accent-indigo-500 rounded shrink-0" />
                                                <span className="text-sm text-indigo-200/80 leading-snug group-hover:text-indigo-100 transition-colors">{req}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Hints */}
                            {activeNode.practice_hints && activeNode.practice_hints.length > 0 && (
                                <div className="p-8 bg-gradient-to-br from-amber-900/20 to-orange-900/20 rounded-2xl border border-amber-700/30 mb-6">
                                    <h3 className="text-lg font-bold text-amber-300 mb-4 flex items-center gap-2">
                                        <span>💡</span> Подсказки ({activeNode.practice_hints.length})
                                    </h3>
                                    <div className="space-y-2">
                                        {activeNode.practice_hints.map((hint, idx) => (
                                            <details key={idx} className="group">
                                                <summary className="cursor-pointer text-sm text-amber-400/80 hover:text-amber-300 transition-colors flex items-center gap-2 py-1.5">
                                                    <span className="text-xs bg-amber-500/20 px-2 py-0.5 rounded font-mono">#{idx + 1}</span>
                                                    Показать подсказку {idx + 1}
                                                </summary>
                                                <p className="text-sm text-amber-100/70 mt-2 ml-8 leading-relaxed border-l-2 border-amber-700/50 pl-3">{hint}</p>
                                            </details>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Solution Toggle */}
                            {activeNode.solution_code && (
                                <details className="group">
                                    <summary className="cursor-pointer">
                                        <div className="p-6 bg-gradient-to-br from-emerald-900/20 to-teal-900/20 rounded-2xl border border-emerald-700/30 card-hover">
                                            <h3 className="text-lg font-bold text-emerald-300 flex items-center gap-2">
                                                <span>💻</span> Показать решение
                                                <span className="ml-auto text-xs text-emerald-500 group-open:rotate-180 transition-transform duration-200">▼</span>
                                            </h3>
                                        </div>
                                    </summary>
                                    <div className="mt-2 rounded-2xl overflow-hidden border border-emerald-700/20">
                                        <div className="bg-gray-800 px-4 py-2 flex items-center gap-2 border-b border-gray-700">
                                            <div className="flex gap-1.5">
                                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>
                                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                            </div>
                                            <span className="text-xs text-gray-400 font-mono ml-2">solution.java</span>
                                        </div>
                                        <pre className="bg-gray-950 p-6 text-sm font-mono text-gray-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">{activeNode.solution_code}</pre>
                                    </div>
                                </details>
                            )}
                        </div>
                    )}

                    {activeTab === 'quiz' && (() => {
                        const questions = activeNode.active_recall_questions || [];

                        // Final results screen
                        if (quizFinished) {
                            const correctCount = Object.entries(userAnswers).filter(([i, ans]) => ans === questions[parseInt(i)]?.correct_answer).length;
                            const accuracy = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0;

                            return (
                                <div className="max-w-5xl mx-auto py-16 text-center animate-scale-pop">
                                    <div className="text-7xl mb-6">{accuracy >= 80 ? '🏆' : accuracy >= 50 ? '👍' : '💪'}</div>
                                    <h2 className="text-4xl font-extrabold text-white mb-4">Quiz завершён!</h2>
                                    <div className="grid grid-cols-3 gap-4 mb-8 max-w-sm mx-auto">
                                        <div className="bg-emerald-900/30 rounded-2xl p-4 border border-emerald-700/30">
                                            <div className="text-3xl font-bold text-emerald-400">{correctCount}</div>
                                            <div className="text-xs text-emerald-500 mt-1">Правильно</div>
                                        </div>
                                        <div className="bg-rose-900/30 rounded-2xl p-4 border border-rose-700/30">
                                            <div className="text-3xl font-bold text-rose-400">{questions.length - correctCount}</div>
                                            <div className="text-xs text-rose-500 mt-1">Неверно</div>
                                        </div>
                                        <div className="bg-blue-900/30 rounded-2xl p-4 border border-blue-700/30">
                                            <div className="text-3xl font-bold text-blue-400">{accuracy}%</div>
                                            <div className="text-xs text-blue-500 mt-1">Точность</div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => { setQuizCardIndex(0); setQuizCardRevealed(false); setQuizFinished(false); setUserAnswers({}); }}
                                        className="px-8 py-3 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 rounded-xl font-bold shadow-lg transition-all"
                                    >
                                        🔁 Попробовать снова (Enter)
                                    </button>
                                </div>
                            );
                        }

                        if (questions.length === 0) {
                            return <div className="text-center py-20 px-6 text-gray-500 bg-gray-900 rounded-3xl border border-gray-800 mt-8">Квиз вопросов для этого урока еще нет.</div>;
                        }

                        const q = questions[quizCardIndex];

                        if (!q || !Array.isArray(q.options)) {
                            return (
                                <div className="text-center py-20 text-gray-500">
                                    <p className="mb-4 text-rose-400">⚠️ Данные вопроса повреждены. Это старый кэш.</p>
                                    <button
                                        onClick={() => {
                                            if (quizCardIndex + 1 >= questions.length) setQuizFinished(true);
                                            else setQuizCardIndex(prev => prev + 1);
                                        }}
                                        className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded text-sm transition-colors"
                                    >
                                        Пропустить вопрос
                                    </button>
                                </div>
                            );
                        }

                        const qType = q.type || 'multiple_choice';
                        const typeConfig: Record<string, { icon: string; label: string; borderColor: string; bgColor: string; textColor: string }> = {
                            multiple_choice: { icon: '📝', label: 'Теория', borderColor: 'border-blue-500/50', bgColor: 'bg-blue-500/10', textColor: 'text-blue-300' },
                            predict_output: { icon: '🖥️', label: 'Предскажи вывод', borderColor: 'border-violet-500/50', bgColor: 'bg-violet-500/10', textColor: 'text-violet-300' },
                            spot_bug: { icon: '🐛', label: 'Найди баг', borderColor: 'border-amber-500/50', bgColor: 'bg-amber-500/10', textColor: 'text-amber-300' }
                        };
                        const tc = typeConfig[qType] || typeConfig.multiple_choice;
                        const selectedAnswer = userAnswers[quizCardIndex];
                        const isCorrect = quizCardRevealed && selectedAnswer === q.correct_answer;

                        return (
                            <div className="max-w-5xl mx-auto py-8 animate-fade-in">
                                {/* Progress bar */}
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-gray-500">Quiz</span>
                                    <span className="text-sm text-gray-500">{quizCardIndex + 1} / {questions.length}</span>
                                </div>
                                <div className="w-full bg-gray-800 rounded-full h-1.5 mb-8 overflow-hidden">
                                    <div className="bg-gradient-to-r from-rose-500 to-pink-500 h-full rounded-full transition-all duration-500" style={{ width: `${((quizCardIndex) / questions.length) * 100}%` }} />
                                </div>

                                {/* Question card */}
                                <div key={quizCardIndex} className={`bg-gray-800/50 rounded-2xl md:rounded-3xl p-5 md:p-8 border transition-all shadow-xl animate-fade-in-up
                                    ${quizCardRevealed ? (isCorrect ? 'border-emerald-500/50 bg-emerald-900/10' : 'border-rose-500/50 bg-rose-900/10') : 'border-gray-700'}`}>

                                    {/* Type badge + question */}
                                    <div className="flex flex-col sm:flex-row items-start gap-4 mb-6">
                                        <span className="text-rose-400 font-black bg-rose-500/10 px-3 py-1 rounded-xl text-sm border border-rose-500/20 shrink-0 self-start">Q{quizCardIndex + 1}</span>
                                        <div className="flex-1 w-full">
                                            <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${tc.bgColor} ${tc.textColor} border ${tc.borderColor} mb-3`}>
                                                {tc.icon} {tc.label}
                                            </span>
                                            <h4 className="text-lg md:text-xl text-gray-200 leading-relaxed font-bold">{q.question}</h4>
                                        </div>
                                    </div>

                                    {/* Code snippet */}
                                    {q.code_snippet && (qType === 'predict_output' || qType === 'spot_bug') && (
                                        <div className={`mb-6 rounded-2xl overflow-hidden border ${qType === 'spot_bug' ? 'border-amber-700/50' : 'border-violet-700/50'}`}>
                                            <div className={`px-4 py-2 text-xs font-mono flex items-center gap-2 ${qType === 'spot_bug' ? 'bg-amber-900/30 text-amber-400' : 'bg-violet-900/30 text-violet-400'}`}>
                                                <span>{qType === 'spot_bug' ? '🐛 Код с ошибкой' : '🖥️ Фрагмент кода'}</span>
                                            </div>
                                            <pre className="bg-gray-950 p-5 text-sm font-mono text-gray-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">{q.code_snippet}</pre>
                                        </div>
                                    )}

                                    {/* Options */}
                                    <div className="space-y-3">
                                        {q.options.map((opt, optIndex) => {
                                            const isSelected = selectedAnswer === opt;
                                            const isCorrectOpt = quizCardRevealed && opt === q.correct_answer;
                                            const isWrongOpt = quizCardRevealed && isSelected && opt !== q.correct_answer;
                                            return (
                                                <label key={optIndex} className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer border transition-all
                                                    ${isSelected && !quizCardRevealed ? `${tc.borderColor} ${tc.bgColor}` : 'border-gray-700 bg-gray-900 hover:border-gray-600'}
                                                    ${quizCardRevealed ? 'cursor-default' : ''}
                                                    ${isCorrectOpt ? 'border-emerald-500 bg-emerald-500/20' : ''}
                                                    ${isWrongOpt ? 'border-rose-500 bg-rose-500/20 opacity-70' : ''}
                                                `}>
                                                    <input
                                                        type="radio"
                                                        name={`quiz-card-${quizCardIndex}`}
                                                        value={opt}
                                                        checked={isSelected}
                                                        disabled={quizCardRevealed}
                                                        onChange={() => { if (!quizCardRevealed) setUserAnswers(prev => ({ ...prev, [quizCardIndex]: opt })); }}
                                                        className="mt-1 w-5 h-5 accent-rose-500"
                                                    />
                                                    <div className="flex-1 flex items-start gap-3">
                                                        <span className="mt-0.5 text-[10px] font-mono text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 opacity-70 shrink-0 select-none">
                                                            {optIndex + 1}
                                                        </span>
                                                        <span className={`text-base leading-snug ${isCorrectOpt ? 'text-emerald-300 font-medium' :
                                                            isWrongOpt ? 'text-rose-300' :
                                                                qType === 'predict_output' ? 'font-mono text-gray-300' : 'text-gray-300'
                                                            }`}>{opt}</span>
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>

                                    {/* Action button */}
                                    <div className="mt-8 flex justify-end">
                                        {!quizCardRevealed ? (
                                            <button
                                                onClick={() => setQuizCardRevealed(true)}
                                                disabled={!selectedAnswer}
                                                className="w-full sm:w-auto bg-rose-600 hover:bg-rose-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3 md:py-3 px-6 md:px-8 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                                            >
                                                Проверить
                                                <span className="hidden md:inline text-[10px] bg-rose-800 text-white/70 px-1.5 py-0.5 rounded font-mono border border-rose-700/50">Enter</span>
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    if (quizCardIndex + 1 >= questions.length) {
                                                        setQuizFinished(true);
                                                    } else {
                                                        setQuizCardIndex(prev => prev + 1);
                                                        setQuizCardRevealed(false);
                                                    }
                                                }}
                                                className="w-full sm:w-auto bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold py-3 md:py-3 px-6 md:px-8 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
                                            >
                                                {quizCardIndex + 1 >= questions.length ? 'Завершить' : 'Следующий →'}
                                                <span className="hidden md:inline text-[10px] bg-rose-800/50 text-white/80 px-1.5 py-0.5 rounded font-mono border border-rose-500/30">Enter</span>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

        </div>
    );
};
