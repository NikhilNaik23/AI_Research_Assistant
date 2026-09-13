import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, getToken } from "../api/client";
import { Button, ErrorNote } from "../components/ui";



function renderInlineMarkdown(text) {
  const tokenRegex = /(\*\*[^*]+\*\*|__[^_]+__)/g;
  const nodes = [];
  let pointer = 0;

  text.replace(tokenRegex, (match, token, offset) => {
    if (offset > pointer) {
      nodes.push(text.slice(pointer, offset));
    }

    if (token.startsWith("**")) {
      nodes.push(<strong key={`${offset}-${token}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("__")) {
      nodes.push(
        <span key={`${offset}-${token}`} className="underline decoration-2 underline-offset-2">
          {token.slice(2, -2)}
        </span>
      );
    }

    pointer = offset + token.length;
  });

  if (pointer < text.length) {
    nodes.push(text.slice(pointer));
  }

  return <>{nodes}</>;
}

// Minimal Markdown-ish renderer (headings, bullets, paragraphs) so we don't
// need a markdown dependency for a fairly simple report structure.
function MarkdownBody({ markdown }) {
  const lines = markdown.split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const trimmed = line.trim();

        if (trimmed.startsWith("### ")) {
          return (
            <h4 key={i} className="pt-4 font-serif text-base font-semibold uppercase tracking-wide text-ink">
              {renderInlineMarkdown(line.replace(/^###\s*/, ""))}
            </h4>
          );
        }

        if (trimmed.startsWith("## ")) {
          return (
            <h3 key={i} className="pt-4 font-serif text-lg font-semibold text-ink">
              {renderInlineMarkdown(line.replace(/^##\s*/, ""))}
            </h3>
          );
        }

        if (trimmed.startsWith("# ")) {
          return (
            <h2 key={i} className="pt-2 font-serif text-2xl font-bold text-ink">
              {renderInlineMarkdown(line.replace(/^#\s*/, ""))}
            </h2>
          );
        }

        if (trimmed.startsWith("* ") || trimmed.startsWith("- ")) {
          return (
            <li key={i} className="ml-5 list-disc text-sm leading-relaxed text-ink/80">
              {renderInlineMarkdown(trimmed.slice(2))}
            </li>
          );
        }

        if (trimmed.length === 0) return null;

        return (
          <p key={i} className="text-sm leading-relaxed text-ink/80">
            {renderInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
}

async function downloadFile(url, filename) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new Error("Export failed");
  const blob = await res.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(objectUrl);
}

export default function ReportViewerPage() {
  const { projectId, reportId } = useParams();
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/projects/${projectId}/reports/${reportId}`)
      .then((data) => {
        setReport(data);
      })
      .catch((e) => setError(e.message));
  }, [projectId, reportId]);

  if (error) return <div className="p-8"><ErrorNote message={error} /></div>;
  if (!report) return <p className="p-8 text-sm text-ink/50">Loading…</p>;

  const safeName = report.topic.replace(/\s+/g, "_");

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl text-ink">{report.topic}</h2>
          <p className="mt-1 text-xs text-ink/40">{new Date(report.createdAt).toLocaleString()}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            onClick={() =>
              downloadFile(api.fileUrl(`/projects/${projectId}/reports/${reportId}/export/markdown`), `${safeName}.md`)
            }
          >
            Export .md
          </Button>
          <Button
            onClick={() =>
              downloadFile(api.fileUrl(`/projects/${projectId}/reports/${reportId}/export/pdf`), `${safeName}.pdf`)
            }
          >
            Export PDF
          </Button>
        </div>
      </div>

      <article className="mt-8 border border-line bg-white px-6 py-6">
        <MarkdownBody markdown={report.markdown} />
      </article>

      {report.sources?.length > 0 && (
        <div className="mt-6">
          <h3 className="font-serif text-lg text-ink">References</h3>
          <ol className="mt-2 space-y-1.5">
            {report.sources.map((s, i) => (
              <li key={i} className="text-sm text-ink/70">
                {i + 1}.{" "}
                {s.url ? (
                  <a href={s.url} target="_blank" rel="noreferrer" className="text-pine hover:text-pine-dark">
                    {s.title}
                  </a>
                ) : (
                  s.title
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {report.reviewNotes?.summary && (
        <div className="mt-6 border border-gold/30 bg-gold-light/40 px-4 py-3 text-sm text-ink/70">
          <p className="font-medium text-ink">Reviewer notes</p>
          <p className="mt-1">{report.reviewNotes.summary}</p>
        </div>
      )}
    </div>
  );
}
