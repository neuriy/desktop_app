/**
 * Neuriy Agent Interface — desktop ↔ AGI Core HTTP/SSE client.
 * Does not replace ElloFive; AGI Core routes models (including ElloFive).
 */

export type AgiTaskStatus =
  | 'QUEUED'
  | 'RUNNING'
  | 'WAITING_FOR_USER'
  | 'PAUSED'
  | 'FAILED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface AgiChatResult {
  ok: boolean;
  reply: string;
  summary?: string;
  taskId?: string;
  model?: string;
  events?: Array<{ type: string; message: string; ts: string }>;
  error?: string;
  progress?: number;
}

export interface AgiTask {
  id: string;
  goal: string;
  status: AgiTaskStatus;
  progress: number;
  currentStep?: string;
  result?: string;
  error?: string;
}

const DEFAULT_AGI =
  import.meta.env.VITE_AGI_CORE_URL?.replace(/\/$/, '') || 'http://127.0.0.1:8787';

export function getAgiCoreUrl(): string {
  return DEFAULT_AGI;
}

export async function checkAgiHealth(timeoutMs = 2500): Promise<{
  ok: boolean;
  detail: string;
}> {
  const base = getAgiCoreUrl();
  try {
    const res = await fetch(`${base}/health`, {
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = (await res.json()) as { ok?: boolean; service?: string };
    if (!res.ok || !data.ok) {
      return { ok: false, detail: `AGI Core unhealthy at ${base}` };
    }
    return { ok: true, detail: `${data.service || 'neuriy-agi-core'} online` };
  } catch (err) {
    return {
      ok: false,
      detail: `AGI Core offline at ${base} — run: npm run agi:dev (${
        err instanceof Error ? err.message : String(err)
      })`,
    };
  }
}

export async function askAgiCore(
  message: string,
  user?: { id: string; displayName?: string | null; email?: string | null }
): Promise<AgiChatResult> {
  const base = getAgiCoreUrl();
  try {
    const res = await fetch(`${base}/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, user }),
      signal: AbortSignal.timeout(120_000),
    });
    const data = (await res.json()) as AgiChatResult & { error?: string; reply?: string };
    if (!res.ok) {
      return { ok: false, reply: '', error: data.error || `HTTP ${res.status}` };
    }
    return {
      ok: true,
      reply: data.reply || '',
      summary: data.summary,
      taskId: data.taskId,
      model: data.model,
      events: data.events,
    };
  } catch (err) {
    return {
      ok: false,
      reply: '',
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function listAgiTasks(): Promise<AgiTask[]> {
  const base = getAgiCoreUrl();
  try {
    const res = await fetch(`${base}/agent/tasks`, {
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { tasks?: AgiTask[] };
    return data.tasks || [];
  } catch {
    return [];
  }
}

export async function controlAgiTask(
  id: string,
  action: 'pause' | 'resume' | 'cancel'
): Promise<AgiTask | null> {
  const base = getAgiCoreUrl();
  try {
    const res = await fetch(`${base}/agent/tasks/${id}/${action}`, {
      method: 'POST',
      signal: AbortSignal.timeout(5000),
    });
    const data = (await res.json()) as { task?: AgiTask };
    return data.task || null;
  } catch {
    return null;
  }
}
