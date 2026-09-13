// Splits long text into overlapping chunks for embedding + retrieval.
function chunkText(text, chunkSize = 1000, overlap = 150) {
  const clean = text.replace(/\s+/g, " ").trim();
  const chunks = [];
  let start = 0;

  while (start < clean.length) {
    const end = Math.min(start + chunkSize, clean.length);
    chunks.push(clean.slice(start, end));
    if (end === clean.length) break;
    start = end - overlap;
  }

  return chunks.filter((c) => c.trim().length > 30);
}

module.exports = { chunkText };
