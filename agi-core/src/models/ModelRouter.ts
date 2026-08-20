import type { ModelRole } from '../types';

export interface ModelCompletionRequest {
  role: ModelRole;
  prompt: string;
  system?: string;
  messages?: Array<{ role: string; content: string }>;
}

export interface ModelCompletionResult {
  ok: boolean;
  text: string;
  model: string;
  role: ModelRole;
  error?: string;
}

export interface ModelProvider {
  id: string;
  roles: ModelRole[];
  complete(req: ModelCompletionRequest): Promise<ModelCompletionResult>;
}

/**
 * ElloFive local/cloud provider — https://github.com/EricksonAtHome/ElloFive
 */
export class ElloFiveProvider implements ModelProvider {
  id = 'ellofive';
  roles: ModelRole[] = ['fast', 'reasoning', 'coding', 'local'];

  constructor(
    private baseUrl = process.env.ELLOFIVE_API_URL || 'http://127.0.0.1:3000',
    private modelMap: Partial<Record<ModelRole, string>> = {
      fast: 'ellofive-fast',
      reasoning: 'ellofive',
      coding: 'ellofive',
      local: 'ellofive',
    }
  ) {}

  async complete(req: ModelCompletionRequest): Promise<ModelCompletionResult> {
    const model = this.modelMap[req.role] || 'ellofive';
    try {
      const messages =
        req.messages ||
        [
          ...(req.system ? [{ role: 'system', content: req.system }] : []),
          { role: 'user', content: req.prompt },
        ];
      const res = await fetch(`${this.baseUrl.replace(/\/$/, '')}/v1/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages, message: req.prompt }),
        signal: AbortSignal.timeout(60_000),
      });
      const data = (await res.json().catch(() => ({}))) as {
        output?: string;
        message?: { content?: string };
        error?: string;
      };
      if (!res.ok) {
        return {
          ok: false,
          text: '',
          model,
          role: req.role,
          error: data.error || `ElloFive HTTP ${res.status}`,
        };
      }
      return {
        ok: true,
        text: String(data.output ?? data.message?.content ?? '').trim(),
        model,
        role: req.role,
      };
    } catch (err) {
      return {
        ok: false,
        text: '',
        model,
        role: req.role,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

/** Deterministic offline fallback when no LLM is reachable — still goes through agent loop. */
export class HeuristicProvider implements ModelProvider {
  id = 'heuristic';
  roles: ModelRole[] = ['fast', 'reasoning', 'coding', 'local'];

  async complete(req: ModelCompletionRequest): Promise<ModelCompletionResult> {
    const text = [
      'Neuriy AGI Core (offline mode — start ElloFive for full LLM responses).',
      '',
      'I understood your request and ran the agent orchestration loop',
      '(memory → plan → tools → evaluation).',
      '',
      `Prompt preview: ${req.prompt.slice(0, 280)}`,
    ].join('\n');
    return { ok: true, text, model: 'heuristic-local', role: req.role };
  }
}

/**
 * ModelRouter — select Fast / Reasoning / Coding / Vision / Embedding / Local.
 */
export class ModelRouter {
  private providers: ModelProvider[] = [];

  constructor() {
    this.providers.push(new ElloFiveProvider());
    this.providers.push(new HeuristicProvider());
  }

  selectRole(goal: string): ModelRole {
    const g = goal.toLowerCase();
    if (/\b(code|implement|typescript|python|bug|test|refactor)\b/.test(g)) return 'coding';
    if (/\b(why|analyze|plan|architecture|trade-?off|reason)\b/.test(g)) return 'reasoning';
    if (/\b(image|screenshot|vision|photo)\b/.test(g)) return 'vision';
    if (/\b(offline|private|local)\b/.test(g)) return 'local';
    if (goal.length < 80 && !/\b(build|create|fix|monitor)\b/.test(g)) return 'fast';
    return 'reasoning';
  }

  async complete(req: Omit<ModelCompletionRequest, 'role'> & { role?: ModelRole }): Promise<ModelCompletionResult> {
    const role = req.role || this.selectRole(req.prompt);
    for (const provider of this.providers) {
      if (!provider.roles.includes(role) && provider.id !== 'heuristic') continue;
      const result = await provider.complete({ ...req, role });
      if (result.ok && result.text) return result;
      if (provider.id === 'ellofive' && !result.ok) {
        // fall through to heuristic
        continue;
      }
      if (result.ok) return result;
    }
    return {
      ok: false,
      text: '',
      model: 'none',
      role,
      error: 'No model provider available',
    };
  }
}

export const modelRouter = new ModelRouter();
