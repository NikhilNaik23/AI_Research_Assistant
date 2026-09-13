import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Button, Card, ErrorNote, Input, Textarea } from "../components/ui";

export default function SettingsPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get(`/projects/${projectId}`).then((p) => {
      setTitle(p.title);
      setDescription(p.description || "");
    });
  }, [projectId]);

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      await api.patch(`/projects/${projectId}`, { title, description });
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this project? This cannot be undone.")) return;
    await api.delete(`/projects/${projectId}`);
    navigate("/dashboard");
  }

  return (
    <div className="mx-auto max-w-2xl px-8 py-10">
      <h2 className="font-serif text-2xl text-ink">Settings</h2>

      <Card className="mt-6 p-5">
        <form onSubmit={handleSave} className="space-y-4">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          <ErrorNote message={error} />
          {saved && <p className="text-sm text-pine">Saved.</p>}
          <Button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save changes"}
          </Button>
        </form>
      </Card>

      <Card className="mt-6 border-rust/30 p-5">
        <h3 className="font-medium text-ink">Danger zone</h3>
        <p className="mt-1 text-sm text-ink/60">
          Deleting a project removes it, but not its documents or reports from the database directly — clean those up
          first if needed.
        </p>
        <Button variant="danger" className="mt-3" onClick={handleDelete}>
          Delete project
        </Button>
      </Card>
    </div>
  );
}
