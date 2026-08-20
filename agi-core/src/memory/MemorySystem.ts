import { createHash, randomUUID } from 'crypto';
import type { MemoryKind, MemoryRecord } from '../types';
import { dataPath, readJsonFile, writeJsonFile } from '../store/JsonStore';
import { eventBus } from '../events/EventBus';

/** Lightweight local embedding (swap via ModelRouter embedding role later). */
export function embedText(text: string, dims = 64): number[] {
  const vec = new Array(dims).fill(0);
  const tokens = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  for (const tok of tokens) {
    const h = createHash('sha256').update(tok).digest();
    for (let i = 0; i < dims; i++) {
      vec[i] += (h[i % h.length] - 128) / 128;
    }
  }
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
}

export function cosine(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  let dot = 0;
  for (let i = 0; i < n; i++) dot += a[i] * b[i];
  return dot;
}

function classifyPersistence(content: string): MemoryKind {
  const lower = content.toLowerCase();
  if (
    /\b(prefer|always|never|my name is|i am|password|api key|secret)\b/.test(lower)
  ) {
    return 'important';
  }
  if (/\b(project|decision|workflow|remember|todo)\b/.test(lower)) {
    return 'persistent';
  }
  if (content.length < 40) return 'temporary';
  return 'relevant';
}

export class MemorySystem {
  private shortTerm: {
    conversation: Array<{ role: string; content: string }>;
    currentTask?: string;
    recentToolResults: string[];
    temp: Record<string, unknown>;
  } = { conversation: [], recentToolResults: [], temp: {} };

  private longTerm: MemoryRecord[] = [];

  constructor() {
    this.longTerm = readJsonFile<MemoryRecord[]>(dataPath('memory', 'long-term.json'), []);
  }

  getShortTerm() {
    return this.shortTerm;
  }

  pushConversation(role: string, content: string): void {
    this.shortTerm.conversation.push({ role, content });
    if (this.shortTerm.conversation.length > 40) {
      this.shortTerm.conversation = this.shortTerm.conversation.slice(-40);
    }
  }

  recordToolResult(summary: string): void {
    this.shortTerm.recentToolResults.push(summary);
    if (this.shortTerm.recentToolResults.length > 20) {
      this.shortTerm.recentToolResults.shift();
    }
  }

  setCurrentTask(task?: string): void {
    this.shortTerm.currentTask = task;
  }

  private persist(): void {
    const durable = this.longTerm.filter((m) => m.kind !== 'temporary');
    writeJsonFile(dataPath('memory', 'long-term.json'), durable);
  }

  /** Decide whether to store; skips ephemeral chatter. */
  maybeRemember(content: string, category = 'general', userId?: string): MemoryRecord | null {
    const kind = classifyPersistence(content);
    if (kind === 'temporary') return null;
    if (content.trim().length < 12) return null;

    const record: MemoryRecord = {
      id: randomUUID(),
      kind,
      category,
      content: content.trim(),
      userId,
      embedding: embedText(content),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.longTerm.push(record);
    this.persist();
    return record;
  }

  add(
    content: string,
    opts: { kind?: MemoryKind; category?: string; userId?: string } = {}
  ): MemoryRecord {
    const record: MemoryRecord = {
      id: randomUUID(),
      kind: opts.kind || 'persistent',
      category: opts.category || 'general',
      content: content.trim(),
      userId: opts.userId,
      embedding: embedText(content),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.longTerm.push(record);
    this.persist();
    return record;
  }

  list(userId?: string): MemoryRecord[] {
    return this.longTerm.filter((m) => !userId || !m.userId || m.userId === userId);
  }

  delete(id: string): boolean {
    const before = this.longTerm.length;
    this.longTerm = this.longTerm.filter((m) => m.id !== id);
    this.persist();
    return this.longTerm.length < before;
  }

  retrieve(query: string, limit = 5, userId?: string): MemoryRecord[] {
    const q = embedText(query);
    const scored = this.list(userId)
      .map((m) => ({
        m,
        score: cosine(q, m.embedding || embedText(m.content)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .filter((x) => x.score > 0.05);

    if (scored.length) {
      eventBus.now(
        'MemoryRetrieved',
        `Retrieved ${scored.length} memories`,
        { ids: scored.map((s) => s.m.id) }
      );
    }
    return scored.map((s) => s.m);
  }

  contextBlock(query: string, userId?: string): string {
    const hits = this.retrieve(query, 5, userId);
    if (!hits.length) return '';
    return hits.map((h) => `- [${h.category}/${h.kind}] ${h.content}`).join('\n');
  }
}

export const memory = new MemorySystem();
