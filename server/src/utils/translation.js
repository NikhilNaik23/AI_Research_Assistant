const {
  TRANSLATION_PROVIDER,
  TRANSLATION_FALLBACK_PROVIDER,
  LIBRETRANSLATE_URL,
  ARGOS_TRANSLATE_URL,
  TRANSLATION_TIMEOUT_MS,
} = require("../config/env");

function normalizeLanguageCode(language = "") {
  if (!language) return "";
  const code = String(language).trim().toLowerCase();
  if (code.length === 2) return code;
  return code.split("-")[0];
}

async function callLibreTranslate(markdown, targetLanguage, sourceLanguage = "auto") {
  const url = `${LIBRETRANSLATE_URL.replace(/\/$/, "")}/translate`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      q: markdown,
      source: sourceLanguage === "auto" ? "auto" : normalizeLanguageCode(sourceLanguage),
      target: normalizeLanguageCode(targetLanguage),
      format: "text",
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`LibreTranslate failed: ${response.status} ${errText}`);
  }

  const data = await response.json();
  return data.translatedText || data.translation || data.text || markdown;
}

async function translateMarkdown(markdown, targetLanguage, sourceLanguage = "auto", providerOverride = null) {
  if (!markdown || !String(markdown).trim()) return "";
  if (!targetLanguage || !String(targetLanguage).trim()) {
    throw new Error("targetLanguage is required");
  }

  const requestedProvider = providerOverride || TRANSLATION_PROVIDER;
  const fallbackProvider = TRANSLATION_FALLBACK_PROVIDER;
  const providers = [];

  if (requestedProvider) providers.push(requestedProvider);
  if (fallbackProvider && fallbackProvider !== requestedProvider) providers.push(fallbackProvider);

  let lastError = null;

  for (const provider of providers) {
    try {
      if (provider === "libretranslate") {
        return await callLibreTranslate(markdown, targetLanguage, sourceLanguage);
      }
    } catch (err) {
      lastError = err;
      console.warn(`[translation] ${provider} failed: ${err.message}`);
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error("No translation provider configured");
}

module.exports = { translateMarkdown };
