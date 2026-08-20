# Neuriy AGI Core

Agent orchestration backend for Neuriy Desktop. **Not** a raw LLM passthrough.

```text
Neuriy Desktop → Agent Interface → NEURIY AGI CORE
                                      ├── Reasoning / Agent Loop
                                      ├── Planning Engine
                                      ├── Memory (short + long)
                                      ├── Knowledge / RAG
                                      ├── Tool Engine + Permissions
                                      ├── Task Manager
                                      ├── Model Router → ElloFive / local
                                      └── Observability events
```

## Quick start

```bash
cd agi-core
npm install
npm run dev          # http://127.0.0.1:8787
```

Optional LLM: start [ElloFive](https://github.com/EricksonAtHome/ElloFive) (`ellofive serve && ellofive api`). If ElloFive is offline, the heuristic provider still completes the agent loop.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness |
| GET | `/agent/state` | Persistent agent identity snapshot |
| POST | `/agent/chat` | Full agent loop (`stream=true` for SSE) |
| POST | `/agent/tasks` | Start goal as autonomous task |
| GET | `/agent/tasks/:id` | Task state / progress |
| POST | `/agent/tasks/:id/pause\|resume\|cancel` | Control |
| GET/POST/DELETE | `/agent/memory` | Long-term memory |
| POST | `/agent/knowledge` | Ingest docs |
| POST | `/agent/approve` | Resolve permission prompts |
| GET | `/agent/events/stream` | Live agent events (SSE) |

## Phases delivered (MVP)

1. Agent Core + identity/state  
2. Memory (short-term + long-term + retrieval)  
3. Planning engine  
4. Tool system + permissions  
5. RAG / knowledge ingest+search  
6. Autonomous task states  
7. Desktop integration (client in `src/lib/agi-core.ts`)  
8. Background-ready task store + notifications queue  
9. Model router (ElloFive + offline heuristic)

## Data

Persisted under `data/agi/` (memory, knowledge, tasks, events, sandboxed workspace).
