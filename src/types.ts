import { z } from 'zod';

export const RoadmapNodeSchema = z.object({
    id: z.string().optional(),
    title: z.string(),
    day: z.number(),
    narrative_hook: z.string().optional().default(""),
    analogy: z.string().optional().default(""),
    detailed_theory: z.string(),
    common_pitfalls: z.string().optional().default(""),
    practical_examples: z.string().optional().default(""),
    practice_type: z.enum(["algorithmic", "debugging", "replication"]).optional().default("algorithmic"),
    practice_difficulty: z.enum(["easy", "medium", "hard"]).optional().default("medium"),
    practice_task: z.string().optional().default(""),
    practice_requirements: z.array(z.string()).optional().default([]),
    practice_hints: z.array(z.string()).optional().default([]),
    solution_code: z.string().optional().default(""),
    active_recall_questions: z.array(z.object({
        type: z.enum(["multiple_choice", "predict_output", "spot_bug"]).optional().default("multiple_choice"),
        question: z.string(),
        code_snippet: z.string().optional().default(""),
        options: z.array(z.string()).min(2).max(6),
        correct_answer: z.string().optional().default("")
    })).optional().default([]),
    interleaving_tasks: z.string().optional().default("")
});

export const TrackRoadmapSchema = z.object({
    id: z.string().optional(), // Добавлено для localStorage
    topic: z.string(),
    roadmap_nodes: z.array(RoadmapNodeSchema)
});

export type RoadmapNode = z.infer<typeof RoadmapNodeSchema>;
export type TrackRoadmap = z.infer<typeof TrackRoadmapSchema>;
