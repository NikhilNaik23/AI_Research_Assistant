// Minimal in-memory SSE hub so the orchestrator can stream pipeline
// progress (planning / researching / writing / reviewing / done) to
// whichever client is subscribed to a given research task.
const subscribers = new Map(); // taskId -> Set<res>

function subscribe(taskId, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  res.write("\n");

  if (!subscribers.has(taskId)) subscribers.set(taskId, new Set());
  subscribers.get(taskId).add(res);

  res.on("close", () => {
    subscribers.get(taskId)?.delete(res);
  });
}

function emit(taskId, event, data) {
  const set = subscribers.get(taskId);
  if (!set) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of set) res.write(payload);
}

module.exports = { subscribe, emit };
