import React, { useState } from 'react';
import { SRSEngine, SRSCard, ReviewQuality } from './SRSEngine';

interface ReviewSessionProps {
    srsEngine: SRSEngine;
    onClose: () => void;
}

export const ReviewSession: React.FC<ReviewSessionProps> = ({ srsEngine, onClose }) => {
    const [dueCards] = useState<SRSCard[]>(() => srsEngine.getDueCards());
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [sessionResults, setSessionResults] = useState<{ correct: number; incorrect: number }>({ correct: 0, incorrect: 0 });
    const [sessionComplete, setSessionComplete] = useState(false);

    const currentCard = dueCards[currentIndex];
    const progress = dueCards.length > 0 ? ((currentIndex) / dueCards.length) * 100 : 0;

    const handleAnswer = () => {
        if (!selectedAnswer || !currentCard) return;

        const isCorrect = selectedAnswer === currentCard.correct_answer;
        const quality: ReviewQuality = isCorrect ? 4 : 1;

        srsEngine.reviewCard(currentCard.id, quality);

        setShowResult(true);
        setSessionResults(prev => ({
            correct: prev.correct + (isCorrect ? 1 : 0),
            incorrect: prev.incorrect + (isCorrect ? 0 : 1)
        }));
    };

    const handleNext = () => {
        if (currentIndex + 1 >= dueCards.length) {
            setSessionComplete(true);
        } else {
            setCurrentIndex(prev => prev + 1);
            setSelectedAnswer(null);
            setShowResult(false);
        }
    };

    // Session complete screen
    if (sessionComplete || dueCards.length === 0) {
        const stats = srsEngine.getStats();
        const accuracy = sessionResults.correct + sessionResults.incorrect > 0
            ? Math.round((sessionResults.correct / (sessionResults.correct + sessionResults.incorrect)) * 100)
            : 0;

        const handleReset = () => {
            if (window.confirm('Вы уверены, что хотите сбросить весь прогресс повторений? Это действие нельзя отменить.')) {
                srsEngine.clearAll();
                onClose();
            }
        };

        return (
            <div className="h-full flex flex-col items-center justify-center p-8 animate-in fade-in duration-500">
                <div className="max-w-md w-full text-center">
                    <div className="text-6xl mb-6">{dueCards.length === 0 ? '🎉' : accuracy >= 70 ? '🏆' : '💪'}</div>
                    <h2 className="text-3xl font-extrabold text-white mb-3">
                        {dueCards.length === 0 ? 'Нет карточек для повторения!' : 'Сессия завершена!'}
                    </h2>

                    {stats.total > 0 && (
                        <>
                            {dueCards.length > 0 && (
                                <>
                                    <p className="text-gray-400 mb-8">Отличная работа! Вот ваши результаты:</p>

                                    <div className="grid grid-cols-3 gap-4 mb-8">
                                        <div className="bg-emerald-900/30 rounded-2xl p-4 border border-emerald-700/30">
                                            <div className="text-2xl font-bold text-emerald-400">{sessionResults.correct}</div>
                                            <div className="text-xs text-emerald-500 mt-1">Правильно</div>
                                        </div>
                                        <div className="bg-rose-900/30 rounded-2xl p-4 border border-rose-700/30">
                                            <div className="text-2xl font-bold text-rose-400">{sessionResults.incorrect}</div>
                                            <div className="text-xs text-rose-500 mt-1">Неправильно</div>
                                        </div>
                                        <div className="bg-blue-900/30 rounded-2xl p-4 border border-blue-700/30">
                                            <div className="text-2xl font-bold text-blue-400">{accuracy}%</div>
                                            <div className="text-xs text-blue-500 mt-1">Точность</div>
                                        </div>
                                    </div>
                                </>
                            )}

                            <div className="bg-gray-800/50 rounded-xl p-4 mb-8 text-sm text-gray-400 flex flex-col gap-2">
                                <div>
                                    📊 Всего карточек: {stats.total} • Освоено: {stats.mastered} • На изучении: {stats.learning}
                                </div>
                                <button
                                    onClick={handleReset}
                                    className="text-rose-400 hover:text-rose-300 transition-colors mt-2 underline decoration-rose-500/30 underline-offset-4"
                                >
                                    Сбросить весь прогресс повторений
                                </button>
                            </div>
                        </>
                    )}

                    <button
                        onClick={onClose}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg"
                    >
                        Вернуться
                    </button>
                </div>
            </div>
        );
    }

    // Type config
    const typeConfig: Record<string, { icon: string; label: string; color: string }> = {
        multiple_choice: { icon: '📝', label: 'Теория', color: 'blue' },
        predict_output: { icon: '🖥️', label: 'Предскажи вывод', color: 'violet' },
        spot_bug: { icon: '🐛', label: 'Найди баг', color: 'amber' }
    };
    const tc = typeConfig[currentCard.type] || typeConfig.multiple_choice;

    return (
        <div className="h-full flex flex-col bg-[#0b1120]">
            {/* Header */}
            <div className="px-8 pt-6 pb-4 border-b border-gray-800 bg-gray-950">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">🔁</span>
                        <h2 className="text-xl font-bold text-white">Повторение (SRS)</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-400">{currentIndex + 1} / {dueCards.length}</span>
                        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-sm">
                            ✕ Закрыть
                        </button>
                    </div>
                </div>
                {/* Progress bar */}
                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                    <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </div>

            {/* Card */}
            <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
                <div className="max-w-2xl w-full">
                    {/* Topic breadcrumb */}
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                        <span>{currentCard.trackTopic}</span>
                        <span>›</span>
                        <span>{currentCard.nodeTitle}</span>
                    </div>

                    {/* Question card */}
                    <div className={`bg-gray-800/50 rounded-3xl p-8 border transition-all shadow-xl ${showResult
                        ? selectedAnswer === currentCard.correct_answer
                            ? 'border-emerald-500/50 bg-emerald-900/10'
                            : 'border-rose-500/50 bg-rose-900/10'
                        : 'border-gray-700'
                        }`}>
                        {/* Type badge */}
                        <span className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full mb-4 bg-${tc.color}-500/20 text-${tc.color}-300 border border-${tc.color}-500/30`}>
                            {tc.icon} {tc.label}
                        </span>

                        <h3 className="text-xl text-gray-200 leading-relaxed font-bold mb-6">{currentCard.question}</h3>

                        {/* Code snippet */}
                        {currentCard.code_snippet && (
                            <pre className="bg-gray-950 p-5 rounded-2xl text-sm font-mono text-gray-300 overflow-x-auto leading-relaxed whitespace-pre-wrap mb-6 border border-gray-700">
                                {currentCard.code_snippet}
                            </pre>
                        )}

                        {/* Options */}
                        <div className="space-y-3">
                            {currentCard.options.map((opt, idx) => {
                                const isSelected = selectedAnswer === opt;
                                const isCorrectOption = showResult && opt === currentCard.correct_answer;
                                const isWrongSelected = showResult && isSelected && opt !== currentCard.correct_answer;

                                return (
                                    <label key={idx} className={`flex items-start gap-4 p-4 rounded-xl cursor-pointer border transition-all
                                        ${isSelected && !showResult ? 'border-blue-500/50 bg-blue-500/10' : 'border-gray-700 bg-gray-900 hover:border-gray-600'}
                                        ${showResult ? 'cursor-default' : ''}
                                        ${isCorrectOption ? 'border-emerald-500 bg-emerald-500/20' : ''}
                                        ${isWrongSelected ? 'border-rose-500 bg-rose-500/20 opacity-70' : ''}
                                    `}>
                                        <input
                                            type="radio"
                                            name="srs-answer"
                                            value={opt}
                                            checked={isSelected}
                                            disabled={showResult}
                                            onChange={() => setSelectedAnswer(opt)}
                                            className="mt-1 w-5 h-5 accent-blue-500"
                                        />
                                        <span className={`text-base leading-snug ${isCorrectOption ? 'text-emerald-300 font-medium' :
                                            isWrongSelected ? 'text-rose-300' :
                                                currentCard.type === 'predict_output' ? 'font-mono text-gray-300' : 'text-gray-300'
                                            }`}>
                                            {opt}
                                        </span>
                                    </label>
                                );
                            })}
                        </div>

                        {/* Action buttons */}
                        <div className="mt-8 flex justify-end">
                            {!showResult ? (
                                <button
                                    onClick={handleAnswer}
                                    disabled={!selectedAnswer}
                                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg"
                                >
                                    Проверить
                                </button>
                            ) : (
                                <button
                                    onClick={handleNext}
                                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg"
                                >
                                    {currentIndex + 1 >= dueCards.length ? 'Завершить' : 'Следующая →'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
