import { randomUUID } from 'crypto';
import type { AgentPlan, PlanStep } from '../types';
import { eventBus } from '../events/EventBus';

/**
 * Planning Engine — turns a high-level goal into executable steps.
 * Heuristic planner for MVP; can be upgraded to LLM-assisted planning.
 */
export class PlanningEngine {
  createPlan(goal: string): AgentPlan {
    const g = goal.toLowerCase();
    let titles: string[];

    if (/\b(test|tests|failing)\b/.test(g) && /\b(fix|project|code)\b/.test(g)) {
      titles = [
        'Inspect project structure',
        'Run existing tests',
        'Identify failing cases',
        'Propose code fixes',
        'Re-run tests',
        'Summarize changes',
      ];
    } else if (/\b(website|web app|landing page)\b/.test(g)) {
      titles = [
        'Clarify requirements',
        'Create implementation plan',
        'Scaffold project files',
        'Implement core pages',
        'Add basic styles',
        'Verify build',
        'Report result',
      ];
    } else if (/\b(search|research|look up|find)\b/.test(g)) {
      titles = ['Clarify question', 'Search knowledge/web', 'Synthesize answer', 'Cite sources'];
    } else if (/\b(remember|preference|note)\b/.test(g)) {
      titles = ['Extract durable facts', 'Store in long-term memory', 'Confirm saved'];
    } else {
      titles = [
        'Understand goal',
        'Retrieve relevant memory',
        'Select tools',
        'Execute primary actions',
        'Evaluate outcome',
        'Return result',
      ];
    }

    const steps: PlanStep[] = titles.map((title, i) => ({
      id: `step_${i + 1}`,
      title,
      status: 'pending' as const,
      dependsOn: i === 0 ? undefined : [`step_${i}`],
    }));

    const plan: AgentPlan = {
      goal,
      steps,
      createdAt: new Date().toISOString(),
    };

    eventBus.now('PlanCreated', `Plan with ${steps.length} steps`, {
      goal,
      steps: steps.map((s) => s.title),
    });
    return plan;
  }

  markRunning(plan: AgentPlan, stepId: string): AgentPlan {
    return {
      ...plan,
      steps: plan.steps.map((s) =>
        s.id === stepId ? { ...s, status: 'running' } : s
      ),
    };
  }

  markDone(plan: AgentPlan, stepId: string, notes?: string): AgentPlan {
    return {
      ...plan,
      steps: plan.steps.map((s) =>
        s.id === stepId ? { ...s, status: 'done', notes } : s
      ),
    };
  }

  markFailed(plan: AgentPlan, stepId: string, notes?: string): AgentPlan {
    return {
      ...plan,
      steps: plan.steps.map((s) =>
        s.id === stepId ? { ...s, status: 'failed', notes } : s
      ),
    };
  }

  progress(plan: AgentPlan): number {
    if (!plan.steps.length) return 0;
    const done = plan.steps.filter((s) => s.status === 'done' || s.status === 'skipped').length;
    return Math.round((done / plan.steps.length) * 100);
  }

  nextPending(plan: AgentPlan): PlanStep | null {
    return plan.steps.find((s) => s.status === 'pending') || null;
  }
}

export const planner = new PlanningEngine();

export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().slice(0, 8)}`;
}
