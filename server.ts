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

function getSingleNodePrompt(topic: string): string {
    return `You are a Senior EdTech Professor and Expert in Cognitive Psychology. You are generating a highly structured, comprehensive learning module for the topic "${topic}".
ALL TEXT CONTENT MUST BE STRICTLY IN RUSSIAN.
IMPORTANT: Do NOT translate the enum values for "type" or JSON keys.
Return ONLY a valid JSON object matching this EXACT structure. Use rich Markdown in text fields where appropriate. Do NOT wrap the output in markdown backticks. Return raw JSON.

{
  "title": "Название темы на русском",
  "day": 1,
  "topic": "Название темы",
  "narrative_hook": {
    "title": "Зачем это нужно?",
    "analogy": "Простая аналогия из реальной жизни на русском языке."
  },
  "micro_loops": [
    {
      "loop_id": "Отслеживание состояния",
      "theory_chunk": "Объяснение концепта без лишней воды (2-3 абзаца).",
      "syntax_snippet": "A concise code snippet illustrating the concept",
      "fast_consolidation": {
        "type": "state_tracing",
        "question": "Отследите состояние объекта. Что будет лежать внутри переменной после выполнения 3-й строки?",
        "code_block": "1. int a = 5;\\n2. a += 2;\\n3. a++;",
        "expected_exact_answer": "8",
        "explanation_on_fail": "На строке 2 a становится 7, на строке 3 увеличивается до 8."
      }
    },
    {
      "loop_id": "Активное извлечение",
      "theory_chunk": "Explanation of the next concept.",
      "syntax_snippet": "Target code",
      "fast_consolidation": {
        "type": "fill_in_the_blank",
        "question": "Впишите пропущенный метод.",
        "code_block": "StringBuilder query = new StringBuilder(\"SELECT \");\\nquery.____(\"*\");",
        "expected_exact_answer": "append",
        "explanation_on_fail": "Метод, добавляющий строку в конец StringBuilder'а, называется append."
      }
    },
    {
      "loop_id": "Поиск концептуальной дыры",
      "theory_chunk": "Explanation of an anti-pattern or logic error.",
      "syntax_snippet": "Target code with bad logic",
      "fast_consolidation": {
        "type": "logic_spotter",
        "question": "Код работает, но он медленный/небезопасный. Кликните на строку, которая является 'узким горлышком'.",
        "code_block": "1. String s = \"\";\\n2. for(int i=0; i<100; i++) {\\n3.   s = s + i;\\n4. }",
        "bug_line": 3,
        "bug_explanation": "Внутри цикла оператор '+' создает новые объекты String, что убивает производительность."
      }
    }
  ],
  "practice_task": {
    "title": "Практическая задача",
    "mission": "Описание задачи. Что нужно сделать студенту написать код или исправить.",
    "starter_code": "Начальный код для студента (может быть с комментариями TODO).",
    "solution_code": "Правильное решение",
    "explanation": "Объяснение решения"
  },
  "final_boss_practice": {
    "type": "parsons_problem",
    "mission": "Write a mission description here for assembling the final solution.",
    "correct_sequence": [
      "Code line 1",
      "Code line 2",
      "Code line 3"
    ],
    "distractors": [
      "Distractor code line 1",
      "Distractor code line 2"
    ]
  }
}

Include 3 to 6 micro_loops in the array, making sure there is a good mix of 'predict_output' and 'spot_the_bug'. Cover the entire topic comprehensively in this single JSON response.`;
}

async function callOpenRouter(messages: any[], model: string = "openai/gpt-4o-mini"): Promise<string> {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            "model": model,
            "messages": messages,
            "max_tokens": 8000,
            "temperature": 0.4
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "{}";
}

app.post('/api/llm/generate', async (req, res) => {
    try {
        const { topic } = req.body;

        if (!process.env.OPENROUTER_API_KEY) {
            return res.status(500).json({ error: 'OPENROUTER_API_KEY is not configured in .env' });
        }

        console.log(`[Backend] 🚀 Starting Single-Node generation for topic: ${topic}`);

        const prompt = getSingleNodePrompt(topic);
        const messages = [
            { "role": "system", "content": prompt },
            { "role": "user", "content": `Generate a comprehensive curriculum module for: ${topic}` }
        ];

        let nodeContent = await callOpenRouter(messages, "openai/gpt-4o-mini");
        nodeContent = sanitizeLLMJson(nodeContent);
        let parsedNode = repairAndParse(nodeContent);

        // Ensure arrays exist
        parsedNode.day = 1;
        if (!Array.isArray(parsedNode.micro_loops)) parsedNode.micro_loops = [];

        // Assembly
        const finalJson = {
            topic: topic,
            roadmap_nodes: [parsedNode]
        };

        console.log(`[Backend] ✅ Generation complete for ${topic}`);
        return res.json(finalJson);

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
