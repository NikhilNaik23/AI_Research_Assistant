import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Button, Card, EmptyState, ErrorNote } from "../components/ui";

export default function ConversationsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState(null);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  function load() {
    api.get(`/projects/${projectId}/conversations`).then(setConversations).catch((e) => setError(e.message));
  }

  useEffect(load, [projectId]);

  async function handleNew() {
    setCreating(true);
    try {
      const conv = await api.post(`/projects/${projectId}/conversations`, {});
      navigate(`/projects/${projectId}/conversations/${conv._id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-2xl text-ink">Conversations</h2>
        <Button onClick={handleNew} disabled={creating}>
          {creating ? "Starting…" : "New conversation"}
        </Button>
      </div>

      <div className="mt-6">
        <ErrorNote message={error} />
      </div>

      <div className="mt-4 space-y-2">
        {conversations === null && <p className="text-sm text-ink/50">Loading…</p>}

        {conversations?.length === 0 && (
          <EmptyState
            title="No conversations yet"
            description="Ask questions grounded in your uploaded documents, the web, or both."
            action={<Button onClick={handleNew}>Start a conversation</Button>}
          />
        )}

        {conversations?.map((c) => (
          <Card
            key={c._id}
            className="cursor-pointer px-5 py-4 hover:border-pine"
            onClick={() => navigate(`/projects/${projectId}/conversations/${c._id}`)}
          >
            <p className="text-sm font-medium text-ink">{c.title}</p>
            <p className="mt-1 text-xs text-ink/40">{new Date(c.createdAt).toLocaleString()}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
