/**
 * ElloFive / Ello5 client — https://github.com/EricksonAtHome/ElloFive
 *
 * Elloten = chat UX. Ello5 = AI model. ElloFive = local runtime (Ollama + API).
 * Neuriy desktop talks to the ElloFive REST gateway: POST /v1/chat
 */

export type ElloFiveModel = 'ellofive' | 'ellofive-fast' | 'models5' | string;

export interface ElloFiveChatResult {
  ok: boolean;
  output: string;
  model: string;
  mode?: string;
  error?: string;
}

const DEFAULT_API =
  import.meta.env.VITE_ELLOFIVE_API_URL?.replace(/\/$/, '') ||
  'http://127.0.0.1:3000';

const DEFAULT_MODEL: ElloFiveModel =
  import.meta.env.VITE_ELLOFIVE_MODEL || 'ellofive';

export function getElloFiveApiBase(): string {
  return DEFAULT_API;
}

export function getElloFiveModel(): ElloFiveModel {
  return DEFAULT_MODEL;
}

/** Health check — ElloFive API gateway (requires `ellofive api` / Ollama). */
export async function checkElloFiveHealth(timeoutMs = 2500): Promise<{
  ok: boolean;
  detail: string;
}> {
  const base = getElloFiveApiBase();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/health`, { signal: ctrl.signal });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      models?: string[];
      runtimeProduct?: string;
    };
    if (!res.ok || data.ok === false) {
      return {
        ok: false,
        detail: data.error || `ElloFive unhealthy (${res.status}) at ${base}`,
      };
    }
    const models = Array.isArray(data.models) ? data.models.join(', ') : '';
    return {
      ok: true,
      detail: models
        ? `${data.runtimeProduct || 'ElloFive'} ready · ${models}`
        : `${data.runtimeProduct || 'ElloFive'} ready at ${base}`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      detail: `ElloFive offline at ${base}. Start with: ellofive serve && ellofive api (${msg})`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Send a user message to ElloFive (Ello5 model via /v1/chat).
 */
export async function askElloFive(
  message: string,
  options: { model?: ElloFiveModel; signal?: AbortSignal } = {}
): Promise<ElloFiveChatResult> {
  const base = getElloFiveApiBase();
  const model = options.model || getElloFiveModel();
  const text = message.trim();
  if (!text) {
    return { ok: false, output: '', model, error: 'Empty message' };
  }

  try {
    const res = await fetch(`${base}/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: options.signal,
      body: JSON.stringify({ message: text, model }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      output?: string;
      message?: { content?: string };
      error?: string;
      model?: string;
      mode?: string;
      status?: string;
    };

    if (!res.ok) {
      return {
        ok: false,
        output: '',
        model,
        error: data.error || `ElloFive chat failed (${res.status})`,
      };
    }

    const output = String(data.output ?? data.message?.content ?? '').trim();
    return {
      ok: true,
      output: output || '(empty reply)',
      model: data.model || model,
      mode: data.mode,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      output: '',
      model,
      error: `Cannot reach ElloFive at ${base}. Run your AI: ellofive serve && ellofive api — ${msg}`,
    };
  }
}
