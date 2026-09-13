import React, { useCallback, useEffect, useRef, useState } from "react";
import { useOutletContext, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Button, Card, EmptyState, ErrorNote, StatusBadge } from "../components/ui";

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const { projectId } = useParams();
  const { project } = useOutletContext();
  const [documents, setDocuments] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const load = useCallback(() => {
    api
      .get(`/projects/${projectId}/documents`)
      .then(setDocuments)
      .catch((e) => setError(e.message));
  }, [projectId]);

  useEffect(() => {
    load();
    // Poll while any document is still processing, so status flips to
    // "ready" without a manual refresh.
    pollRef.current = setInterval(() => {
      setDocuments((current) => {
        if (current?.some((d) => d.status === "processing")) load();
        return current;
      });
    }, 3000);
    return () => clearInterval(pollRef.current);
  }, [load]);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
      await api.upload(`/projects/${projectId}/documents`, formData);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(docId) {
    await api.delete(`/projects/${projectId}/documents/${docId}`);
    load();
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl text-ink">Documents</h2>
          <p className="mt-1 text-sm text-ink/60">
            Upload source material for {project?.title || "this project"}. It's chunked and embedded so the
            Researcher agent and chat can search it.
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt,.md"
            onChange={handleFileChange}
            className="hidden"
            id="doc-upload"
          />
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : "Upload file"}
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <ErrorNote message={error} />
      </div>

      <div className="mt-4 space-y-2">
        {documents === null && <p className="text-sm text-ink/50">Loading…</p>}

        {documents?.length === 0 && (
          <EmptyState
            title="No documents yet"
            description="PDF, Word, or text files work. Once processed, their content becomes searchable context for research and chat."
          />
        )}

        {documents?.map((doc) => (
          <Card key={doc._id} className="flex items-center justify-between px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{doc.filename}</p>
              <p className="text-xs text-ink/45">
                {formatSize(doc.sizeBytes)}
                {doc.status === "ready" && ` · ${doc.chunkCount} chunks`}
                {doc.status === "failed" && doc.error && ` · ${doc.error}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={doc.status} />
              <button onClick={() => handleDelete(doc._id)} className="text-xs text-ink/40 hover:text-rust">
                Remove
              </button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
