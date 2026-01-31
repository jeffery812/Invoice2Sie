import * as pdfjsLib from "../../vendor/pdfjs/pdf.mjs";
import { hasTextLayer } from "./placeholder.js";

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "../../vendor/pdfjs/pdf.worker.mjs",
  import.meta.url
).toString();

export async function parsePdfFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  let rawText = "";
  let hasAnyText = false;
  const pages = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const items = textContent.items || [];
    const pageText = items.map((item) => item.str || "").join(" ");
    rawText += `${pageText}\n`;
    pages.push({ pageNumber, items });
    if (hasTextLayer(items)) {
      hasAnyText = true;
    }
  }

  return {
    rawText: rawText.trim(),
    pages,
    needsOcr: !hasAnyText
  };
}
