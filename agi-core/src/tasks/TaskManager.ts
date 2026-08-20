import { randomUUID } from 'crypto';
import type { AgentEvent, AgentPlan, AgentTask, TaskStatus } from '../types';
import { dataPath, readJsonFile, writeJsonFile } from '../store/JsonStore';
import { eventBus } from '../events/EventBus';

export class TaskManager {
  private tasks = new Map<string, AgentTask>();

  constructor() {
    const saved = readJsonFile<AgentTask[]>(dataPath('tasks', 'tasks.json'), []);
    for (const t of saved) this.tasks.set(t.id, t);
  }

  private persist(): void {
    writeJsonFile(dataPath('tasks', 'tasks.json'), [...this.tasks.values()]);
  }

  create(goal: string, userId?: string, plan?: AgentPlan): AgentTask {
    const task: AgentTask = {
      id: randomUUID(),
      userId,
      goal,
      status: 'QUEUED',
      plan,
      progress: 0,
      events: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.tasks.set(task.id, task);
    this.persist();
    return task;
  }

  get(id: string): AgentTask | undefined {
    return this.tasks.get(id);
  }

  list(userId?: string): AgentTask[] {
    return [...this.tasks.values()]
      .filter((t) => !userId || !t.userId || t.userId === userId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  setStatus(id: string, status: TaskStatus, error?: string): AgentTask | undefined {
    const t = this.tasks.get(id);
    if (!t) return undefined;
    t.status = status;
    if (error) t.error = error;
    t.updatedAt = new Date().toISOString();
    this.persist();
    return t;
  }

  updatePlan(
    id: string,
    plan: AgentPlan,
    progress: number,
    currentStep?: string
  ): AgentTask | undefined {
    const t = this.tasks.get(id);
    if (!t) return undefined;
    t.plan = plan;
    t.progress = progress;
    t.currentStep = currentStep;
    t.updatedAt = new Date().toISOString();
    this.persist();
    eventBus.now('PlanUpdated', currentStep || 'Plan updated', {
      taskId: id,
      progress,
    });
    return t;
  }

  pushEvent(id: string, event: AgentEvent): void {
    const t = this.tasks.get(id);
    if (!t) return;
    t.events.push(event);
    t.updatedAt = new Date().toISOString();
    this.persist();
  }

  complete(id: string, result: string): AgentTask | undefined {
    const t = this.tasks.get(id);
    if (!t) return undefined;
    t.status = 'COMPLETED';
    t.progress = 100;
    t.result = result;
    t.updatedAt = new Date().toISOString();
    this.persist();
    return t;
  }

  fail(id: string, error: string): AgentTask | undefined {
    const t = this.setStatus(id, 'FAILED', error);
    eventBus.now('TaskFailed', error, { taskId: id });
    return t;
  }

  pause(id: string): AgentTask | undefined {
    return this.setStatus(id, 'PAUSED');
  }

  resume(id: string): AgentTask | undefined {
    return this.setStatus(id, 'RUNNING');
  }

  cancel(id: string): AgentTask | undefined {
    return this.setStatus(id, 'CANCELLED');
  }
}

export const taskManager = new TaskManager();
