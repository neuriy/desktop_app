import type { AgentPermissions, ToolDefinition, ToolResult } from '../types';
import { permissions } from '../permissions/PermissionSystem';
import { eventBus } from '../events/EventBus';

export type ToolExecuteFn = (
  params: Record<string, unknown>,
  ctx: { userId?: string }
) => Promise<ToolResult>;

export interface RegisteredTool {
  def: ToolDefinition;
  execute: ToolExecuteFn;
}

export class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();

  register(def: ToolDefinition, execute: ToolExecuteFn): void {
    this.tools.set(def.name, { def, execute });
  }

  list(): ToolDefinition[] {
    return [...this.tools.values()].map((t) => t.def);
  }

  names(): string[] {
    return [...this.tools.keys()];
  }

  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  async run(
    name: string,
    params: Record<string, unknown>,
    ctx: { userId?: string } = {}
  ): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return { ok: false, output: '', error: `Unknown tool: ${name}` };
    }

    for (const key of tool.def.permissions) {
      const auth = await permissions.authorize(
        key as keyof AgentPermissions,
        name,
        `Tool ${name} requires ${key}`
      );
      if (!auth.allowed) {
        eventBus.now('UserApprovalRequested', `Permission denied/pending for ${name}`, {
          permission: key,
          approvalId: auth.approvalId,
        });
        return {
          ok: false,
          output: '',
          error: `Permission "${key}" not granted for tool ${name}`,
        };
      }
    }

    eventBus.now('ToolCalled', `Calling ${name}`, { params });
    try {
      const result = await tool.execute(params, ctx);
      if (result.ok) {
        eventBus.now('ToolCompleted', `${name} ok`, {
          preview: result.output.slice(0, 200),
        });
      } else {
        eventBus.now('ToolFailed', `${name} failed`, { error: result.error });
      }
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      eventBus.now('ToolFailed', `${name} threw`, { error });
      return { ok: false, output: '', error };
    }
  }
}

export const toolRegistry = new ToolRegistry();
