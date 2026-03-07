import { useState, useEffect } from 'react';
import { LearningDashboard } from './LearningDashboard';
import { AiTrackService } from './AiTrackService';
import { TrackRoadmap } from './types';
import { BookOpen, Sparkles, Loader2, Plus, Trash2, Library, ChevronLeft, ChevronRight } from 'lucide-react';

function App() {
    const [tracks, setTracks] = useState<TrackRoadmap[]>([]);
    const [activeTrackId, setActiveTrackId] = useState<string | null>(null);

    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        const savedTracks = localStorage.getItem('ai_learning_tracks');
        if (savedTracks) {
            try {
                const parsed = JSON.parse(savedTracks);
                setTracks(parsed);
                if (parsed.length > 0) {
                    setActiveTrackId(parsed[0].id);
                }
            } catch (e) {
                console.error('Failed to parse saved tracks', e);
            }
        }
    }, []);

    useEffect(() => {
        localStorage.setItem('ai_learning_tracks', JSON.stringify(tracks));
    }, [tracks]);

    const handleGenerate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!topic.trim()) return;

        setLoading(true);
        setError('');

        try {
            // Истинный вызов (Убедитесь, что добавлен ключ в .env):
            const generatedTrack = await AiTrackService.generateTrack(topic);
            const newTrack = { ...generatedTrack, id: crypto.randomUUID() };

            setTracks(prev => [newTrack, ...prev]);
            setActiveTrackId(newTrack.id);
            setTopic('');
        } catch (err: any) {
            setError(err.message || 'Ошибка генерации трека');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteTrack = (id: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Предотвращаем клик по треку
        const newTracks = tracks.filter(t => t.id !== id);
        setTracks(newTracks);

        // Если удаляем активный трек, переключаемся на пустой экран
        if (activeTrackId === id) {
            setActiveTrackId(null);
        }
    };

    const activeTrack = tracks.find(t => t.id === activeTrackId);

    return (
        <div className="flex h-[100dvh] w-full bg-[#0b1120] text-white font-sans overflow-hidden min-w-0">

            {/* Мобильная подложка (Overlay) для закрытия сайдбара по клику вне его */}
            {!sidebarCollapsed && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setSidebarCollapsed(true)}
                />
            )}

            {/* ШАГ 1: Левый сайдбар со списком всех треков */}
            <div className={`
                ${sidebarCollapsed ? '-translate-x-full md:translate-x-0 w-0 md:w-14 shrink-0' : 'translate-x-0 w-72 md:w-64 shrink-0'} 
                absolute md:static inset-y-0 left-0 
                h-full border-r border-gray-800 bg-gray-950 flex flex-col z-50 shadow-2xl transition-all duration-300
            `}>
                <div className="p-3 border-b border-gray-800 flex items-center justify-between">
                    {!sidebarCollapsed && (
                        <div className="flex items-center gap-3 pl-2">
                            <Library className="w-5 h-5 text-blue-500" />
                            <h2 className="font-bold text-base tracking-wide text-gray-200">Мои Треки</h2>
                        </div>
                    )}
                    <button
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className={`p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors ${sidebarCollapsed ? 'mx-auto hidden md:block' : ''}`}
                        title={sidebarCollapsed ? 'Развернуть' : 'Свернуть'}
                    >
                        {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                    </button>
                </div>

                {!sidebarCollapsed && (
                    <>
                        <div className="flex-1 overflow-y-auto p-3 space-y-2">
                            {tracks.length === 0 ? (
                                <div className="text-center p-4 text-gray-500 text-sm italic mt-10">
                                    У вас пока нет сохраненных треков. Создайте новый!
                                </div>
                            ) : (
                                tracks.map(track => (
                                    <div
                                        key={track.id}
                                        onClick={() => { setActiveTrackId(track.id || null); setSidebarCollapsed(true); }}
                                        className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border group
                                            ${activeTrackId === track.id ? 'bg-blue-600/10 border-blue-500/50 text-blue-400' : 'bg-transparent border-transparent text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
                                    >
                                        <span className="truncate font-medium text-sm pr-2">{track.topic}</span>
                                        <button
                                            onClick={(e) => handleDeleteTrack(track.id!, e)}
                                            className={`p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 md:group-hover:opacity-100 ${activeTrackId === track.id ? 'opacity-100' : 'opacity-100 md:opacity-0'}`}
                                            title="Удалить трек"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-800 space-y-2">

                            <button
                                onClick={() => { setActiveTrackId(null); setSidebarCollapsed(true); }}
                                className={`w-full py-3 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg
                                    ${!activeTrackId ? 'bg-blue-600 text-white shadow-blue-500/20' : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                            >
                                <Plus className="w-5 h-5" />
                                Новый Трек
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* Мобильная кнопка Гамбургер (чтобы открыть меню, когда оно скрыто) */}
            {sidebarCollapsed && (
                <button
                    onClick={() => setSidebarCollapsed(false)}
                    className="md:hidden absolute top-4 left-4 z-30 p-2.5 bg-gray-900/90 backdrop-blur text-white rounded-xl shadow-[0_0_15px_rgba(0,0,0,0.5)] border border-gray-700"
                >
                    <Library className="w-5 h-5" />
                </button>
            )}

            {/* ШАГ 2: Основная контентная часть */}
            <div className="flex-1 h-full relative">
                {activeTrack ? (
                    <LearningDashboard key={activeTrack.id} topic={activeTrack.topic} nodes={activeTrack.roadmap_nodes} />
                ) : (
                    // Инпут для создания нового топика
                    <div className="h-[100dvh] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500 overflow-y-auto">
                        <div className="max-w-xl w-full pt-12 md:pt-0">
                            <div className="flex justify-center mb-6">
                                <BookOpen className="w-16 h-16 text-blue-500 animate-pulse" />
                            </div>

                            <h1 className="text-4xl md:text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                                AI Learning Center
                            </h1>

                            <p className="text-gray-400 mb-10 text-base md:text-lg">
                                Введите любую тему (например, Garbage Collector in Java, Docker & K8s, Git Flow).
                            </p>

                            <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="text"
                                    placeholder="Docker Basics, React Hooks..."
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    disabled={loading}
                                    autoFocus
                                    className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-5 py-4 text-base md:text-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white placeholder-gray-600 shadow-inner"
                                />
                                <button
                                    type="submit"
                                    disabled={loading || !topic.trim()}
                                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold rounded-xl py-4 sm:py-0 px-8 flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                                >
                                    {loading ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <>
                                            <Sparkles className="w-5 h-5" />
                                            Создать
                                        </>
                                    )}
                                </button>
                            </form>

                            {error && (
                                <div className="mt-4 text-red-400 bg-red-400/10 p-4 rounded-xl border border-red-500/20 text-left flex items-start gap-3">
                                    <span className="text-xl">❗</span>
                                    <span>{error}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
