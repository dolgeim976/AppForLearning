import { TrackRoadmap, RoadmapNode } from './types';

export const exportTrackToMarkdown = (track: TrackRoadmap) => {
    let mdContent = `# Учебный трек: ${track.topic}\n\n`;
    mdContent += `*Сгенерировано AI-платформой для изучения программирования*\n\n---\n\n`;

    track.roadmap_nodes.forEach((node: RoadmapNode) => {
        mdContent += `## День ${node.day}: ${node.title}\n\n`;
        mdContent += `### 🎭 Зачем это нужно?\n${node.narrative_hook?.title} — ${node.narrative_hook?.analogy}\n\n`;

        mdContent += `### 📖 Микро-Теория и Практика\n`;
        node.micro_loops?.forEach((loop, idx) => {
            mdContent += `#### ${idx + 1}. ${loop.loop_id}\n${loop.theory_chunk}\n\n`;
            if (loop.syntax_snippet) {
                mdContent += `**Синтаксис:**\n\`\`\`javascript\n${loop.syntax_snippet}\n\`\`\`\n\n`;
            }
            if (loop.fast_consolidation) {
                mdContent += `**Задача:** ${loop.fast_consolidation.question}\n\n`;
            }
        });

        if (node.final_boss_practice) {
            mdContent += `### 🛠 Финальный Босс (Parsons Problem)\n${node.final_boss_practice.mission}\n\n`;
        }

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
