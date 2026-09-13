# Multi-Agent AI Research Assistant — Backend

Node/Express/MongoDB backend implementing the 4-agent pipeline
(Supervisor → Researcher → Writer → Reviewer), project-scoped document
RAG, streaming chat, and PDF/Markdown report export. Runs entirely on
**free, local LLMs via Ollama** — no API keys required.

## 1. Prerequisites

- Node.js 18+
- MongoDB running locally (or a connection string)
- [Ollama](https://ollama.com) installed and running

```bash
# pull the models used by default (swap in config/env if you prefer others)
ollama pull llama3.1
ollama pull nomic-embed-text
ollama serve   # usually already running as a background service
```

## 2. Install & run

```bash
cd server
cp .env.example .env     # edit if your Mongo/Ollama aren't on defaults
npm install
npm run dev               # or: npm start
```

Health check: `GET http://localhost:5000/api/health`

## 3. Architecture

```
src/
  agents/
    supervisorAgent.js   # Agent 1: plans queries, decides on iteration — never writes/researches
    researcherAgent.js    # Agent 2: web search + RAG retrieval -> ranked, deduped structured notes
    writerAgent.js         # Agent 3: notes -> structured report (Intro/Background/.../Conclusion)
    reviewerAgent.js       # Agent 4: checks claims vs evidence, flags hallucinations/contradictions
    orchestrator.js        # Runs the iterative Supervisor->Researcher->Writer->Reviewer loop + SSE progress
    prompts.js
  controllers/            # HTTP handlers per resource
  routes/                 # Express routers, nested under /api/projects/:projectId/...
  models/                 # Mongoose schemas (User, Project, Document, Chunk, Conversation, Message,
                           #                    ResearchTask, Report)
  utils/
    ollama.js              # chat / chatJSON / chatStream / embed against local Ollama
    webSearch.js            # keyless DuckDuckGo HTML search (swap in Tavily/SerpAPI later if you get keys)
    textExtract.js          # pdf / docx / txt -> plain text
    chunker.js               # overlapping text chunking for embeddings
    vectorStore.js           # brute-force cosine-similarity RAG retrieval over stored chunks
    pdfExport.js             # renders a Report to PDF with pdfkit
    sse.js                   # in-memory pub/sub for streaming pipeline progress
```

## 4. API reference

All routes except `/api/auth/*` and the research SSE stream require
`Authorization: Bearer <token>`.

### Auth
- `POST /api/auth/register` `{name, email, password}`
- `POST /api/auth/login` `{email, password}`
- `GET  /api/auth/me`

### Projects
- `POST   /api/projects` `{title, description}`
- `GET    /api/projects`
- `GET    /api/projects/:id`
- `PATCH  /api/projects/:id`
- `DELETE /api/projects/:id`

### Documents (RAG ingestion)
- `POST   /api/projects/:projectId/documents` — multipart, field `file` (.pdf/.docx/.txt)
  Processed asynchronously: extract → chunk → embed (Ollama) → store. Poll list for `status`.
- `GET    /api/projects/:projectId/documents`
- `DELETE /api/projects/:projectId/documents/:docId`

### Conversations (chat: Ask AI / Use Files / Web Search)
- `POST /api/projects/:projectId/conversations` `{title}`
- `GET  /api/projects/:projectId/conversations`
- `GET  /api/projects/:projectId/conversations/:conversationId/messages`
- `POST /api/projects/:projectId/conversations/:conversationId/ask`
  `{message, useFiles: bool, useWebSearch: bool}` — **SSE response**:
  `event: token` (streamed text) → ... → `event: done` `{message, sources}`

### Research pipeline (the 4-agent orchestration)
- `POST /api/projects/:projectId/research` `{goal, useWebSearch, useProjectDocs, maxIterations}`
  → `202 {taskId}`, kicks off the pipeline in the background
- `GET  /api/projects/:projectId/research/:taskId/stream` — **SSE**, subscribe to live progress:
  events: `status`, `plan_ready`, `iteration_start`, `research_done`, `draft_ready`,
  `review_done`, `supervisor_decision`, `completed`, `error`
- `GET  /api/projects/:projectId/research/:taskId` — full task doc (plan, iterations, finalReport)
- `GET  /api/projects/:projectId/research` — list tasks for a project

### Reports
- `GET /api/projects/:projectId/reports`
- `GET /api/projects/:projectId/reports/:reportId`
- `GET /api/projects/:projectId/reports/:reportId/export/markdown` — downloads `.md`
- `GET /api/projects/:projectId/reports/:reportId/export/pdf` — downloads `.pdf`

## 5. Example: run the full pipeline end-to-end

```bash
TOKEN=$(curl -s -X POST localhost:5000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Jane","email":"jane@example.com","password":"password123"}' | jq -r .token)

PROJECT_ID=$(curl -s -X POST localhost:5000/api/projects \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Federated Learning Research"}' | jq -r ._id)

TASK_ID=$(curl -s -X POST localhost:5000/api/projects/$PROJECT_ID/research \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"goal":"Research Federated Learning in Healthcare"}' | jq -r .taskId)

# Watch progress live:
curl -N localhost:5000/api/projects/$PROJECT_ID/research/$TASK_ID/stream

# Once status=completed, fetch the task to get finalReport, then export it:
curl localhost:5000/api/projects/$PROJECT_ID/research/$TASK_ID -H "Authorization: Bearer $TOKEN"
```

## 6. Notes & next steps

- **Vector store** is brute-force cosine similarity in Mongo — fine for MVP scale;
  swap `utils/vectorStore.js` for Qdrant/Milvus/pgvector when corpora grow.
- **Web search** uses keyless DuckDuckGo HTML scraping so it works with zero API keys.
  If you later get a Tavily/SerpAPI/Bing key, only `utils/webSearch.js` needs to change
  (same `[{title, url, snippet}]` return shape).
- **Models** are configurable via `.env` (`OLLAMA_CHAT_MODEL`, `OLLAMA_EMBED_MODEL`) —
  try `qwen2.5` or `mistral` if `llama3.1` is too slow on your hardware.
- Local models don't always obey "respond only with JSON" perfectly; `chatJSON()` in
  `utils/ollama.js` already does defensive parsing, but if you see failures, use a
  more instruction-tuned model or lower temperature.
- This is backend-only per your request — the frontend (Login/Dashboard/Project/
  Conversations/Documents/Reports UI from your flow diagram) is not included here.
