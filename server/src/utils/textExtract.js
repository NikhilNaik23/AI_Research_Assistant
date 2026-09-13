const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

// Extracts plain text from an uploaded file buffer based on its mime type.
async function extractText(buffer, mimeType, filename = "") {
  if (mimeType === "application/pdf" || filename.endsWith(".pdf")) {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    filename.endsWith(".docx")
  ) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  // Fallback: treat as plain text (.txt, .md, etc.)
  return buffer.toString("utf-8");
}

module.exports = { extractText };
