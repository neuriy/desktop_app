import { Router, type Request, type Response } from 'express';
import { ensureDataDirs } from '../store/JsonStore';
import { agentIdentity } from '../agent/AgentIdentity';
import { agentLoop } from '../agent/AgentLoop';
import { memory } from '../memory/MemorySystem';
import { knowledge } from '../knowledge/KnowledgeSystem';
import { taskManager } from '../tasks/TaskManager';
import { permissions } from '../permissions/PermissionSystem';
import { toolRegistry } from '../tools/registry';
import { eventBus } from '../events/EventBus';
import type { AgentEvent, AgentUser, ChatRequest } from '../types';

ensureDataDirs();

export function createApiRouter(): Router {
  const router = Router();

  router.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'neuriy-agi-core',
      version: '0.1.0',
      agent: agentIdentity.snapshot().agentName,
    });
  });

  router.get('/agent/state', (_req, res) => {
    res.json(agentIdentity.snapshot());
  });

  router.get('/agent/tools', (_req, res) => {
    res.json({ tools: toolRegistry.list() });
  });

  router.get('/agent/permissions', (_req, res) => {
    res.json(permissions.get());
  });

  router.post('/agent/permissions', (req, res) => {
    res.json(permissions.set(req.body || {}));
  });

  router.post('/agent/approve', (req, res) => {
    const { approvalId, approved } = req.body || {};
    const ok = permissions.resolveApproval(String(approvalId), Boolean(approved));
    res.status(ok ? 200 : 404).json({ ok });
  });

  router.get('/agent/approvals/pending', (_req, res) => {
    res.json({ pending: permissions.listPending() });
  });

  /** Chat — full agent loop */
  router.post('/agent/chat', async (req: Request, res: Response) => {
    const body = req.body as ChatRequest;
    if (!body?.message) {
      res.status(400).json({ error: 'message required' });
      return;
    }

    const user = body.user as AgentUser | undefined;
    const wantsStream = Boolean(body.stream) || String(req.headers.accept || '').includes('text/event-stream');

    if (wantsStream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      const send = (event: AgentEvent | { type: string; data: unknown }) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      };

      try {
        const result = await agentLoop.runChat(body.message, {
          user,
          sessionId: body.sessionId,
          onEvent: (e) => send(e),
        });
        send({ type: 'FinalResponse', ts: new Date().toISOString(), message: 'done', data: { result } });
        res.write('data: [DONE]\n\n');
        res.end();
      } catch (err) {
        send({
          type: 'TaskFailed',
          ts: new Date().toISOString(),
          message: err instanceof Error ? err.message : String(err),
        });
        res.end();
      }
      return;
    }

    try {
      const result = await agentLoop.runChat(body.message, {
        user,
        sessionId: body.sessionId,
      });
      res.json(result);
    } catch (err) {
      res.status(500).json({
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /** Tasks */
  router.get('/agent/tasks', (req, res) => {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    res.json({ tasks: taskManager.list(userId) });
  });

  router.post('/agent/tasks', async (req, res) => {
    const goal = String(req.body?.goal || req.body?.message || '');
    if (!goal) {
      res.status(400).json({ error: 'goal required' });
      return;
    }
    const user = req.body?.user as AgentUser | undefined;
    const result = await agentLoop.runChat(goal, { user });
    res.json(result);
  });

  router.get('/agent/tasks/:id', (req, res) => {
    const task = taskManager.get(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'not found' });
      return;
    }
    res.json(task);
  });

  router.post('/agent/tasks/:id/pause', (req, res) => {
    res.json({ task: taskManager.pause(req.params.id) });
  });

  router.post('/agent/tasks/:id/resume', (req, res) => {
    res.json({ task: taskManager.resume(req.params.id) });
  });

  router.post('/agent/tasks/:id/cancel', (req, res) => {
    res.json({ task: taskManager.cancel(req.params.id) });
  });

  /** Memory */
  router.get('/agent/memory', (req, res) => {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    const q = typeof req.query.q === 'string' ? req.query.q : '';
    res.json({
      memories: q ? memory.retrieve(q, 20, userId) : memory.list(userId),
    });
  });

  router.post('/agent/memory', (req, res) => {
    const content = String(req.body?.content || '');
    if (!content) {
      res.status(400).json({ error: 'content required' });
      return;
    }
    const rec = memory.add(content, {
      kind: req.body?.kind,
      category: req.body?.category,
      userId: req.body?.userId,
    });
    res.json(rec);
  });

  router.delete('/agent/memory/:id', (req, res) => {
    res.json({ ok: memory.delete(req.params.id) });
  });

  /** Knowledge ingest / search */
  router.post('/agent/knowledge', (req, res) => {
    const source = String(req.body?.source || 'manual');
    const content = String(req.body?.content || '');
    if (!content) {
      res.status(400).json({ error: 'content required' });
      return;
    }
    const n = knowledge.ingest(source, content, req.body?.metadata);
    res.json({ chunks: n, sources: knowledge.listSources() });
  });

  router.get('/agent/knowledge/search', (req, res) => {
    const q = String(req.query.q || '');
    res.json({ chunks: knowledge.search(q, 8) });
  });

  /** Live event stream */
  router.get('/agent/events/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const onEvent = (event: AgentEvent) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    };
    eventBus.on('event', onEvent);
    req.on('close', () => eventBus.off('event', onEvent));
  });

  return router;
}
