import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import JSON5 from 'json5';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve static frontend files from the 'dist' directory
app.use(express.static(path.join(__dirname, 'dist')));

/**
 * Базовая очистка: удаление markdown-обёрток, переносов строк, trailing commas.
 */
function sanitizeLLMJson(raw: string): string {
    let text = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    text = text.replace(/,\s*([}\]])/g, '$1');
    return text;
}

/**
 * Ремонт обрезанного JSON: если LLM не дописал ответ (лимит токенов),
 * пытаемся закрыть все незакрытые строки, массивы и объекты.
 */
function repairTruncatedJson(text: string): string {
    let result = text.trimEnd();

    // Если JSON обрезан, убираем последний неполный элемент
    // (обычно это значение строки, которое не закрыто)

    // Определяем, находимся ли мы внутри строки (нечётное количество неэкранированных кавычек)
    let inString = false;
    let escapeNext = false;
    for (let i = 0; i < result.length; i++) {
        if (escapeNext) { escapeNext = false; continue; }
        if (result[i] === '\\') { escapeNext = true; continue; }
        if (result[i] === '"') { inString = !inString; }
    }

    // Если оборвали внутри строки — закрываем её
    if (inString) {
        result += '"';
    }

    // Убираем последнюю незавершённую key-value пару, если она осталась
    // (например: , "some_key": "partial val" )
    // Находим баланс скобок и закрываем
    const openBraces: string[] = [];
    escapeNext = false;
    inString = false;
    for (let i = 0; i < result.length; i++) {
        if (escapeNext) { escapeNext = false; continue; }
        if (result[i] === '\\') { escapeNext = true; continue; }
        if (result[i] === '"') { inString = !inString; continue; }
        if (inString) continue;

        if (result[i] === '{') openBraces.push('}');
        else if (result[i] === '[') openBraces.push(']');
        else if (result[i] === '}' || result[i] === ']') openBraces.pop();
    }

    // Закрываем все незакрытые скобки
    while (openBraces.length > 0) {
        result += openBraces.pop();
    }

    return result;
}

/**
 * Итеративный ремонт JSON.
 * Шаг 1: Однократная починка обрезанного JSON (закрытие строк/скобок + откат до последнего полного узла)
 * Шаг 2: Итеративный ремонт неэкранированных кавычек (до 50 попыток)
 */
function repairAndParse(text: string): any {
    let current = text;

    // Шаг 1: Починка обрезки — выполняется ОДИН РАЗ
    try {
        return JSON5.parse(current);
    } catch (firstError: any) {
        const msg = firstError.message || '';
        if (msg.includes('end of input') || msg.includes('unexpected end')) {
            console.log('[Backend] 🔧 Detected truncated JSON, attempting aggressive repair...');

            // Стратегия: откатываемся до последнего полного объекта в roadmap_nodes
            // Ищем последнее вхождение },{ или }] и обрезаем там
            const lastCompleteNode = current.lastIndexOf('},{');
            if (lastCompleteNode > 0) {
                // If we found a comma separating nodes, we chop off the incomplete node
                // and close the array and root object.
                current = current.substring(0, lastCompleteNode + 1) + ']}';
            } else {
                // Fallback: обычный ремонт обрезки
                current = repairTruncatedJson(current);
                // Убираем trailing commas снова
                current = current.replace(/,\s*([}\]])/g, '$1');
            }
        }
    }

    // Шаг 2: Итеративный ремонт кавычек (максимум 50 попыток)
    for (let attempt = 0; attempt < 50; attempt++) {
        try {
            return JSON5.parse(current);
        } catch (e: any) {
            const msg = e.message || '';

            // Если снова "end of input" => пробуем более агрессивную обрезку
            if (msg.includes('end of input') || msg.includes('unexpected end')) {
                // Откатываемся: убираем последний незавершённый элемент массива
                const lastGoodComma = current.lastIndexOf('},{');
                if (lastGoodComma > 0) {
                    current = current.substring(0, lastGoodComma + 1);
                    // Закрываем все скобки
                    current = repairTruncatedJson(current);
                    current = current.replace(/,\s*([}\]])/g, '$1');
                    continue;
                }
                throw e;
            }

            // Ремонт неэкранированных кавычек
            const match = msg.match(/at (\\d+):(\\d+)/);
            if (!match) throw e;

            const errorCol = parseInt(match[2]) - 1;
            if (errorCol <= 0 || errorCol >= current.length) throw e;

            let quotePos = errorCol - 1;
            while (quotePos > 0 && current[quotePos] !== '"') {
                quotePos--;
            }

            if (quotePos <= 0 || current[quotePos] !== '"') throw e;
            if (quotePos > 0 && current[quotePos - 1] === '\\') throw e;

            current = current.substring(0, quotePos) + '\\"' + current.substring(quotePos + 1);

            if (attempt > 0 && attempt % 10 === 0) {
                console.log(`[Backend] 🔧 Quote repair: ${attempt} fixes applied...`);
            }
        }
    }

    throw new Error('Не удалось починить JSON после 50 попыток');
}

