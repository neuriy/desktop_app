import { randomUUID } from 'crypto';
import type { KnowledgeChunk } from '../types';
import { cosine, embedText } from '../memory/MemorySystem';
import { dataPath, readJsonFile, writeJsonFile } from '../store/JsonStore';
import { eventBus } from '../events/EventBus';

function chunkText(text: string, size = 500): string[] {
  const parts: string[] = [];
  const clean = text.replace(/\r/g, '').trim();
  for (let i = 0; i < clean.length; i += size) {
    parts.push(clean.slice(i, i + size));
  }
  return parts.filter(Boolean);
}

/**
 * RAG / Knowledge layer — ingest → chunk → embed → retrieve.
 * Embedding backend is swappable via ModelRouter later.
 */
export class KnowledgeSystem {
  private chunks: KnowledgeChunk[] = [];

  constructor() {
    this.chunks = readJsonFile<KnowledgeChunk[]>(dataPath('knowledge', 'chunks.json'), []);
  }

  private persist(): void {
    writeJsonFile(dataPath('knowledge', 'chunks.json'), this.chunks);
  }

  ingest(source: string, content: string, metadata?: Record<string, unknown>): number {
    const pieces = chunkText(content);
    for (const piece of pieces) {
      this.chunks.push({
        id: randomUUID(),
        source,
        content: piece,
        embedding: embedText(piece),
        metadata,
        createdAt: new Date().toISOString(),
      });
    }
    this.persist();
    return pieces.length;
  }

  search(query: string, limit = 5): KnowledgeChunk[] {
    const q = embedText(query);
    const hits = this.chunks
      .map((c) => ({ c, score: cosine(q, c.embedding || embedText(c.content)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .filter((x) => x.score > 0.04)
      .map((x) => x.c);

    if (hits.length) {
      eventBus.now('KnowledgeRetrieved', `Retrieved ${hits.length} knowledge chunks`, {
        sources: [...new Set(hits.map((h) => h.source))],
      });
    }
    return hits;
  }

  listSources(): string[] {
    return [...new Set(this.chunks.map((c) => c.source))];
  }
}

export const knowledge = new KnowledgeSystem();
