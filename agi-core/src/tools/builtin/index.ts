import * as fs from 'fs';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { toolRegistry } from '../registry';
import { memory } from '../../memory/MemorySystem';
import { knowledge } from '../../knowledge/KnowledgeSystem';
import { AGI_DATA_ROOT, dataPath } from '../../store/JsonStore';

const execFileAsync = promisify(execFile);

function workspaceRoot(): string {
  return dataPath('workspace');
}

function safeResolve(rel: string): string | null {
  const root = path.resolve(workspaceRoot());
  const full = path.resolve(root, rel);
  if (!full.startsWith(root + path.sep) && full !== root) return null;
  return full;
}

export function registerBuiltinTools(): void {
  toolRegistry.register(
    {
      name: 'memory_store',
      description: 'Store important information in long-term memory',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'Fact to remember' },
          category: { type: 'string', description: 'Category label' },
        },
        required: ['content'],
      },
      permissions: [],
    },
    async (params, ctx) => {
      const content = String(params.content || '');
      const rec = memory.add(content, {
        category: String(params.category || 'general'),
        userId: ctx.userId,
        kind: 'persistent',
      });
      return { ok: true, output: `Saved memory ${rec.id}` };
    }
  );

  toolRegistry.register(
    {
      name: 'memory_recall',
      description: 'Semantic search over long-term memory',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
        },
        required: ['query'],
      },
      permissions: [],
    },
    async (params, ctx) => {
      const hits = memory.retrieve(String(params.query || ''), 5, ctx.userId);
      return {
        ok: true,
        output: hits.map((h) => h.content).join('\n') || '(no memories)',
        data: hits,
      };
    }
  );

  toolRegistry.register(
    {
      name: 'knowledge_search',
      description: 'Search ingested knowledge / RAG corpus',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
      permissions: [],
    },
    async (params) => {
      const hits = knowledge.search(String(params.query || ''), 5);
      return {
        ok: true,
        output: hits.map((h) => `[${h.source}] ${h.content}`).join('\n') || '(no knowledge)',
        data: hits,
      };
    }
  );

  toolRegistry.register(
    {
      name: 'http_fetch',
      description: 'Fetch a public HTTP(S) URL (read-only)',
      parameters: {
        type: 'object',
        properties: {
          url: { type: 'string' },
        },
        required: ['url'],
      },
      permissions: ['webAccess'],
    },
    async (params) => {
      const url = String(params.url || '');
      if (!/^https?:\/\//i.test(url)) {
        return { ok: false, output: '', error: 'Only http(s) URLs allowed' };
      }
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Neuriy-AGI-Core/0.1' },
        signal: AbortSignal.timeout(12000),
      });
      const text = await res.text();
      const clipped = text.replace(/\s+/g, ' ').slice(0, 4000);
      return {
        ok: res.ok,
        output: clipped,
        error: res.ok ? undefined : `HTTP ${res.status}`,
      };
    }
  );

  toolRegistry.register(
    {
      name: 'file_read',
      description: 'Read a file from the AGI sandbox workspace',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path'],
      },
      permissions: ['readFiles'],
    },
    async (params) => {
      const full = safeResolve(String(params.path || ''));
      if (!full) return { ok: false, output: '', error: 'Path escapes workspace' };
      if (!fs.existsSync(full)) return { ok: false, output: '', error: 'File not found' };
      const content = fs.readFileSync(full, 'utf8').slice(0, 50_000);
      return { ok: true, output: content };
    }
  );

  toolRegistry.register(
    {
      name: 'file_write',
      description: 'Write a file in the AGI sandbox workspace',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string' },
        },
        required: ['path', 'content'],
      },
      permissions: ['writeFiles'],
    },
    async (params) => {
      const full = safeResolve(String(params.path || ''));
      if (!full) return { ok: false, output: '', error: 'Path escapes workspace' };
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, String(params.content ?? ''), 'utf8');
      return { ok: true, output: `Wrote ${path.relative(workspaceRoot(), full)}` };
    }
  );

  toolRegistry.register(
    {
      name: 'shell_execute',
      description: 'Run a whitelisted shell command in the sandbox (requires approval by default)',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string', description: 'command name only (e.g. ls, npm)' },
          args: { type: 'string', description: 'JSON array of args' },
        },
        required: ['command'],
      },
      permissions: ['runCommands'],
    },
    async (params) => {
      const cmd = String(params.command || '');
      const allow = new Set(['ls', 'pwd', 'node', 'npm', 'git', 'cat', 'echo', 'tsc']);
      if (!allow.has(cmd)) {
        return { ok: false, output: '', error: `Command not whitelisted: ${cmd}` };
      }
      let args: string[] = [];
      try {
        args = params.args ? JSON.parse(String(params.args)) : [];
      } catch {
        args = String(params.args || '')
          .split(/\s+/)
          .filter(Boolean);
      }
      try {
        const { stdout, stderr } = await execFileAsync(cmd, args, {
          cwd: workspaceRoot(),
          timeout: 20_000,
          maxBuffer: 1024 * 1024,
          env: { ...process.env, NEURIY_AGI: '1' },
        });
        return {
          ok: true,
          output: `${stdout}${stderr ? `\n${stderr}` : ''}`.slice(0, 20_000),
        };
      } catch (err: unknown) {
        const e = err as { message?: string; stdout?: string; stderr?: string };
        return {
          ok: false,
          output: `${e.stdout || ''}${e.stderr || ''}`,
          error: e.message || 'shell failed',
        };
      }
    }
  );

  toolRegistry.register(
    {
      name: 'desktop_notify',
      description: 'Queue a desktop notification payload for the Neuriy tray app',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['title', 'body'],
      },
      permissions: [],
    },
    async (params) => {
      const payload = {
        title: String(params.title || 'Neuriy'),
        body: String(params.body || ''),
        ts: new Date().toISOString(),
      };
      const file = path.join(AGI_DATA_ROOT, 'events', 'notifications.jsonl');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.appendFileSync(file, `${JSON.stringify(payload)}\n`);
      return { ok: true, output: `Notification queued: ${payload.title}` };
    }
  );
}
