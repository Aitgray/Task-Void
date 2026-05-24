import type { InferSelectModel } from 'drizzle-orm';
import type { tasks } from '../db/schema';
import { AGING_RATE, JITTER_MAX, SKIP_WEIGHT } from './constants';

export type Task = InferSelectModel<typeof tasks>;

export function scoreTask(task: Task, now: number): number {
  const hoursWaiting = (now - task.scheduled_at) / 3_600_000;
  const jitter = Math.random() * JITTER_MAX;
  return task.base_priority + AGING_RATE * hoursWaiting + SKIP_WEIGHT * task.skip_count + jitter;
}

// Pure function: given a list of active tasks and the current time, returns the
// highest-scoring task. Each task is scored exactly once so jitter is consistent.
export function pickTask(activeTasks: Task[], now: number): Task | null {
  if (activeTasks.length === 0) return null;

  let best = activeTasks[0];
  let bestScore = scoreTask(activeTasks[0], now);

  for (let i = 1; i < activeTasks.length; i++) {
    const score = scoreTask(activeTasks[i], now);
    if (score > bestScore) {
      bestScore = score;
      best = activeTasks[i];
    }
  }

  return best;
}
