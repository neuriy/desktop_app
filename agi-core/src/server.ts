import express from 'express';
import cors from 'cors';
import { ensureDataDirs, AGI_DATA_ROOT } from './store/JsonStore';
import { registerBuiltinTools } from './tools/builtin';
import { createApiRouter } from './api/routes';
import { knowledge } from './knowledge/KnowledgeSystem';

ensureDataDirs();
registerBuiltinTools();

// Seed a small knowledge doc so RAG is non-empty out of the box
if (knowledge.listSources().length === 0) {
  knowledge.ingest(
    'neuriy://agi-core',
    [
      'Neuriy AGI Core is an agent orchestration system with memory, planning, tools, model routing, and permissions.',
      'It connects to the Neuriy Desktop tray app and uses ElloFive as the default local LLM provider.',
      'High-risk tools require explicit user approval. Workspace file tools are sandboxed under data/agi/workspace.',
    ].join('\n')
  );
}

const app = express();
const PORT = Number(process.env.NEURIY_AGI_PORT || 8787);

app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));
app.use(createApiRouter());

app.listen(PORT, () => {
  console.log(`Neuriy AGI Core listening on http://127.0.0.1:${PORT}`);
  console.log(`  data dir: ${AGI_DATA_ROOT}`);
  console.log(`  ElloFive: ${process.env.ELLOFIVE_API_URL || 'http://127.0.0.1:3000'}`);
});
