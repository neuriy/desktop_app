import type {
  AgentEvent,
  AgentPlan,
  AgentUser,
  ChatResponse,
} from '../types';
import { agentIdentity } from './AgentIdentity';
import { memory } from '../memory/MemorySystem';
import { knowledge } from '../knowledge/KnowledgeSystem';
import { planner } from '../planning/PlanningEngine';
import { toolRegistry } from '../tools/registry';
import { modelRouter } from '../models/ModelRouter';
import { eventBus } from '../events/EventBus';
import { taskManager } from '../tasks/TaskManager';

function isGoalLike(message: string): boolean {
  const m = message.toLowerCase();
  if (message.length > 120) return true;
  return /\b(build|create|fix|implement|monitor|check my|set up|deploy|refactor|write me|make me)\b/.test(
    m
  );
}

function pickToolsForGoal(goal: string): Array<{ name: string; params: Record<string, unknown> }> {
  const g = goal.toLowerCase();
  const calls: Array<{ name: string; params: Record<string, unknown> }> = [];

  calls.push({ name: 'memory_recall', params: { query: goal } });
  calls.push({ name: 'knowledge_search', params: { query: goal } });

  if (/\b(remember|prefer|my name|always|never)\b/.test(g)) {
    calls.push({
      name: 'memory_store',
      params: { content: goal, category: 'preferences' },
    });
  }

  if (/\bhttps?:\/\//.test(goal) || /\b(search|fetch|http|website url)\b/.test(g)) {
    const urlMatch = goal.match(/https?:\/\/\S+/);
    if (urlMatch) {
      calls.push({ name: 'http_fetch', params: { url: urlMatch[0] } });
    }
  }

  if (/\b(file|workspace|readme)\b/.test(g)) {
    calls.push({ name: 'file_read', params: { path: 'README.md' } });
  }

  return calls;
}

export type EventSink = (event: AgentEvent) => void;

/**
 * Reasoning loop (orchestration — not raw LLM passthrough):
 * INPUT → Understand → Memory → Knowledge → Plan → Tools → Observe → Evaluate → Response
 */
export class AgentLoop {
  async runChat(
    message: string,
    opts: { user?: AgentUser; sessionId?: string; onEvent?: EventSink } = {}
  ): Promise<ChatResponse> {
    const events: AgentEvent[] = [];
    const push = (e: AgentEvent) => {
      events.push(e);
      opts.onEvent?.(e);
    };

    const unsub = (event: AgentEvent) => push(event);
    eventBus.on('event', unsub);

    try {
      if (opts.user) agentIdentity.setUser(opts.user);
      if (opts.sessionId) {
        /* keep provided session in identity snapshot via setUser path */
      }

      eventBus.now('AgentStarted', 'Agent loop started', {
        preview: message.slice(0, 120),
      });

      // Understand
      const goalLike = isGoalLike(message);
      agentIdentity.setGoal(goalLike ? message : null);
      memory.pushConversation('user', message);
      memory.setCurrentTask(goalLike ? message : undefined);

      // Retrieve memory + knowledge
      const memBlock = memory.contextBlock(message, opts.user?.id);
      const knowledgeHits = knowledge.search(message, 4);
      const knowledgeBlock = knowledgeHits
        .map((k) => `[${k.source}] ${k.content}`)
        .join('\n');

      let plan: AgentPlan | undefined;
      let taskId: string | undefined;
      const observations: string[] = [];

      if (goalLike) {
        // Plan
        plan = planner.createPlan(message);
        const task = taskManager.create(message, opts.user?.id, plan);
        taskId = task.id;
        agentIdentity.setActiveTask(task.id);
        taskManager.setStatus(task.id, 'RUNNING');

        // Execute steps with tools
        for (const step of plan.steps) {
          if (taskManager.get(task.id)?.status === 'CANCELLED') break;

          plan = planner.markRunning(plan, step.id);
          taskManager.updatePlan(task.id, plan, planner.progress(plan), step.title);
          eventBus.now('Status', step.title, { stepId: step.id });

          const toolCalls = pickToolsForGoal(`${message} :: ${step.title}`);
          for (const call of toolCalls.slice(0, 2)) {
            const result = await toolRegistry.run(call.name, call.params, {
              userId: opts.user?.id,
            });
            const summary = result.ok
              ? `${call.name}: ${result.output.slice(0, 300)}`
              : `${call.name} error: ${result.error}`;
            observations.push(summary);
            memory.recordToolResult(summary);
          }

          plan = planner.markDone(plan, step.id, 'completed');
          taskManager.updatePlan(task.id, plan, planner.progress(plan), step.title);
        }
      } else {
        // Lightweight tool assist for questions
        const recall = await toolRegistry.run('memory_recall', { query: message }, {
          userId: opts.user?.id,
        });
        if (recall.ok && recall.output && recall.output !== '(no memories)') {
          observations.push(`memory: ${recall.output.slice(0, 400)}`);
        }
      }

      // Self-evaluation hints for the model
      const evaluation = [
        observations.length ? 'Tools produced observations.' : 'No tools required.',
        plan ? `Plan progress ${planner.progress(plan)}%.` : 'Single-turn response.',
      ].join(' ');

      const system = [
        'You are Neuriy, a general-purpose AI agent assistant.',
        'You have an AGI Core with memory, planning, and tools.',
        'Do not invent private user data. Use provided context only.',
        'Respond with a clear final answer. Do not dump hidden chain-of-thought.',
        memBlock ? `Long-term memory:\n${memBlock}` : '',
        knowledgeBlock ? `Knowledge:\n${knowledgeBlock}` : '',
        observations.length ? `Tool observations:\n${observations.join('\n')}` : '',
        `Evaluation: ${evaluation}`,
      ]
        .filter(Boolean)
        .join('\n\n');

      const completion = await modelRouter.complete({
        prompt: message,
        system,
        messages: [
          { role: 'system', content: system },
          ...memory.getShortTerm().conversation.slice(-8),
        ],
      });

      const reply = completion.ok
        ? completion.text
        : `Agent loop finished, but the model layer failed: ${completion.error}. Observations:\n${observations.join('\n') || '(none)'}`;

      memory.pushConversation('assistant', reply);
      memory.maybeRemember(message, 'conversations', opts.user?.id);

      if (taskId) {
        taskManager.complete(taskId, reply);
        eventBus.now('TaskCompleted', 'Task completed', { taskId });
      }

      eventBus.now('FinalResponse', 'Response ready', {
        model: completion.model,
      });

      return {
        reply,
        summary: plan
          ? `Completed plan (${planner.progress(plan)}%): ${plan.steps.map((s) => s.title).join(' → ')}`
          : 'Answered with memory/context retrieval',
        plan,
        taskId,
        events,
        model: completion.model,
      };
    } finally {
      eventBus.off('event', unsub);
      agentIdentity.setActiveTask(null);
      agentIdentity.setGoal(null);
      memory.setCurrentTask(undefined);
    }
  }
}

export const agentLoop = new AgentLoop();
