const PDFDocument = require("pdfkit");

// Renders a report's markdown-ish sections into a simple, readable PDF.
// Streams directly to the given writable (e.g. an HTTP response).
function renderReportToPdf(report, writableStream) {
  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(writableStream);

  doc.fontSize(20).font("Helvetica-Bold").text(report.topic, { align: "left" });
  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica").fillColor("gray")
    .text(`Generated ${new Date(report.createdAt || Date.now()).toLocaleString()}`);
  doc.fillColor("black");
  doc.moveDown();

  const lines = report.markdown.split("\n");
  for (const line of lines) {
    if (line.startsWith("# ")) {
      doc.moveDown(0.5).fontSize(16).font("Helvetica-Bold").text(line.replace(/^#\s*/, ""));
    } else if (line.startsWith("## ")) {
      doc.moveDown(0.5).fontSize(13).font("Helvetica-Bold").text(line.replace(/^##\s*/, ""));
    } else if (line.trim().startsWith("- ")) {
      doc.fontSize(11).font("Helvetica").text(`•  ${line.trim().slice(2)}`, { indent: 15 });
    } else if (line.trim().length === 0) {
      doc.moveDown(0.3);
    } else {
      doc.fontSize(11).font("Helvetica").text(line);
    }
  }

  if (report.sources?.length) {
    doc.addPage();
    doc.fontSize(14).font("Helvetica-Bold").text("Sources");
    doc.moveDown(0.5);
    report.sources.forEach((s, i) => {
      doc.fontSize(10).font("Helvetica").text(`${i + 1}. ${s.title || s.url}`, { link: s.url });
      if (s.url) doc.fillColor("blue").text(s.url, { link: s.url }).fillColor("black");
      doc.moveDown(0.3);
    });
  }

  doc.end();
}

module.exports = { renderReportToPdf };
