import { randomUUID } from 'crypto';
import type {
  AgentEnvironment,
  AgentStateSnapshot,
  AgentUser,
} from '../types';
import { toolRegistry } from '../tools/registry';
import { permissions } from '../permissions/PermissionSystem';

const AGENT_ID = 'neuriy-agi-core';
const AGENT_NAME = 'Neuriy';

export class AgentIdentity {
  private user: AgentUser | null = null;
  private sessionId = randomUUID();
  private currentGoal: string | null = null;
  private activeTaskId: string | null = null;

  setUser(user: AgentUser | null): void {
    this.user = user;
  }

  newSession(): string {
    this.sessionId = randomUUID();
    return this.sessionId;
  }

  setGoal(goal: string | null): void {
    this.currentGoal = goal;
  }

  setActiveTask(taskId: string | null): void {
    this.activeTaskId = taskId;
  }

  snapshot(): AgentStateSnapshot {
    const environment: AgentEnvironment = {
      platform: process.platform,
      cwd: process.cwd(),
      desktopConnected: true,
      agiVersion: '0.1.0',
    };

    return {
      agentId: AGENT_ID,
      agentName: AGENT_NAME,
      user: this.user,
      sessionId: this.sessionId,
      currentGoal: this.currentGoal,
      activeTaskId: this.activeTaskId,
      permissionLevel: JSON.stringify(permissions.get()),
      tools: toolRegistry.names(),
      environment,
      updatedAt: new Date().toISOString(),
    };
  }
}

export const agentIdentity = new AgentIdentity();
