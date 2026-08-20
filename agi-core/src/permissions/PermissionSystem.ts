import type { AgentPermissions, PermissionLevel } from '../types';
import { dataPath, readJsonFile, writeJsonFile } from '../store/JsonStore';

const DEFAULTS: AgentPermissions = {
  webAccess: 'allow',
  readFiles: 'allow',
  writeFiles: 'ask',
  runCommands: 'ask',
  sendEmail: 'ask',
  deleteFiles: 'ask',
  installSoftware: 'ask',
  financialActions: 'deny',
};

export class PermissionSystem {
  private permissions: AgentPermissions;
  private pending = new Map<
    string,
    { resolve: (ok: boolean) => void; tool: string; reason: string }
  >();

  constructor() {
    this.permissions = {
      ...DEFAULTS,
      ...readJsonFile<Partial<AgentPermissions>>(dataPath('approvals', 'permissions.json'), {}),
    };
  }

  get(): AgentPermissions {
    return { ...this.permissions };
  }

  set(partial: Partial<AgentPermissions>): AgentPermissions {
    this.permissions = { ...this.permissions, ...partial };
    writeJsonFile(dataPath('approvals', 'permissions.json'), this.permissions);
    return this.get();
  }

  level(key: keyof AgentPermissions): PermissionLevel {
    return this.permissions[key] ?? 'ask';
  }

  /**
   * Returns true if allowed, false if denied.
   * If level is "ask", waits for approve/deny via API (timeout → deny).
   */
  async authorize(
    key: keyof AgentPermissions,
    toolName: string,
    reason: string,
    timeoutMs = 120_000
  ): Promise<{ allowed: boolean; approvalId?: string }> {
    const level = this.level(key);
    if (level === 'allow') return { allowed: true };
    if (level === 'deny') return { allowed: false };

    const approvalId = `apr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
    const allowed = await new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(approvalId);
        resolve(false);
      }, timeoutMs);
      this.pending.set(approvalId, {
        tool: toolName,
        reason,
        resolve: (ok) => {
          clearTimeout(timer);
          resolve(ok);
        },
      });
    });
    return { allowed, approvalId };
  }

  resolveApproval(approvalId: string, approved: boolean): boolean {
    const entry = this.pending.get(approvalId);
    if (!entry) return false;
    this.pending.delete(approvalId);
    entry.resolve(approved);
    return true;
  }

  listPending(): Array<{ id: string; tool: string; reason: string }> {
    return [...this.pending.entries()].map(([id, v]) => ({
      id,
      tool: v.tool,
      reason: v.reason,
    }));
  }
}

export const permissions = new PermissionSystem();
