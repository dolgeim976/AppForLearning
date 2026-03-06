import { TrackRoadmap, RoadmapNode } from './types';

export const exportTrackToMarkdown = (track: TrackRoadmap) => {
    let mdContent = `# Учебный трек: ${track.topic}\n\n`;
    mdContent += `*Сгенерировано AI-платформой для изучения программирования*\n\n---\n\n`;

    track.roadmap_nodes.forEach((node: RoadmapNode) => {
        mdContent += `## День ${node.day}: ${node.title}\n\n`;
        mdContent += `### 🎭 Зачем это нужно?\n${node.narrative_hook}\n\n`;
        mdContent += `### 💡 Аналогия\n${node.analogy}\n\n`;
        mdContent += `### 📖 Подробный конспект\n${node.detailed_theory}\n\n`;
        mdContent += `### ⚠️ Частые ошибки\n${node.common_pitfalls}\n\n`;
        mdContent += `### ✨ Практические примеры\n${node.practical_examples}\n\n`;
        mdContent += `### 🛠 Практическая задача\n${node.practice_task}\n\n`;
        mdContent += `<details><summary>Показать решение</summary>\n\n\`\`\`javascript\n${node.solution_code}\n\`\`\`\n</details>\n\n`;
        mdContent += `### 🔄 Интерливинг (Повторение)\n${node.interleaving_tasks}\n\n`;
        mdContent += `### 🧠 Вопросы для самоконтроля (Active Recall)\n`;
        node.active_recall_questions.forEach((q, idx) => {
            mdContent += `${idx + 1}. **${q.question}**\n`;
            q.options.forEach(opt => mdContent += `   - ${opt}\n`);
            mdContent += `   *Правильный ответ: ${q.correct_answer}*\n\n`;
        });
        mdContent += `\n---\n\n`;
    });

    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${track.topic.replace(/\\s+/g, '_')}_Study_Track.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
