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
Your task is to break down the provided topic into a list of 3 to 6 core sequential subtopics that form a complete learning path. 
ALL GENERATED TEXT (topic headers, descriptions) MUST BE WRITTEN IN RUSSIAN.
Return ONLY a valid JSON object with the following structure:
{
    "topic": "The confirmed topic name (in Russian)",
    "subtopics": ["Subtopic 1 (in Russian)", "Subtopic 2 (in Russian)", "Subtopic 3 (in Russian)"]
}
Do NOT wrap the output in markdown backticks. Return raw JSON.`;

function getNodePrompt(topic: string, subtopic: string): string {
    return `You are a Senior Technical Instructor. You are writing exhaustive, high-quality content for the subtopic "${subtopic}", which belongs to the overarching topic "${topic}".
ALL TEXT CONTENT, THEORY, INSTRUCTIONS, QUESTIONS AND CODE COMMENTS MUST BE WRITTEN STRICTLY IN RUSSIAN.
Return ONLY a valid JSON object matching this EXACT structure. Provide extensive detail in detailed_theory using rich Markdown.
{
    "title": "Название подтемы на русском",
    "day": 1,
    "narrative_hook": "A short, engaging hook in Russian.",
    "analogy": "A real-world analogy in Russian.",
    "detailed_theory": "A massive, deep explanation of this concept using beautiful markdown formatting (headers, bold, lists). Do not be brief. Write entirely in Russian.",
    "common_pitfalls": "Common mistakes beginners make with this topic in Russian.",
    "practical_examples": "Write a detailed markdown containing multiple code blocks demonstrating the concept in Russian. Explain the code. MUST be a string, not an array.",
    "practice_type": "algorithmic",
    "practice_difficulty": "medium",
    "practice_task": "A single comprehensive hands-on coding challenge or task scenario formatted in markdown in Russian.",
    "practice_requirements": ["Requirement 1 in Russian", "Requirement 2 in Russian"],
    "practice_hints": ["Hint 1 in Russian"],
    "initial_code": "Starter code snippet (string)",
    "solution_code": "Complete working solution code (string)",
    "active_recall_questions": [
        {
            "type": "multiple_choice",
            "question": "A specific multiple-choice question in Russian.",
            "code_snippet": "Optional code context related to the question. If none, pass an empty string.",
            "options": ["Option A in Russian", "Option B in Russian", "Option C in Russian", "Option D in Russian"],
            "correct_answer": "Option A in Russian (must exactly match one option)"
        }
    ],
    "interleaving_tasks": "How does this connect to previous topics? Write in Russian."
}
Include exactly 3 to 5 questions in active_recall_questions. Ensure code_snippet is a string for EVERY question. 
Do NOT wrap the output in markdown backticks. Return raw JSON.`;
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
            ? outlineData.subtopics.slice(0, 6)
            : ["Core Concepts", "Implementation", "Best Practices"];

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

                // Enforce practical_examples as string
                if (Array.isArray(parsedNode.practical_examples)) {
                    parsedNode.practical_examples = parsedNode.practical_examples.join('\n\n');
                } else if (typeof parsedNode.practical_examples !== 'string') {
                    parsedNode.practical_examples = "";
                }

                // Sanitize active_recall_questions
                if (parsedNode.active_recall_questions && Array.isArray(parsedNode.active_recall_questions)) {
                    parsedNode.active_recall_questions = parsedNode.active_recall_questions.filter((q: any) => {
                        if (!q || !q.question) return false;
                        if (typeof q.options === 'string') {
                            q.options = q.options.split(/[,;]/).map((s: string) => s.trim()).filter(Boolean);
                        }
                        if (!Array.isArray(q.options) || q.options.length < 2) return false;
                        if (!q.correct_answer) q.correct_answer = q.options[0] || '';

                        // Enforce code_snippet as string
                        if (typeof q.code_snippet !== 'string') q.code_snippet = "";

                        return true;
                    });
                }

                // Ensure array fields exist
                if (!Array.isArray(parsedNode.practice_requirements)) parsedNode.practice_requirements = [];
                if (!Array.isArray(parsedNode.practice_hints)) parsedNode.practice_hints = [];

                console.log(`[Backend] \t\t🟢 Node ${index + 1}/${subtopics.length} completed: ${subtopic}`);
                return parsedNode;
            } catch (err: any) {
                console.error(`[Backend] \t\t🔴 Node ${index + 1} failed (${subtopic}):`, err.message);
                return null;
            }
        });

        const parallelResults = await Promise.all(nodePromises);

        // Filter out any failed nodes
        const successfulNodes = parallelResults.filter(node => node && node.title && node.detailed_theory);

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
