import { TrackRoadmapSchema, TrackRoadmap } from './types';

export const SYSTEM_PROMPT = `
Ты — AI-методист уровня Senior. Сгенерируй учебный трек по теме "{user_topic}" в строгом формате JSON.
Не добавляй никаких дополнительных комментариев до или после JSON.

Структура JSON должна содержать:
{
  "topic": "{user_topic}",
  "roadmap_nodes": [ // массив узлов для построения визуального графа. Каждый узел — 1 день.
    {
       "id": "node_id",
       "title": "Название темы дня",
       "day": 1,
       "theory_summary": "Сжатая выжимка теории (без воды).",
       "worked_example": "Подробный разбор примера кода или концепции (для снижения когнитивной нагрузки).",
       "practice_task": "Небольтельное задание для решения во встроенном редакторе (условие и начальный код).",
       "active_recall_questions": [
          "Вопрос 1?", "Вопрос 2?", "Вопрос 3?"
       ],
       "micro_project": "Описание шага сквозного проекта для текущего узла. Должно встраиваться в общий проект темы.",
       "interleaving_tasks": "Задания, требующие смешивания текущей темы с базовыми, уже пройденными концепциями (разнесенное повторение/interleaving)."
    }
  ]
}
`;

export class AiTrackService {
    /**
     * Запрашивает генерацию трека у LLM
     */
    static async generateTrack(userTopic: string): Promise<TrackRoadmap> {
        const prompt = SYSTEM_PROMPT.replace(/\{user_topic\}/g, userTopic);

        try {
            // Пример вызова вашего LLM провайдера (OpenAI, Anthropic и т.д.)
            const response = await fetch('/api/llm/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt, topic: userTopic })
            });

            const data = await response.json();

            // Строгая валидация JSON схемы через Zod гарантирует структуру для UI
            const validatedData = TrackRoadmapSchema.parse(data);

            return validatedData;
        } catch (error) {
            console.error('Ошибка генерации трека или неверный формат JSON', error);
            throw new Error('LLM вернул некорректно структурированный ответ');
        }
    }
}
