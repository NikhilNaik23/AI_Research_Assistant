import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../api/client";
import { Button, ErrorNote } from "../components/ui";

function SourceChip({ source }) {
  const label = source.origin === "web" ? source.title : `📄 ${source.title}`;
  return source.url ? (
    <a
      href={source.url}
      target="_blank"
      rel="noreferrer"
      className="rounded-sm border border-line px-2 py-0.5 text-xs text-ink/60 hover:border-pine hover:text-pine"
    >
      {label}
    </a>
  ) : (
    <span className="rounded-sm border border-line px-2 py-0.5 text-xs text-ink/60">{label}</span>
  );
}

function InlineText({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g).filter(Boolean);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("__") && part.endsWith("__")) {
      return <u key={index}>{part.slice(2, -2)}</u>;
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

function AssistantContent({ content }) {
  const lines = content.replace(/^\s*```(?:markdown)?\s*$/gim, "").replace(/^\s*"{3}\s*$/gm, "").split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, index) => {
        const heading = line.match(/^\s*#{1,6}\s+(.+)$/);
        if (heading) {
          return <h3 key={index} className="pt-2 text-base font-semibold text-ink"><InlineText text={heading[1]} /></h3>;
        }
        if (/^\s*[-*_]{3,}\s*$/.test(line)) return null;
        if (/^\s*[-*]\s+/.test(line)) {
          return <li key={index} className="ml-5 list-disc"><InlineText text={line.replace(/^\s*[-*]\s+/, "")} /></li>;
        }
        if (!line.trim()) return null;
        return <p key={index}><InlineText text={line} /></p>;
      })}
    </div>
  );
}

export default function ChatPage() {
  const { projectId, conversationId } = useParams();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [useFiles, setUseFiles] = useState(false);
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [streaming, setStreaming] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const scrollRef = useRef(null);

  useEffect(() => {
    api.get(`/projects/${projectId}/conversations/${conversationId}/messages`).then(setMessages);
  }, [projectId, conversationId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  async function handleSend(e) {
    e.preventDefault();
    if (!input.trim() || busy) return;
    const userMessage = { role: "user", content: input, _id: `local-${Date.now()}` };
    setMessages((m) => [...m, userMessage]);
    setInput("");
    setStreaming("");
    setBusy(true);
    setError("");

    let full = "";
    try {
      await api.postSSE(
        `/projects/${projectId}/conversations/${conversationId}/ask`,
        { message: userMessage.content, useFiles, useWebSearch },
        {
          onEvent: (event, data) => {
            if (event === "token") {
              full += data.token;
              setStreaming(full);
            } else if (event === "done") {
              setMessages((m) => [...m, data.message]);
              setStreaming("");
            } else if (event === "error") {
              setError(data.message);
            }
          },
        }
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-screen flex-col">
      <div className="flex items-center justify-between border-b border-line px-8 py-4">
        <h2 className="font-serif text-lg text-ink">Ask AI</h2>
        <div className="flex items-center gap-4 text-sm text-ink/60">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={useFiles} onChange={(e) => setUseFiles(e.target.checked)} />
            Use files
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={useWebSearch} onChange={(e) => setUseWebSearch(e.target.checked)} />
            Web search
          </label>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-5 overflow-y-auto px-8 py-6 scrollbar-thin">
        {messages.length === 0 && !streaming && (
          <p className="text-sm text-ink/45">
            Ask a question. Toggle "Use files" to ground answers in your uploaded documents, or "Web search" to pull
            in live sources.
          </p>
        )}

        {messages.map((m) => (
          <div key={m._id} className={m.role === "user" ? "text-right" : "text-left"}>
            <div
              className={`inline-block max-w-2xl rounded-sm px-4 py-2.5 text-sm ${
                m.role === "user" ? "bg-pine text-white" : "border border-line bg-white text-ink"
              }`}
              style={{ textAlign: "left" }}
            >
              {m.role === "assistant" ? <AssistantContent content={m.content} /> : <p className="whitespace-pre-wrap">{m.content}</p>}
            </div>
            {m.sources?.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {m.sources.map((s, i) => (
                  <SourceChip key={i} source={s} />
                ))}
              </div>
            )}
          </div>
        ))}

        {streaming && (
          <div className="text-left">
            <div className="inline-block max-w-2xl rounded-sm border border-line bg-white px-4 py-2.5 text-sm text-ink">
              <AssistantContent content={streaming} />
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-line px-8 py-4">
        <ErrorNote message={error} />
        <form onSubmit={handleSend} className="mt-2 flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your documents or the web…"
            className="flex-1 rounded-sm border border-line bg-white px-3 py-2 text-sm focus:border-pine"
            disabled={busy}
          />
          <Button type="submit" disabled={busy || !input.trim()}>
            {busy ? "Thinking…" : "Send"}
          </Button>
        </form>
      </div>
    </div>
  );
}
