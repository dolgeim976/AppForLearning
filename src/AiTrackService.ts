import { TrackRoadmapSchema, TrackRoadmap } from './types';

export class AiTrackService {
    static async generateTrack(userTopic: string): Promise<TrackRoadmap> {
        try {
            const response = await fetch('/api/llm/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                // Backend parses the prompt internally via agentic workflow now
                body: JSON.stringify({ topic: userTopic })
            });

            const data = await response.json();

            // Если бэк вернул ошибку, пробрасываем её
            if (!response.ok) {
                throw new Error(data.error || 'Server error');
            }

            // Если Zod падает, ловим и выводим детально, чего не хватает
            const parsedData = TrackRoadmapSchema.safeParse(data);
            if (!parsedData.success) {
                const errorMsg = parsedData.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
                console.error('Zod Validation Failed:', errorMsg, 'Raw Data:', data);
                throw new Error(`Неверный формат от ИИ: ${errorMsg}`);
            }

            return parsedData.data;
        } catch (error: any) {
            console.error('Generate Track Error:', error);
            throw new Error(error.message || 'LLM Error / Invalid JSON Validation');
        }
    }
}