app.post('/api/llm/generate', async (req, res) => {
    try {
        const { prompt, topic } = req.body;

        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured in .env' });
        }

        console.log(`[Backend] Generating roadmap for topic: ${topic} via OpenRouter...`);

        const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                "model": "openai/gpt-4o-mini",
                "messages": [
                    { "role": "system", "content": prompt },
                    { "role": "user", "content": `Сгенерируй учебный трек для: ${topic}` }
                ],
                "response_format": { "type": "json_object" },
                "max_tokens": 16000,
                "provider": {
                    "ignore": ["Google AI Studio"],
                    "allow_fallbacks": true
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        let aiContent = data.choices?.[0]?.message?.content || "{}";
        const finishReason = data.choices?.[0]?.finish_reason || 'unknown';

        console.log(`[Backend] Raw LLM response length: ${aiContent.length} chars, finish_reason: ${finishReason}`);

        // Шаг 1: Базовая очистка
        const sanitized = sanitizeLLMJson(aiContent);

        // Шаг 2: Итеративный ремонт (кавычки + обрезка)
        try {
            const parsedJson = repairAndParse(sanitized);

            // Фильтруем неполные узлы (обрезанные из-за лимита токенов)
            if (parsedJson.roadmap_nodes && Array.isArray(parsedJson.roadmap_nodes)) {
                parsedJson.roadmap_nodes = parsedJson.roadmap_nodes.filter((node: any) =>
                    node && node.title && node.detailed_theory
                );

                // Sanitize quiz questions in each node
                for (const node of parsedJson.roadmap_nodes) {
                    if (node.active_recall_questions && Array.isArray(node.active_recall_questions)) {
                        node.active_recall_questions = node.active_recall_questions.filter((q: any) => {
                            if (!q || !q.question) return false;

                            // Fix options: if string, try to split or wrap in array
                            if (typeof q.options === 'string') {
                                q.options = q.options.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
                            }
                            if (!Array.isArray(q.options) || q.options.length < 2) return false;

                            // Ensure correct_answer exists
                            if (!q.correct_answer) q.correct_answer = q.options[0] || '';

                            return true;
                        });
                    }

                    // Sanitize practice fields
                    if (node.practice_requirements && !Array.isArray(node.practice_requirements)) {
                        node.practice_requirements = [];
                    }
                    if (node.practice_hints && !Array.isArray(node.practice_hints)) {
                        node.practice_hints = [];
                    }
                }
            }

            const nodeCount = parsedJson.roadmap_nodes?.length || 0;
            console.log(`[Backend] ✅ JSON parsed successfully. Complete nodes: ${nodeCount}`);
            return res.json(parsedJson);
        } catch (parseError: any) {
            console.error('[Backend] ❌ All repair attempts failed:', parseError.message);
            throw new Error('LLM вернул невалидный JSON');
        }

    } catch (error: any) {
        console.error('[Backend] API Error:', error.message || error);
        res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
    }
});

// Catch-all route for React Router (must be AFTER API routes)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
    console.log(`🚀 API сервер запущен на http://localhost:${PORT}`);
});
