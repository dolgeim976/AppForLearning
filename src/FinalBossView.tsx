import React, { useState, useEffect, useMemo } from 'react';
import { z } from 'zod';
import { FinalBossPracticeSchema } from './types';
import { MarkdownRenderer } from './MarkdownRenderer';

type FinalBoss = z.infer<typeof FinalBossPracticeSchema>;

// Fisher-Yates shuffle
function shuffle(array: string[]) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export const FinalBossView: React.FC<{ boss: FinalBoss }> = ({ boss }) => {
    // Combine correct sequence and distractors and shuffle them once
    const initialAvailable = useMemo(() => {
        return shuffle([...boss.correct_sequence, ...boss.distractors]);
    }, [boss.correct_sequence, boss.distractors]);

    const [availableBlocks, setAvailableBlocks] = useState<string[]>(initialAvailable);
    const [solutionBlocks, setSolutionBlocks] = useState<string[]>([]);
    const [revealed, setRevealed] = useState(false);

    // Reset state if boss object changes completely (e.g. switching track nodes)
    useEffect(() => {
        setAvailableBlocks(shuffle([...boss.correct_sequence, ...boss.distractors]));
        setSolutionBlocks([]);
        setRevealed(false);
    }, [boss]);

    const handleSelectBlock = (block: string) => {
        if (revealed) return;
        setAvailableBlocks(prev => prev.filter(b => b !== block));
        setSolutionBlocks(prev => [...prev, block]);
    };

    const handleRemoveBlock = (block: string) => {
        if (revealed) return;
        setSolutionBlocks(prev => prev.filter(b => b !== block));
        setAvailableBlocks(prev => [...prev, block]);
    };

    const handleCheck = () => {
        setRevealed(true);
    };

    let isCorrect = false;
    if (revealed) {
        // Must have the exact same length and elements in the exact same order
        isCorrect = solutionBlocks.length === boss.correct_sequence.length &&
            solutionBlocks.every((block, idx) => block === boss.correct_sequence[idx]);
    }

    return (
        <div className="bg-gray-800/60 rounded-3xl border border-gray-700/50 shadow-xl overflow-hidden animate-fade-in-up">
            <div className="p-6 md:p-8 bg-gradient-to-br from-indigo-900/40 to-blue-900/40 border-b border-indigo-700/30">
                <div className="flex items-center gap-3 mb-4">
                    <span className="bg-rose-500/20 text-rose-400 font-black px-3 py-1 rounded-xl text-xs uppercase tracking-widest border border-rose-500/20">
                        Финальный Босс
                    </span>
                    <h3 className="text-xl font-bold text-gray-100 flex-1">Parsons Problem</h3>
                </div>
                <div className="text-gray-300 text-lg leading-relaxed">
                    <MarkdownRenderer content={boss.mission} />
                </div>
                <p className="mt-4 text-emerald-400 font-medium text-sm flex items-center gap-2 bg-emerald-900/20 px-4 py-2 rounded-lg border border-emerald-500/20 w-fit">
                    <span>🖱️</span> Кликай по блокам, чтобы составить правильный код в зоне ответа.
                </p>
            </div>

            <div className="p-6 md:p-8 bg-[#0d1321] flex flex-col md:flex-row gap-8">
                {/* Available Blocks Column */}
                <div className="flex-1">
                    <h4 className="text-gray-400 font-bold mb-4 flex items-center gap-2">
                        <span>📦</span> Доступные блоки
                    </h4>
                    <div className="flex flex-col gap-3 min-h-[200px] p-4 bg-gray-900/50 rounded-2xl border border-gray-800 border-dashed">
                        {availableBlocks.length === 0 && (
                            <div className="text-center text-gray-600 my-auto text-sm">Нет доступных блоков</div>
                        )}
                        {availableBlocks.map((block, idx) => (
                            <button
                                key={idx}
                                disabled={revealed}
                                onClick={() => handleSelectBlock(block)}
                                className="text-left bg-gray-800 hover:bg-gray-700 hover:scale-[1.01] active:scale-95 text-gray-200 font-mono text-sm p-4 rounded-xl shadow-md border border-gray-600 transition-all cursor-pointer whitespace-pre-wrap leading-relaxed"
                            >
                                {block}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Solution Area */}
                <div className="flex-1">
                    <h4 className="text-gray-400 font-bold mb-4 flex items-center gap-2">
                        <span>📋</span> Твое решение
                        <span className="ml-auto text-xs bg-gray-800 px-2 py-1 rounded text-gray-500">{solutionBlocks.length} строк</span>
                    </h4>
                    <div className="flex flex-col gap-2 min-h-[300px] p-4 bg-gray-950 rounded-2xl border border-gray-800 shadow-inner">
                        {solutionBlocks.length === 0 && (
                            <div className="text-center text-gray-600 my-auto text-sm">
                                Кликни на блоки слева (или сверху), чтобы добавить их сюда
                            </div>
                        )}
                        {solutionBlocks.map((block, idx) => {
                            // If revealed and wrong, visually show the first mistake
                            const isMistake = revealed && block !== boss.correct_sequence[idx];

                            return (
                                <button
                                    key={idx}
                                    disabled={revealed}
                                    onClick={() => handleRemoveBlock(block)}
                                    className={`text-left text-sm font-mono p-4 rounded-xl shadow-sm border transition-all cursor-pointer whitespace-pre-wrap leading-relaxed flex items-start gap-4 ${revealed
                                            ? (isMistake ? 'bg-rose-900/40 border-rose-500/50 text-rose-300' : 'bg-emerald-900/40 border-emerald-500/50 text-emerald-300')
                                            : 'bg-indigo-900/30 hover:bg-rose-900/30 border-indigo-700/50 hover:border-rose-700/50 text-indigo-100 group'
                                        }`}
                                >
                                    <span className="text-gray-600 select-none mr-2">{idx + 1}</span>
                                    <span className="flex-1">{block}</span>
                                    {!revealed && <span className="text-rose-400 opacity-0 group-hover:opacity-100 text-xs shrink-0 transition-opacity">✖ Убрать</span>}
                                </button>
                            );
                        })}

                        {/* Extra missing lines placeholder if revealed and too short */}
                        {revealed && !isCorrect && solutionBlocks.length < boss.correct_sequence.length && (
                            <div className="text-left text-sm font-mono p-4 rounded-xl border border-dashed border-rose-700/50 bg-rose-900/10 text-rose-400/50 mt-2">
                                + Пропущено еще {boss.correct_sequence.length - solutionBlocks.length} строк кода...
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="p-6 md:p-8 bg-gray-900 border-t border-gray-800/50 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="text-gray-400 text-sm max-w-lg">
                    {revealed ? (
                        isCorrect ? (
                            <span className="text-emerald-400 flex items-center gap-2"><span className="text-2xl">🏆</span> Решение абсолютно верное! Отличная работа.</span>
                        ) : (
                            <span className="text-rose-400 flex items-center gap-2"><span className="text-2xl">❌</span> Порядок строк неверный. Посмотри, какие строки выделены красным.</span>
                        )
                    ) : (
                        "Убедись, что решение содержит только нужные строки в правильном порядке. Лишние блоки (дистракторы) использовать не нужно."
                    )}
                </div>

                {!revealed ? (
                    <button
                        onClick={handleCheck}
                        disabled={solutionBlocks.length === 0}
                        className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg active:scale-95"
                    >
                        Запустить код
                    </button>
                ) : (
                    <button
                        onClick={() => {
                            setRevealed(false);
                            setAvailableBlocks(shuffle([...boss.correct_sequence, ...boss.distractors]));
                            setSolutionBlocks([]);
                        }}
                        className="w-full md:w-auto bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-8 rounded-xl transition-all active:scale-95"
                    >
                        Сбросить и попробовать снова
                    </button>
                )}
            </div>

            {
                revealed && !isCorrect && (
                    <details className="mt-4 p-6 bg-gray-950 border-t border-gray-800 group">
                        <summary className="cursor-pointer text-gray-500 hover:text-gray-300 font-medium select-none flex items-center gap-2">
                            <span className="text-xs group-open:rotate-90 transition-transform">▶</span> Показать правильное решение
                        </summary>
                        <div className="mt-4 flex flex-col gap-2 p-4 bg-gray-900 rounded-xl border border-gray-800">
                            {boss.correct_sequence.map((b, i) => (
                                <div key={i} className="font-mono text-sm text-gray-400">
                                    <span className="text-gray-600 select-none mr-4">{i + 1}</span>
                                    {b}
                                </div>
                            ))}
                        </div>
                    </details>
                )
            }
        </div >
    );
};
