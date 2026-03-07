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

const OUTLINE_PROMPT = `You are an expert Technical Curriculum Designer.
Your task is to break down the provided topic into a list of 1 to 4 core sequential subtopics that form a complete learning path. 
For simple or narrow topics, use only 1 or 2 subtopics to avoid repetition.
ALL GENERATED TEXT MUST BE WRITTEN IN RUSSIAN.
Return ONLY a valid JSON object with the following structure:
{
    "topic": "The confirmed topic name (in Russian)",
    "subtopics": ["Subtopic 1 (in Russian)", "Subtopic 2 (in Russian)"]
}
Do NOT wrap the output in markdown backticks. Return raw JSON.`;

function getNodePrompt(topic: string, subtopic: string): string {
    return `You are a Senior EdTech Professor and Expert in Cognitive Psychology. You are generating a highly structured learning module for the subtopic "${subtopic}" (part of "${topic}").
ALL TEXT CONTENT MUST BE STRICTLY IN RUSSIAN.
IMPORTANT: Do NOT translate the enum values for "type" or JSON keys.
Return ONLY a valid JSON object matching this EXACT structure. Use rich Markdown in text fields where appropriate. Do NOT wrap the output in markdown backticks. Return raw JSON.

{
  "title": "Название подтемы на русском",
  "day": 1,
  "topic": "Название темы",
  "narrative_hook": {
    "title": "Зачем это нужно?",
    "analogy": "Простая аналогия из реальной жизни на русском языке."
  },
  "micro_loops": [
    {
      "loop_id": "Краткое название концепта (например, 'Создание объекта')",
      "theory_chunk": "Объяснение одного концепта без лишней воды (2-3 абзаца).",
      "syntax_snippet": "A concise code snippet illustrating the concept if applicable (or empty string)",
      "fast_consolidation": {
        "type": "predict_output",
        "question": "Что выведет этот код? (Mental tracing question)",
        "code_block": "Small code block for the user to mentally trace",
        "expected_exact_answer": "exact expected output string",
        "explanation_on_fail": "Explanation of why the output is what it is, shown if they answer incorrectly."
      }
    },
    {
      "loop_id": "Краткое название концепта 2",
      "theory_chunk": "Explanation of the next concept.",
      "syntax_snippet": "Target code",
      "fast_consolidation": {
        "type": "spot_the_bug",
        "question": "В какой строке концептуальная или синтаксическая ошибка?",
        "code_block": "1. Code line 1\\n2. Code line 2\\n3. Bug line\\n4. Code line 4",
        "bug_line": 3,
        "bug_explanation": "Detailed explanation of why line 3 is wrong."
      }
    }
  ],
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

Include 1 to 4 micro_loops in the array, depending on the complexity of the topic to prevent repetition.`;
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

        console.log(`[Backend] 🚀 Starting Agentic generation for topic: ${topic}`);

        // STEP 1: Fetch Outline
        const outlineMessages = [
            { "role": "system", "content": OUTLINE_PROMPT },
            { "role": "user", "content": `Create a curriculum outline for: ${topic}` }
        ];

        console.log(`[Backend] \t➔ Fetching Outline...`);
        let outlineRaw = await callOpenRouter(outlineMessages, "openai/gpt-4o-mini");
        outlineRaw = sanitizeLLMJson(outlineRaw);

        let outlineData;
        try {
            outlineData = repairAndParse(outlineRaw);
        } catch (e) {
            console.error('[Backend] Outline parsing failed, falling back to regex...', e);
            // Fallback parsing if LLM sends raw array or weird format
            const foundTopics = outlineRaw.match(/"([^"]+)"/g);
            outlineData = {
                topic: topic,
                subtopics: foundTopics ? foundTopics.map(s => s.replace(/"/g, '')) : ["Basic Concepts", "Advanced Usage"]
            };
        }

        const subtopics = Array.isArray(outlineData.subtopics) && outlineData.subtopics.length > 0
            ? outlineData.subtopics.slice(0, 4)
            : ["Основы", "Практическое применение"];

        console.log(`[Backend] \t➔ Outline generated: [${subtopics.join(', ')}]`);
        console.log(`[Backend] \t➔ Dispatching ${subtopics.length} parallel requests...`);

        // STEP 2: Fetch Nodes in Parallel
        const nodePromises = subtopics.map(async (subtopic: string, index: number) => {
            const prompt = getNodePrompt(outlineData.topic || topic, subtopic);
            const messages = [
                { "role": "system", "content": prompt },
                { "role": "user", "content": `Generate detailed content for: ${subtopic}` }
            ];

            try {
                let nodeContent = await callOpenRouter(messages, "openai/gpt-4o-mini");
                nodeContent = sanitizeLLMJson(nodeContent);
                let parsedNode = repairAndParse(nodeContent);

                // Ensure `day` exists
                if (!parsedNode.day) parsedNode.day = index + 1;

                // Ensure arrays exist for micro_loops just in case
                if (!Array.isArray(parsedNode.micro_loops)) parsedNode.micro_loops = [];

                console.log(`[Backend] \t\t🟢 Node ${index + 1}/${subtopics.length} completed: ${subtopic}`);
                return parsedNode;
            } catch (err: any) {
                console.error(`[Backend] \t\t🔴 Node ${index + 1} failed (${subtopic}):`, err.message);
                return null;
            }
        });

        const parallelResults = await Promise.all(nodePromises);

        // Filter out any failed nodes
        const successfulNodes = parallelResults.filter(node => node && node.title && Array.isArray(node.micro_loops));

        if (successfulNodes.length === 0) {
            throw new Error('All parallel node generations failed.');
        }

        // Assemble Final JSON
        const finalJson = {
            topic: outlineData.topic || topic,
            roadmap_nodes: successfulNodes
        };

        console.log(`[Backend] ✅ Assembly complete. Successfully generated ${successfulNodes.length} nodes.`);

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
