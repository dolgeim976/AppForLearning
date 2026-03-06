import { TrackRoadmap } from './types';

export const mockRoadmap: TrackRoadmap = {
    topic: "Node.js Streams",
    roadmap_nodes: [
        {
            id: '1',
            day: 1,
            title: "Основы Streams и Buffer",
            narrative_hook: "Представьте, что вам нужно перелить воду из огромного бассейна в другой. Вы не станете ждать — вы будете передавать ведро за ведром.",
            analogy: "Поток данных — это конвейерная лента на заводе. Buffer — корзинка с текущей порцией товаров.",
            detailed_theory: "Node.js Streams — это концепция работы с потоковыми данными.",
            common_pitfalls: "1. Забыли слушать 'error'.\\n2. fs.readFile() вместо потока убивает память.",
            practical_examples: "const fs = require('fs');\\nconst readStream = fs.createReadStream('./file.txt');",
            practice_type: "replication",
            practice_difficulty: "easy",
            practice_task: "Создайте Readable stream, который читает файл построчно и выводит каждую строку в консоль.",
            practice_requirements: [
                "Используйте fs.createReadStream()",
                "Установите encoding 'utf-8'",
                "Обработайте событие 'data'",
                "Обработайте событие 'error'"
            ],
            practice_hints: [
                "Начните с подключения модуля fs через require('fs')",
                "Используйте createReadStream с объектом options: { encoding: 'utf-8' }",
                "Не забудьте добавить обработчик .on('error', ...) для graceful handling"
            ],
            solution_code: "const fs = require('fs');\\nconst stream = fs.createReadStream('file.txt', { encoding: 'utf-8' });\\nstream.on('data', chunk => console.log(chunk));\\nstream.on('error', err => console.error(err));",
            active_recall_questions: [
                { type: "multiple_choice", question: "В чем отличие Stream от обычного чтения?", code_snippet: "", options: ["Быстрее", "Данные обрабатываются по мере поступления", "Меньше кода", "Безопаснее"], correct_answer: "Данные обрабатываются по мере поступления" },
                { type: "predict_output", question: "Что выведет этот код?", code_snippet: "const buf = Buffer.from('Hello');\\nconsole.log(buf.length);", options: ["5", "10", "Hello", "Ошибка"], correct_answer: "5" },
                { type: "spot_bug", question: "Найдите ошибку:", code_snippet: "const stream = fs.createReadStream('file.txt');\\n// никаких обработчиков", options: ["Нет обработчика 'data'", "Неправильный путь", "Забыли require", "Ошибки нет"], correct_answer: "Нет обработчика 'data'" },
                { type: "multiple_choice", question: "Какие 4 типа потоков?", code_snippet: "", options: ["Read, Write, Duplex, Transform", "Get, Post, Put, Delete", "Input, Output, Error, Info", "Sync, Async, Promise, Callback"], correct_answer: "Read, Write, Duplex, Transform" },
                { type: "predict_output", question: "Что выведет?", code_snippet: "console.log(typeof Buffer.alloc(10));", options: ["buffer", "object", "string", "array"], correct_answer: "object" }
            ],
            interleaving_tasks: "Как Streams используют Event Emitter под капотом?"
        },
        {
            id: '2',
            day: 2,
            title: "Piping и Transform Streams",
            narrative_hook: "Клиент просит: 'Скачай лог 50GB, сожми и зашифруй'. С pipe() — 3 строки кода!",
            analogy: "Pipe() — труба между краном и раковиной. Transform — фильтр для воды.",
            detailed_theory: "Pipe() соединяет Readable и Writable, автоматически решая backpressure.",
            common_pitfalls: "1. Ошибка не пробрасывается через pipe().\\n2. Забыли вызвать cb() в Transform.",
            practical_examples: "fs.createReadStream('f.txt').pipe(zlib.createGzip()).pipe(fs.createWriteStream('f.gz'));",
            practice_type: "algorithmic",
            practice_difficulty: "medium",
            practice_task: "Напишите Transform stream, который переводит весь текст в верхний регистр и пайпит результат в файл.",
            practice_requirements: [
                "Создайте Transform stream с методом _transform()",
                "Вызовите callback cb() после обработки чанка",
                "Используйте .pipe() для соединения потоков",
                "Выходной файл должен содержать текст в верхнем регистре"
            ],
            practice_hints: [
                "Transform наследуется от stream.Transform — используйте new Transform({...})",
                "В _transform(chunk, encoding, cb) вызовите this.push(chunk.toString().toUpperCase()) и затем cb()"
            ],
            solution_code: "const { Transform } = require('stream');\\nconst upper = new Transform({\\n  transform(chunk, enc, cb) { cb(null, chunk.toString().toUpperCase()); }\\n});",
            active_recall_questions: [
                { type: "multiple_choice", question: "Что решает .pipe()?", code_snippet: "", options: ["Закрытие файла", "Backpressure", "Шифрование", "Удаление пробелов"], correct_answer: "Backpressure" },
                { type: "spot_bug", question: "Найдите баг:", code_snippet: "const t = new Transform({\\n  transform(chunk, enc, cb) {\\n    this.push(chunk.toString().toUpperCase());\\n  }\\n});", options: ["Не вызван cb()", "Нет push", "Неправильный encoding", "Ошибки нет"], correct_answer: "Не вызван cb()" },
                { type: "predict_output", question: "Что произойдёт?", code_snippet: "process.stdin.pipe(process.stdout);", options: ["Эхо ввода", "Ошибка", "Зависнет", "Ничего"], correct_answer: "Эхо ввода" },
                { type: "multiple_choice", question: "Что такое Backpressure?", code_snippet: "", options: ["Ошибка сервера", "Ограничение скорости чтения когда запись не успевает", "Сжатие", "Задержка сети"], correct_answer: "Ограничение скорости чтения когда запись не успевает" },
                { type: "multiple_choice", question: "Можно ли пайпить в несколько Writable?", code_snippet: "", options: ["Только в один", "Да", "Нет, будет deadlock", "Только синхронно"], correct_answer: "Да" }
            ],
            interleaving_tasks: "Связь между Piping в Bash и .pipe() в Node.js."
        }
    ]
};
