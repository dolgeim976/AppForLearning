import { TrackRoadmap, RoadmapNode } from './types';

/**
 * Генерирует и скачивает Markdown файл с теорией и конспектами для базы знаний.
 */
export const exportTrackToMarkdown = (track: TrackRoadmap) => {
    let mdContent = `# Учебный трек: ${track.topic}\n\n`;

    mdContent += `*Сгенерировано AI-платформой для изучения программирования*\n\n---\n\n`;

    track.roadmap_nodes.forEach((node: RoadmapNode) => {
        mdContent += `## День ${node.day}: ${node.title}\n\n`;

        mdContent += `### 📖 Теория\n${node.theory_summary}\n\n`;

        mdContent += `### ✨ Пример (Worked Example)\n\`\`\`javascript\n${node.worked_example}\n\`\`\`\n\n`;

        mdContent += `### 🛠 Практика\n${node.practice_task}\n\n`;

        mdContent += `### 🏗 Микро-проект (Шаг)\n${node.micro_project}\n\n`;

        mdContent += `### 🔄 Интерливинг (Повторение)\n${node.interleaving_tasks}\n\n`;

        mdContent += `### 🧠 Вопросы для самоконтроля (Active Recall)\n`;
        node.active_recall_questions.forEach((q, idx) => {
            mdContent += `${idx + 1}. ${q}\n`;
        });
        mdContent += `\n---\n\n`;
    });

    // Создание blob и инициирование скачивания
    const blob = new Blob([mdContent], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `${track.topic.replace(/\\s+/g, '_')}_Study_Track.md`;
    document.body.appendChild(link);
    link.click();

    // Очистка ресурсов
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};
