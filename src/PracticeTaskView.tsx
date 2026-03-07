import React, { useState } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { z } from 'zod';
import { PracticeTaskSchema } from './types';
import Editor from '@monaco-editor/react';

type PracticeTask = z.infer<typeof PracticeTaskSchema>;

export const PracticeTaskView: React.FC<{ task: PracticeTask }> = ({ task }) => {
    const [userCode, setUserCode] = useState(task.starter_code || '');
    const [revealed, setRevealed] = useState(false);

    return (
        <div className="bg-gray-800/40 rounded-3xl border border-gray-700/50 shadow-xl overflow-hidden animate-fade-in-up">
            <div className="p-6 md:p-8 bg-gradient-to-br from-indigo-900/80 to-blue-900/80 border-b border-indigo-700/50">
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">💻</span>
                    <h3 className="text-2xl font-bold text-white flex-1">{task.title || "Практическая задача"}</h3>
                </div>
                <div className="text-indigo-100/90 text-lg leading-relaxed bg-indigo-950/40 p-5 rounded-2xl border border-indigo-500/30">
                    <MarkdownRenderer content={task.mission} />
                </div>
            </div>

            <div className="p-6 md:p-8 bg-gray-900">
                <div className="mb-6 rounded-2xl overflow-hidden border border-gray-700/50 shadow-lg h-80">
                    <div className="bg-gray-800 px-4 py-2 border-b border-gray-700/50 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-500" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /></div>
                            <span className="text-xs text-gray-400 font-mono ml-2">solution.java</span>
                        </div>
                    </div>
                    <Editor
                        height="100%"
                        defaultLanguage="java"
                        theme="vs-dark"
                        value={userCode}
                        onChange={(value) => setUserCode(value || '')}
                        options={{
                            minimap: { enabled: false },
                            fontSize: 14,
                            padding: { top: 16 }
                        }}
                    />
                </div>

                {!revealed ? (
                    <button
                        onClick={() => setRevealed(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-indigo-900/20 active:scale-95 w-full sm:w-auto"
                    >
                        Показать решение
                    </button>
                ) : (
                    <div className="space-y-6 animate-fade-in">
                        <div className="bg-emerald-900/20 border border-emerald-500/30 p-6 rounded-2xl">
                            <h4 className="flex items-center gap-2 text-xl font-bold text-emerald-400 mb-4">
                                <span>🏆</span> Официальное решение:
                            </h4>
                            <div className="bg-[#0d1321] p-4 border border-gray-800 rounded-xl overflow-x-auto">
                                <pre className="text-emerald-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">{task.solution_code}</pre>
                            </div>
                        </div>

                        <div className="bg-gray-800/60 border border-gray-700/50 p-6 rounded-2xl">
                            <h4 className="text-lg font-bold text-blue-300 mb-3 flex items-center gap-2">
                                <span>💡</span> Разбор решения:
                            </h4>
                            <div className="text-gray-300 leading-relaxed text-base">
                                <MarkdownRenderer content={task.explanation} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
