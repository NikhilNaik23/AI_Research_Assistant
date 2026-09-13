import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Button, Input, Textarea, Card, EmptyState, ErrorNote } from "../components/ui";

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  function load() {
    api.get("/projects").then(setProjects).catch((e) => setError(e.message));
  }

  useEffect(load, []);

  async function handleCreate(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const project = await api.post("/projects", { title, description });
      navigate(`/projects/${project._id}/conversations`);
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-line px-8 py-5">
        <h1 className="font-serif text-xl text-ink">Fieldnotes</h1>
        <div className="flex items-center gap-4 text-sm text-ink/60">
          <span>{user?.name}</span>
          <button onClick={logout} className="hover:text-pine">
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-8 py-10">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl text-ink">Your projects</h2>
          <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Cancel" : "New project"}</Button>
        </div>

        {showForm && (
          <Card className="mt-6 p-5">
            <form onSubmit={handleCreate} className="space-y-4">
              <Input label="Title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Federated Learning in Healthcare" />
              <Textarea
                label="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
              <ErrorNote message={error} />
              <Button type="submit" disabled={creating}>
                {creating ? "Creating…" : "Create project"}
              </Button>
            </form>
          </Card>
        )}

        <div className="mt-8 space-y-3">
          {projects === null && <p className="text-sm text-ink/50">Loading…</p>}

          {projects?.length === 0 && (
            <EmptyState
              title="No projects yet"
              description="Create a project to start researching a topic, uploading documents, and generating reports."
              action={<Button onClick={() => setShowForm(true)}>New project</Button>}
            />
          )}

          {projects?.map((p) => (
            <Card
              key={p._id}
              className="cursor-pointer px-5 py-4 hover:border-pine"
              onClick={() => navigate(`/projects/${p._id}/conversations`)}
            >
              <h3 className="font-serif text-lg text-ink">{p.title}</h3>
              {p.description && <p className="mt-1 text-sm text-ink/60">{p.description}</p>}
              <p className="mt-2 text-xs text-ink/40">
                Created {new Date(p.createdAt).toLocaleDateString()}
              </p>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
