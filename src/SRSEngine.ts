/**
 * Spaced Repetition System (SRS) — SM-2 Algorithm
 * 
 * Tracks per-concept mastery using Ease Factor and schedules reviews.
 * Formula: I_n = I_{n-1} × EF
 */

export interface SRSCard {
    id: string;
    trackId: string;
    trackTopic: string;
    nodeTitle: string;
    question: string;
    options: string[];
    correct_answer: string;
    code_snippet?: string;
    type: 'multiple_choice' | 'predict_output' | 'spot_bug';

    // SM-2 fields
    easeFactor: number;    // Starting at 2.5
    interval: number;      // Days until next review
    repetitions: number;   // Successful consecutive reviews
    nextReviewDate: string; // ISO date string
    lastReviewDate: string; // ISO date string
}

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;
// 0 = Complete blackout
// 1 = Incorrect, but remembered upon seeing answer
// 2 = Incorrect, but easy recall upon seeing answer
// 3 = Correct with significant difficulty
// 4 = Correct with some hesitation
// 5 = Perfect recall


export class SRSEngine {
    private cards: SRSCard[] = [];

    constructor() {
        // No persistence — cards are in-memory only
        // They get regenerated from quiz questions when tracks are added
    }

    private saveCards(): void {
        // in-memory only, no persistence
    }

    /** Import quiz questions from a track as SRS cards */
    importFromTrack(trackId: string, trackTopic: string, nodes: Array<{
        title: string;
        active_recall_questions: Array<{
            type?: string;
            question: string;
            options: string[];
            correct_answer: string;
            code_snippet?: string;
        }>;
    }>): number {
        let imported = 0;
        const today = new Date().toISOString().split('T')[0];

        for (const node of nodes) {
            for (const q of node.active_recall_questions) {
                const cardId = `${trackId}_${node.title}_${q.question}`.substring(0, 120);

                // Skip if already exists
                if (this.cards.find(c => c.id === cardId)) continue;

                this.cards.push({
                    id: cardId,
                    trackId,
                    trackTopic,
                    nodeTitle: node.title,
                    question: q.question,
                    options: q.options,
                    correct_answer: q.correct_answer,
                    code_snippet: q.code_snippet || '',
                    type: (q.type as SRSCard['type']) || 'multiple_choice',
                    easeFactor: 2.5,
                    interval: 0,
                    repetitions: 0,
                    nextReviewDate: today,
                    lastReviewDate: '',
                });
                imported++;
            }
        }

        this.saveCards();
        return imported;
    }

    /** Get cards due for review today */
    getDueCards(): SRSCard[] {
        const today = new Date().toISOString().split('T')[0];
        return this.cards.filter(card => card.nextReviewDate <= today);
    }

    /** Get total card count */
    getTotalCards(): number {
        return this.cards.length;
    }

    /** Get mastered card count (cards with 3+ successful repetitions) */
    getMasteredCards(): number {
        return this.cards.filter(c => c.repetitions >= 3).length;
    }

    /** SM-2 Algorithm: Update card after review */
    reviewCard(cardId: string, quality: ReviewQuality): void {
        const card = this.cards.find(c => c.id === cardId);
        if (!card) return;

        const today = new Date().toISOString().split('T')[0];
        card.lastReviewDate = today;

        if (quality >= 3) {
            // Correct response
            if (card.repetitions === 0) {
                card.interval = 1;
            } else if (card.repetitions === 1) {
                card.interval = 6;
            } else {
                card.interval = Math.round(card.interval * card.easeFactor);
            }
            card.repetitions++;
        } else {
            // Incorrect — reset
            card.repetitions = 0;
            card.interval = 1;
        }

        // Update Ease Factor: EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
        card.easeFactor = card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
        if (card.easeFactor < 1.3) card.easeFactor = 1.3; // minimum EF

        // Schedule next review
        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + card.interval);
        card.nextReviewDate = nextDate.toISOString().split('T')[0];

        this.saveCards();
    }

    /** Clear all cards for a track */
    clearTrack(trackId: string): void {
        this.cards = this.cards.filter(c => c.trackId !== trackId);
        this.saveCards();
    }

    /** Get stats for display */
    getStats(): { total: number; due: number; mastered: number; learning: number } {
        const due = this.getDueCards().length;
        const mastered = this.getMasteredCards();
        return {
            total: this.cards.length,
            due,
            mastered,
            learning: this.cards.length - mastered
        };
    }
}
