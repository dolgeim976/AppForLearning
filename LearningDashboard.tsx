import React, { useState } from 'react';
import Editor from '@monaco-editor/react'; // Requires npm install @monaco-editor/react
import { RoadmapNode } from './types';
import { exportTrackToMarkdown } from './exportUtils';

interface LearningDashboardProps {
    topic: string;
    nodes: RoadmapNode[];
}

export const LearningDashboard: React.FC<LearningDashboardProps> = ({ topic, nodes }) => {
    const [activeNode, setActiveNode] = useState<RoadmapNode | null>(nodes[0] || null);

    if (!activeNode) return <div className="p-8 text-white">Загрузка трека...</div>;

    return (
        <div className="flex h-screen w-full bg-gray-900 text-white font-sans overflow-hidden">

            {/* 1. ЛЕВАЯ ПАНЕЛЬ: Интерактивный Roadmap (Псевдо-граф / таймлайн) */}
            <div className="w-1/4 h-full border-r border-gray-700 p-4 flex flex-col bg-gray-900">
                <h1 className="text-2xl font-bold text-blue-400 mb-6 truncate" title={topic}>{topic}</h1>

                <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-4">
                    {nodes.map((node, idx) => (
                        <div key={node.id} className="relative">
                            {/* Линия связи между нодами */}
                            {idx !== nodes.length - 1 && (
                                <div className="absolute top-1/2 left-4 w-1 h-full bg-gray-700 -z-10 translate-y-3"></div>
                            )}

                            <div
                                onClick={() => setActiveNode(node)}
                                className={`p-4 rounded-xl cursor-pointer transition-all border-2 group
                  ${activeNode.id === node.id
                                        ? 'border-blue-500 bg-gray-800 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                                        : 'border-gray-700 bg-gray-800 hover:border-gray-500'}`}
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                    ${activeNode.id === node.id ? 'bg-blue-500 text-white' : 'bg-gray-700 text-gray-400 group-hover:bg-gray-600'}`}>
                                        {node.day}
                                    </div>
                                    <h3 className="font-semibold text-base truncate">{node.title}</h3>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={() => exportTrackToMarkdown({ topic, roadmap_nodes: nodes })}
                    className="mt-6 w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold shadow-lg transition-colors flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    Export to Markdown
                </button>
            </div>

            {/* 2. ЦЕНТР: Теория, Микро-проект и Песочница */}
            <div className="w-2/4 h-full flex flex-col border-r border-gray-700 p-6 overflow-y-auto bg-gray-800">
                <h2 className="text-3xl font-bold mb-6 text-white">{activeNode.title}</h2>

                <div className="mb-6 space-y-2">
                    <div className="inline-block px-3 py-1 bg-purple-500/20 text-purple-400 text-xs font-semibold rounded-full uppercase tracking-wide">
                        Theory Summary
                    </div>
                    <p className="text-gray-300 leading-relaxed text-[15px]">{activeNode.theory_summary}</p>
                </div>

                <div className="mb-6 p-5 bg-gradient-to-br from-gray-800 to-gray-750 rounded-xl border border-gray-600 shadow-md">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">🏗</span>
                        <h3 className="text-lg font-bold text-yellow-500">Микро-проект</h3>
                    </div>
                    <p className="text-gray-300 border-l-2 border-yellow-500 pl-3 italic text-sm">{activeNode.micro_project}</p>
                </div>

                <div className="flex-1 flex flex-col bg-gray-900 rounded-xl border border-gray-700 overflow-hidden shadow-xl">
                    <div className="bg-gray-950 p-3 border-b border-gray-700 flex justify-between items-center">
                        <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2">
                            <span>💻</span> Interactive Sandbox
                        </h3>
                        <span className="text-xs text-gray-500">Auto-saves locally</span>
                    </div>
                    <div className="p-4 bg-gray-900 text-gray-400 text-sm border-b border-gray-800">
                        {activeNode.practice_task}
                    </div>
                    <div className="flex-1 relative">
                        <Editor
                            height="100%"
                            theme="vs-dark"
                            defaultLanguage="javascript"
                            defaultValue="// Введите ваш код здесь..."
                            options={{ minimap: { enabled: false }, fontSize: 14, padding: { top: 16 } }}
                        />
                    </div>
                </div>
            </div>

            {/* 3. ПРАВАЯ ПАНЕЛЬ: Worked Example, Active Recall, Interleaving */}
            <div className="w-1/4 h-full p-6 overflow-y-auto bg-gray-900 flex flex-col gap-6">

                {/* Worked Example */}
                <div className="p-5 bg-gray-800 rounded-xl shadow border border-gray-750">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">✨</span>
                        <h3 className="text-base font-bold text-emerald-400">Worked Example</h3>
                    </div>
                    <pre className="text-xs bg-black/50 p-4 rounded-lg text-emerald-300 whitespace-pre-wrap font-mono border border-gray-900">
                        {activeNode.worked_example}
                    </pre>
                </div>

                {/* Active Recall */}
                <div className="p-5 bg-gray-800 rounded-xl shadow border border-gray-750">
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">🧠</span>
                        <h3 className="text-base font-bold text-rose-400">Active Recall</h3>
                    </div>
                    <div className="space-y-3">
                        {activeNode.active_recall_questions.map((q, i) => (
                            <div key={i} className="group p-3 bg-gray-900 rounded border border-gray-700 hover:border-rose-400/50 transition-colors">
                                <p className="text-gray-300 text-sm"><span className="text-rose-400 font-bold mr-2">Q{i + 1}.</span>{q}</p>
                                {/* Кнопка "ответить" (заглушка для UI) */}
                                <div className="mt-2 h-0 overflow-hidden group-hover:h-auto opacity-0 group-hover:opacity-100 transition-all">
                                    <input type="text" placeholder="Ваш ответ..." className="w-full bg-black/50 border border-gray-600 rounded p-1 text-xs text-white" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Interleaving Tasks */}
                <div className="p-5 bg-gray-800 rounded-xl shadow border border-gray-750 mt-auto">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">🔄</span>
                        <h3 className="text-base font-bold text-teal-400">Interleaving</h3>
                    </div>
                    <p className="text-gray-400 text-xs italic">
                        {activeNode.interleaving_tasks}
                    </p>
                </div>

            </div>
        </div>
    );
};
