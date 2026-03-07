import React, { useState } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { z } from 'zod';
import { MicroLoopSchema } from './types';

type MicroLoop = z.infer<typeof MicroLoopSchema>;

export const MicroLoopView: React.FC<{ loop: MicroLoop; index: number }> = ({ loop, index }) => {
    const [userOutput, setUserOutput] = useState('');
    const [selectedBugLine, setSelectedBugLine] = useState<number | null>(null);
    const [revealed, setRevealed] = useState(false);

    const fc = loop.fast_consolidation;
    const isPredict = fc.type === 'predict_output';
    const isSpotBug = fc.type === 'spot_the_bug';

    const checkAnswer = () => {
        setRevealed(true);
    };

    let isCorrect = false;
    if (revealed) {
        if (isPredict) {
            // strip whitespace for exact match comparison just in case
            isCorrect = userOutput.trim() === (fc.expected_exact_answer || '').trim();
        } else if (isSpotBug) {
            isCorrect = selectedBugLine === fc.bug_line;
        }
    }

    return (
        <div className="bg-gray-800/40 rounded-3xl border border-gray-700/50 shadow-xl overflow-hidden animate-fade-in-up">
            {/* 1. Theory Section */}
            <div className="p-6 md:p-8 bg-gradient-to-br from-gray-800/80 to-gray-900/80 border-b border-gray-700/50">
                <div className="flex items-center gap-3 mb-4">
                    <span className="bg-blue-500/20 text-blue-400 font-black px-3 py-1 rounded-xl text-xs uppercase tracking-widest border border-blue-500/20">
                        Блок {index + 1}
                    </span>
                    <h3 className="text-xl font-bold text-gray-100 flex-1">Теория: {loop.loop_id.replace(/_/g, ' ')}</h3>
                </div>
                <div className="text-gray-300 text-lg leading-relaxed">
                    <MarkdownRenderer content={loop.theory_chunk} />
                </div>
                {loop.syntax_snippet && (
                    <div className="mt-6 bg-gray-950 rounded-xl p-4 border border-gray-800/80 font-mono text-sm text-emerald-400 overflow-x-auto shadow-inner">
                        <pre>{loop.syntax_snippet}</pre>
                    </div>
                )}
            </div>

            {/* 2. Fast Consolidation Task */}
            <div className="p-6 md:p-8 bg-gray-900">
                <h4 className="flex items-center gap-2 text-lg font-bold mb-4 text-violet-300">
                    <span className="text-2xl">{isPredict ? '🧠' : '🐛'}</span>
                    {isPredict ? 'Предскажи вывод (Mental Tracing)' : 'Найди баг (Code Review)'}
                </h4>

                <p className="text-gray-300 mb-6 font-medium text-lg leading-relaxed bg-gray-800/30 p-4 rounded-xl border border-gray-700/50">
                    {fc.question}
                </p>

                {fc.code_block && (
                    <div className="mb-6 rounded-2xl overflow-hidden border border-gray-700/50 shadow-lg">
                        <div className="bg-gray-800 px-4 py-2 border-b border-gray-700/50 flex items-center gap-2">
                            <div className="flex gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-rose-500" /><div className="w-2.5 h-2.5 rounded-full bg-yellow-500" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /></div>
                            <span className="text-xs text-gray-400 font-mono ml-2">task.java</span>
                        </div>
                        {isSpotBug ? (
                            <div className="bg-[#0d1321] p-2 text-sm font-mono text-gray-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                                {fc.code_block.split(/\\r?\\n|\\\\n/).map((line, idx) => {
                                    // Parse line number if it starts with "1. " format
                                    let lineStr = line;
                                    const match = line.match(/^(\\d+)\\.\\s(.*)/);
                                    let lineNum = idx + 1;
                                    if (match) {
                                        lineNum = parseInt(match[1]);
                                        lineStr = match[2];
                                    }

                                    const isSelected = selectedBugLine === lineNum;
                                    const isErrorLine = revealed && fc.bug_line === lineNum;

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => !revealed && setSelectedBugLine(lineNum)}
                                            className={`group flex shrink-0 min-w-max px-4 py-1.5 cursor-pointer rounded-lg transition-all ${!revealed && 'hover:bg-gray-800/60'} ${isSelected && !revealed ? 'bg-amber-900/40 border border-amber-700/50' : 'border border-transparent'} ${isErrorLine ? 'bg-rose-900/40 border border-rose-500/50' : ''}`}
                                        >
                                            <span className="text-gray-600 mr-4 select-none group-hover:text-gray-400">{lineNum}</span>
                                            <span className={`${isErrorLine ? 'text-rose-300' : isSelected && !revealed ? 'text-amber-300' : 'text-gray-300'}`}>{lineStr}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <pre className="bg-[#0d1321] p-6 text-sm font-mono text-violet-300 overflow-x-auto leading-relaxed whitespace-pre-wrap">{fc.code_block}</pre>
                        )}
                    </div>
                )
                }

                {
                    !revealed && (
                        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                            {isPredict ? (
                                <input
                                    type="text"
                                    placeholder="Например: 810"
                                    value={userOutput}
                                    onChange={e => setUserOutput(e.target.value)}
                                    className="flex-1 bg-gray-950 border border-gray-700 text-white rounded-xl px-5 py-3 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all font-mono placeholder:text-gray-600 shadow-inner"
                                />
                            ) : (
                                <div className="flex-1 text-sm text-gray-400 bg-gray-950 px-5 py-3 rounded-xl border border-gray-700 flex items-center justify-between">
                                    {selectedBugLine ? <span>Выбрана строка: <strong className="text-amber-400 font-mono text-lg">{selectedBugLine}</strong></span> : <span>Кликните на строку с ошибкой в коде выше</span>}
                                    {selectedBugLine && <span className="text-xs border border-gray-700 px-2 py-1 rounded bg-gray-800">Изменить кликом</span>}
                                </div>
                            )}
                            <button
                                onClick={checkAnswer}
                                disabled={isPredict ? !userOutput.trim() : !selectedBugLine}
                                className="bg-violet-600 hover:bg-violet-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-violet-900/20 active:scale-95 whitespace-nowrap"
                            >
                                Проверить
                            </button>
                        </div>
                    )
                }

                {
                    revealed && (
                        <div className={`mt-2 p-6 rounded-2xl border shadow-xl animate-fade-in ${isCorrect ? 'bg-emerald-900/20 border-emerald-500/30' : 'bg-rose-900/20 border-rose-500/30'}`}>
                            <div className="flex items-start gap-4">
                                <div className={`text-3xl shrink-0 ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {isCorrect ? '🏆' : '❌'}
                                </div>
                                <div className="flex-1">
                                    <h4 className={`text-xl font-bold block mb-2 ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {isCorrect ? 'Абсолютно верно!' : 'Ой, ошибка!'}
                                    </h4>
                                    {!isCorrect && (
                                        <p className="text-gray-300 leading-relaxed text-base">
                                            {fc.explanation_on_fail || fc.bug_explanation}
                                        </p>
                                    )}
                                    {isCorrect && isSpotBug && fc.bug_explanation && (
                                        <p className="text-emerald-200/80 leading-relaxed text-base mt-2 pt-2 border-t border-emerald-500/20">
                                            {fc.bug_explanation}
                                        </p>
                                    )}
                                    {!isCorrect && isPredict && (
                                        <div className="mt-4 bg-gray-950 border border-rose-900/50 rounded-lg p-3 inline-block font-mono text-sm shadow-inner">
                                            <div className="text-gray-500 mb-1">Ожидаемый вывод:</div>
                                            <div className="text-rose-200">{fc.expected_exact_answer}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {!isCorrect && (
                                <div className="mt-6 flex justify-end">
                                    <button
                                        onClick={() => {
                                            setRevealed(false);
                                            setUserOutput('');
                                            setSelectedBugLine(null);
                                        }}
                                        className="bg-gray-800 hover:bg-gray-700 text-gray-200 font-semibold py-2 px-6 rounded-lg transition-colors border border-gray-600"
                                    >
                                        Попробовать еще раз
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
            </div>
        </div>
    );
};
