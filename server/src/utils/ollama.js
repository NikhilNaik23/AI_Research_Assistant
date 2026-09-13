const { OLLAMA_BASE_URL, OLLAMA_CHAT_MODEL, OLLAMA_EMBED_MODEL } = require("../config/env");

// Thin client around a local Ollama instance (https://ollama.com).
// No API key needed - just `ollama pull llama3.1` and `ollama pull nomic-embed-text`
// and make sure `ollama serve` is running.

async function chat(messages, { model = OLLAMA_CHAT_MODEL, temperature = 0.3, format = null, numPredict = null } = {}) {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: { temperature, ...(numPredict ? { num_predict: numPredict } : {}) },
      ...(format ? { format } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama chat request failed (${res.status}): ${text}`);
  }

  const data = await res.json();
  return data?.message?.content ?? "";
}

// Asks the model for strict JSON and parses it defensively, since local
// models don't always respect formatting instructions perfectly.
async function chatJSON(messages, opts = {}) {
  const raw = await chat(messages, { ...opts, format: "json", numPredict: opts.numPredict || 12000 });
  try {
    return JSON.parse(raw);
  } catch (e) {
    const match = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        // fall through
      }
    }
    throw new Error(`Model did not return valid JSON: ${raw.slice(0, 300)}`);
  }
}

async function embed(text, { model = OLLAMA_EMBED_MODEL } = {}) {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, prompt: text }),
  });

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Ollama embeddings request failed for model "${model}" (${res.status}): ${t}`);
  }

  const data = await res.json();
  return data.embedding;
}

// Streams a chat completion token-by-token, invoking onToken(text) for each
// piece as it arrives. Used to power the "Streaming Response" chat flow.
async function chatStream(messages, onToken, { model = OLLAMA_CHAT_MODEL, temperature = 0.3 } = {}) {
  const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, stream: true, options: { temperature } }),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => "");
    throw new Error(`Ollama stream request failed (${res.status}): ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let lineEnd;
    while ((lineEnd = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, lineEnd).trim();
      buffer = buffer.slice(lineEnd + 1);
      if (!line) continue;

      const parsed = JSON.parse(line);
      const piece = parsed?.message?.content || "";
      if (piece) {
        full += piece;
        onToken(piece);
      }
      if (parsed.done) return full;
    }
  }

  return full;
}

module.exports = { chat, chatJSON, embed, chatStream };
