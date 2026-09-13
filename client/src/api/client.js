const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

function authHeaders() {
  const token = localStorage.getItem("fieldnotes_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function handle(res) {
  if (res.status === 204 || res.status === 202) {
    return res.status === 202 ? res.json() : null;
  }
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    throw new Error((isJson && data.message) || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  get: (path) => fetch(`${BASE_URL}${path}`, { headers: { ...authHeaders() } }).then(handle),

  post: (path, body) =>
    fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body || {}),
    }).then(handle),

  patch: (path, body) =>
    fetch(`${BASE_URL}${path}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body || {}),
    }).then(handle),

  delete: (path) =>
    fetch(`${BASE_URL}${path}`, { method: "DELETE", headers: { ...authHeaders() } }).then(handle),

  upload: (path, formData) =>
    fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { ...authHeaders() },
      body: formData,
    }).then(handle),

  fileUrl: (path) => `${BASE_URL}${path}`,

  // Parses a text/event-stream response body chunk by chunk, calling
  // onEvent(eventName, data) for each "event: X\ndata: Y" block. Used for
  // POST-based SSE endpoints (native EventSource can't send a POST body).
  async postSSE(path, body, { onEvent, signal } = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders() },
      body: JSON.stringify(body || {}),
      signal,
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Stream request failed (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);

        const eventLine = rawEvent.split("\n").find((l) => l.startsWith("event:"));
        const dataLine = rawEvent.split("\n").find((l) => l.startsWith("data:"));
        const eventName = eventLine ? eventLine.replace("event:", "").trim() : "message";
        const dataStr = dataLine ? dataLine.replace("data:", "").trim() : "";

        let data = null;
        try {
          data = dataStr ? JSON.parse(dataStr) : null;
        } catch {
          data = dataStr;
        }
        onEvent?.(eventName, data);
      }
    }
  },

  async getSSE(path, { onEvent, signal } = {}) {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { Accept: "text/event-stream", ...authHeaders() },
      signal,
    });

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `Stream request failed (${res.status})`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let boundary;
      while ((boundary = buffer.indexOf("\n\n")) !== -1) {
        const rawEvent = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const eventLine = rawEvent.split("\n").find((line) => line.startsWith("event:"));
        const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data:"));
        const eventName = eventLine ? eventLine.replace("event:", "").trim() : "message";
        const dataString = dataLine ? dataLine.replace("data:", "").trim() : "";

        let data = null;
        try {
          data = dataString ? JSON.parse(dataString) : null;
        } catch {
          data = dataString;
        }
        onEvent?.(eventName, data);
      }
    }
  },

  baseUrl: BASE_URL,
};

export function getToken() {
  return localStorage.getItem("fieldnotes_token");
}
export function setToken(token) {
  localStorage.setItem("fieldnotes_token", token);
}
export function clearToken() {
  localStorage.removeItem("fieldnotes_token");
}
