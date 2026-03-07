import { z } from 'zod';

export const NarrativeHookSchema = z.object({
    title: z.string(),
    analogy: z.string()
});

export const FastConsolidationSchema = z.object({
    type: z.enum(["predict_output", "spot_the_bug"]),
    question: z.string(),
    code_block: z.string(),
    expected_exact_answer: z.string().optional(),
    bug_line: z.number().optional(),
    bug_explanation: z.string().optional(),
    explanation_on_fail: z.string().optional()
});

export const MicroLoopSchema = z.object({
    loop_id: z.string(),
    theory_chunk: z.string(),
    syntax_snippet: z.string().optional().default(""),
    fast_consolidation: FastConsolidationSchema
});

export const FinalBossPracticeSchema = z.object({
    type: z.literal("parsons_problem"),
    mission: z.string(),
    correct_sequence: z.array(z.string()),
    distractors: z.array(z.string())
});

export const SpacedRepetitionMetadataSchema = z.object({
    keywords: z.array(z.string()),
    review_prompts: z.array(z.string())
});

export const RoadmapNodeSchema = z.object({
    id: z.string().optional(),
    title: z.string(),
    day: z.number(),
    topic: z.string().optional().default(""),
    narrative_hook: NarrativeHookSchema.optional().default({ title: "Введение", analogy: "" }),
    micro_loops: z.array(MicroLoopSchema).optional().default([]),
    final_boss_practice: FinalBossPracticeSchema.optional().default({
        type: "parsons_problem",
        mission: "Practice task",
        correct_sequence: [],
        distractors: []
    }),
    spaced_repetition_metadata: SpacedRepetitionMetadataSchema.optional().default({ keywords: [], review_prompts: [] })
});

export const TrackRoadmapSchema = z.object({
    id: z.string().optional(), // Добавлено для localStorage
    topic: z.string(),
    roadmap_nodes: z.array(RoadmapNodeSchema)
});

export type RoadmapNode = z.infer<typeof RoadmapNodeSchema>;
export type TrackRoadmap = z.infer<typeof TrackRoadmapSchema>;
