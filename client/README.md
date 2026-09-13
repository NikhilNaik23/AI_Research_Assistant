# Fieldnotes — Frontend

React + Vite + Tailwind UI for the multi-agent research backend, matching
the flow: Login/Register → Dashboard → Project → Conversations / Documents /
Research / Reports / Settings.

## Setup

```bash
cd frontend
cp .env.example .env    # point VITE_API_BASE_URL at your backend if not localhost:5000
npm install
npm run dev             # http://localhost:3000
```

Make sure the backend (`../server`) is running first — see its README.

## What's wired up

- **Auth** — register/login, JWT stored in `localStorage`, `AuthContext` gates all project routes.
- **Dashboard** — create/list projects.
- **Documents** — upload (multipart), polls status every 3s while any doc is `processing`.
- **Conversations** — "Ask AI" chat with `useFiles` / `useWebSearch` toggles; streams the
  assistant's answer token-by-token via the backend's SSE endpoint (parsed manually since
  it's a POST body, not a native `EventSource`).
- **Research** — kicks off the Supervisor→Researcher→Writer→Reviewer pipeline, then
  subscribes to `GET /research/:taskId/stream` with a native `EventSource` and renders
  live progress on a 4-step timeline, plus a running log of each pipeline event
  (plan ready, research done, draft ready, review done, supervisor decision).
- **Reports** — list, a lightweight Markdown viewer (no dependency — parses `#`/`##`/`- `
  itself), and Export to `.md` / `.pdf` (downloaded via authenticated `fetch` + blob, since
  the export routes require a Bearer token that a plain `<a href>` can't send).
- **Settings** — rename/describe/delete project.

## Design notes

- Palette: warm paper background, deep pine sidebar, muted gold for in-progress status —
  deliberately not the default SaaS blue-and-white or the cream+terracotta AI-generated look.
  Tokens live in `tailwind.config.js`.
- Typography: Fraunces (serif) for headings/report titles, IBM Plex Sans for UI — loaded via
  Google Fonts in `index.html`.
- The only numbered/stepped UI is the research pipeline timeline, because that's an actual
  sequence — everything else stays quiet and un-decorated.

## Known limitations (MVP scope)

- Markdown rendering is hand-rolled and only understands `#`, `##`, `- ` and paragraphs —
  fine for the Writer agent's output, not a general Markdown renderer.
- No optimistic conflict handling / websocket reconnection backoff on the SSE views — if the
  connection drops mid-pipeline, refresh and hit "Watch" on the task again.
- No design system beyond `components/ui.jsx` — extend those primitives rather than
  hand-styling new one-off components as the app grows.
