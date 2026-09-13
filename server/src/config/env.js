const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

module.exports = {
  PORT: process.env.PORT || 5000,
  MONGO_URI: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/research_assistant",
  JWT_SECRET: process.env.JWT_SECRET || "dev_secret_change_me",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",

  OLLAMA_BASE_URL: process.env.OLLAMA_BASE_URL || "http://localhost:11434",
  OLLAMA_CHAT_MODEL: process.env.OLLAMA_CHAT_MODEL || "llama3.1",
  OLLAMA_EMBED_MODEL: process.env.OLLAMA_EMBED_MODEL?.trim() || "nomic-embed-text:latest",

  SEARCH_PROVIDER: process.env.SEARCH_PROVIDER || "duckduckgo",
  TAVILY_API_KEY: process.env.TAVILY_API_KEY || "",
  SEARCH_TIMEOUT_MS: parseInt(process.env.SEARCH_TIMEOUT_MS || "5000", 10),

  MAX_RESEARCH_ITERATIONS: parseInt(process.env.MAX_RESEARCH_ITERATIONS || "2", 10),
  TOP_K_WEB_RESULTS: parseInt(process.env.TOP_K_WEB_RESULTS || "20", 10),
  TOP_K_RAG_CHUNKS: parseInt(process.env.TOP_K_RAG_CHUNKS || "8", 10),

  TRANSLATION_PROVIDER: process.env.TRANSLATION_PROVIDER || "libretranslate",
  TRANSLATION_FALLBACK_PROVIDER: process.env.TRANSLATION_FALLBACK_PROVIDER || "",
  LIBRETRANSLATE_URL: process.env.LIBRETRANSLATE_URL || "http://localhost:5001",
  ARGOS_TRANSLATE_URL: process.env.ARGOS_TRANSLATE_URL || "",
  TRANSLATION_TIMEOUT_MS: parseInt(process.env.TRANSLATION_TIMEOUT_MS || "15000", 10),

  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || "http://localhost:3000",
};
