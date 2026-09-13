const cheerio = require("cheerio");
const { TOP_K_WEB_RESULTS, SEARCH_PROVIDER, TAVILY_API_KEY, SEARCH_TIMEOUT_MS } = require("../config/env");

function normalizeProjectText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function buildProjectAwareSearchQuery(message, project = null) {
  const subjectParts = [];
  const title = normalizeProjectText(project?.title || "")
    .replace(/\bpreparation\b/gi, "")
    .replace(/\bas per new format\b/gi, "")
    .replace(/\bproject\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (title) subjectParts.push(title);
  const desc = normalizeProjectText(project?.description || "");
  if (desc) subjectParts.push(desc);

  const domain = subjectParts.length ? subjectParts.join(" ") : "research";
  const cleanMessage = normalizeProjectText(message || "")
    .replace(/\brecent\b/gi, "")
    .replace(/\blatest\b/gi, "")
    .replace(/\bcase\s+studies\b/gi, "case study")
    .replace(/\bcontext\b/gi, "")
    .replace(/\b2026\b/gi, "")
    .trim();

  const baseTopic = cleanMessage || "research";
  const query = [
    `${baseTopic}`,
    `"${domain}"`,
  ].filter(Boolean).join(" ");

  return query;
}

async function searchTavily(query, limit) {
  if (!TAVILY_API_KEY) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${TAVILY_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        search_depth: "basic",
        max_results: limit,
        include_answer: true,
        include_raw_content: false,
      }),
      signal: controller.signal,
    });

    if (!res.ok) return [];

    const data = await res.json();
    const results = Array.isArray(data.results) ? data.results : [];
    return results
      .filter((r) => r?.title && r?.url && !/^https?:\/\/en\.wikipedia\.org\//i.test(r.url))
      .slice(0, limit)
      .map((r) => ({
        title: r.title,
        url: r.url,
        snippet: r.content || r.snippet || r.title,
        published_date: r.published_date || r.date || r.publishedDate || "",
        year: r.published_date ? new Date(r.published_date).getFullYear() : undefined,
      }));
  } catch (err) {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function searchDuckDuckGo(query, limit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEARCH_TIMEOUT_MS);

  try {
    const res = await fetch("https://html.duckduckgo.com/html/", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (research-assistant bot)",
      },
      body: new URLSearchParams({ q: query }),
      signal: controller.signal,
    });

    if (!res.ok) return [];

    const html = await res.text();
    const $ = cheerio.load(html);

    const results = [];
    $(".result").each((_, el) => {
      if (results.length >= limit) return;
      const titleEl = $(el).find(".result__title a");
      const snippetEl = $(el).find(".result__snippet");
      const title = titleEl.text().trim();
      let url = titleEl.attr("href") || "";
      const snippet = snippetEl.text().trim();

      const m = url.match(/uddg=([^&]+)/);
      if (m) url = decodeURIComponent(m[1]);

      if (title && url && !/^https?:\/\/en\.wikipedia\.org\//i.test(url)) {
        const snippetText = snippet || title;
        results.push({ title, url, snippet: snippetText });
      }
    });

    return results;
  } catch (err) {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

// Provider-backed web search. Prefer Tavily when an API key is available;
// otherwise the existing DuckDuckGo HTML fallback remains in place to keep
// the app functioning without credentials. Both return the same shape:
// [{ title, url, snippet }].
async function searchWeb(query, limit = TOP_K_WEB_RESULTS, project = null) {
  const contextualQuery = buildProjectAwareSearchQuery(query, project);

  if (SEARCH_PROVIDER === "tavily" && TAVILY_API_KEY) {
    const results = await searchTavily(contextualQuery, limit);
    if (results.length > 0) return results;
  }

  return searchDuckDuckGo(contextualQuery, limit);
}

module.exports = { searchWeb, buildProjectAwareSearchQuery };
