import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Button, Card, EmptyState, ErrorNote, StatusBadge, Textarea } from "../components/ui";
import PipelineTimeline from "../components/PipelineTimeline";

const EVENT_LABELS = {
  plan_ready: "Supervisor planned the research queries",
  iteration_start: "Starting research iteration",
  research_done: "Researcher gathered and ranked sources",
  draft_ready: "Writer produced a draft",
  review_done: "Reviewer checked the draft for gaps",
  supervisor_decision: "Supervisor decided on next step",
  completed: "Report finalized",
  error: "Pipeline error",
};

export default function ResearchPage() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState(null);
  const [goal, setGoal] = useState("");
  const [useWebSearch, setUseWebSearch] = useState(true);
  const [useProjectDocs, setUseProjectDocs] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const [activeTaskId, setActiveTaskId] = useState(null);
  const [status, setStatus] = useState(null);
  const [iteration, setIteration] = useState(null);
  const [log, setLog] = useState([]);
  const [finalReportId, setFinalReportId] = useState(null);
  const streamAbortRef = useRef(null);

  const loadTasks = useCallback(() => {
    api.get(`/projects/${projectId}/research`).then(setTasks).catch((e) => setError(e.message));
  }, [projectId]);

  useEffect(loadTasks, [loadTasks]);

  useEffect(() => () => streamAbortRef.current?.abort(), []);

  async function watchTask(taskId, initialStatus = "queued") {
    streamAbortRef.current?.abort();
    const controller = new AbortController();
    streamAbortRef.current = controller;
    setError("");
    setActiveTaskId(taskId);
    setStatus(initialStatus);
    setIteration(null);
    setLog([]);
    setFinalReportId(null);

    try {
      const task = await api.get(`/projects/${projectId}/research/${taskId}`);
      if (controller.signal.aborted) return;
      setStatus(task.status);
      setIteration(task.currentIteration || null);
      setLog(task.log || []);
      setFinalReportId(task.finalReport?._id || task.finalReport || null);
      setError(task.error || "");
      setTasks((current) => current?.map((item) => item._id === taskId
        ? { ...item, status: task.status, finalReport: task.finalReport }
        : item));
      if (["completed", "failed"].includes(task.status)) return;
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err.message);
        setStatus("failed");
      }
      return;
    }

    api.getSSE(`/projects/${projectId}/research/${taskId}/stream`, {
      signal: controller.signal,
      onEvent: (event, data) => {
        if (event === "status" && data?.status) {
          setStatus(data.status);
          setTasks((current) => current?.map((task) => task._id === taskId ? { ...task, status: data.status } : task));
        }
        if (event === "iteration_start" && data) {
          setIteration(data.iteration);
          setLog((l) => [...l, { ts: new Date(), event, data }]);
        }
        if (["plan_ready", "research_done", "draft_ready", "review_done", "supervisor_decision", "error"].includes(event) && data) {
          setLog((l) => [...l, { ts: new Date(), event, data }]);
        }
        if (event === "completed" && data?.reportId) {
          setStatus("completed");
          setFinalReportId(data.reportId);
          setTasks((current) => current?.map((task) => task._id === taskId
            ? { ...task, status: "completed", finalReport: data.reportId }
            : task));
          loadTasks();
          controller.abort();
        }
        if (event === "error" && data?.message) {
          setStatus("failed");
          setError(data.message);
          setTasks((current) => current?.map((task) => task._id === taskId ? { ...task, status: "failed" } : task));
        }
      },
    }).catch((err) => {
      if (err.name !== "AbortError") {
        setError(`Live updates disconnected: ${err.message}`);
      }
    });
  }

  async function handleStart(e) {
    e.preventDefault();
    setStarting(true);
    setError("");
    try {
      const { taskId } = await api.post(`/projects/${projectId}/research`, {
        goal,
        useWebSearch,
        useProjectDocs,
      });
      setGoal("");
      loadTasks();
      watchTask(taskId, "queued");
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <h2 className="font-serif text-2xl text-ink">Research</h2>
      <p className="mt-1 text-sm text-ink/60">
        Give the Supervisor a goal. It plans queries, the Researcher gathers and ranks sources, the Writer drafts a
        report, and the Reviewer checks it — looping if gaps are found.
      </p>

      <Card className="mt-6 p-5">
        <form onSubmit={handleStart} className="space-y-4">
          <Textarea
            label="Research goal"
            required
            rows={2}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Research Federated Learning in Healthcare"
          />
          <div className="flex gap-5 text-sm text-ink/70">
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={useWebSearch} onChange={(e) => setUseWebSearch(e.target.checked)} />
              Search the web
            </label>
            <label className="flex items-center gap-1.5">
              <input type="checkbox" checked={useProjectDocs} onChange={(e) => setUseProjectDocs(e.target.checked)} />
              Use project documents
            </label>
          </div>
          <ErrorNote message={error} />
          <Button type="submit" disabled={starting}>
            {starting ? "Starting…" : "Start research"}
          </Button>
        </form>
      </Card>

      {activeTaskId && (
        <div className="mt-8">
          <PipelineTimeline status={status} iteration={iteration} error={error} />

          {finalReportId && (
            <div className="mt-4 flex justify-center">
              <Button onClick={() => navigate(`/projects/${projectId}/reports/${finalReportId}`)}>
                View report
              </Button>
            </div>
          )}

          {log.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-xs font-medium text-ink/40">Pipeline log</p>
              {log.map((entry, i) => (
                <div key={i} className="border border-line bg-white px-4 py-2.5 text-sm text-ink/70">
                  {EVENT_LABELS[entry.event] || entry.event}
                  {entry.event === "supervisor_decision" && (
                    <span className="ml-1 text-ink/45">
                      — {entry.data.continue ? "requested another pass" : "approved, stopping here"}
                    </span>
                  )}
                  {entry.event === "review_done" && entry.data.issues?.length > 0 && (
                    <span className="ml-1 text-ink/45">— flagged {entry.data.issues.length} issue(s)</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mt-10">
        <h3 className="font-serif text-lg text-ink">Past research tasks</h3>
        <div className="mt-3 space-y-2">
          {tasks === null && <p className="text-sm text-ink/50">Loading…</p>}
          {tasks?.length === 0 && <EmptyState title="No research runs yet" description="Start one above." />}
          {tasks?.map((t) => (
            <Card key={t._id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-ink">{t.goal}</p>
                <p className="text-xs text-ink/40">{new Date(t.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={t.status} />
                {t.status === "completed" && t.finalReport ? (
                  <Button variant="ghost" onClick={() => navigate(`/projects/${projectId}/reports/${t.finalReport}`)}>
                    View report
                  </Button>
                ) : t.status !== "completed" && t.status !== "failed" && t._id !== activeTaskId ? (
                  <Button variant="ghost" onClick={() => watchTask(t._id, t.status)}>
                    Watch
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
