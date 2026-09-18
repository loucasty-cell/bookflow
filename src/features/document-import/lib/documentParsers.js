import { validateBookFile, ACCEPTED_FILES } from "./fileValidation.js";
import { parsePdf } from "./pdfParser.js";
import { parseEpub } from "./epubParser.js";
import { parseTextDocument } from "./textParser.js";
import { mark } from "../../../shared/lib/perfMarks.js";

export async function parseDocument(file, onProgress) {
  mark("import-selected");
  onProgress?.(10, "Verifying this book file");
  const extension = await validateBookFile(file);
  mark("validation-done");

  if (extension === "pdf") return parsePdf(file, onProgress);
  if (extension === "epub") return parseEpub(file, onProgress);

  onProgress?.(45, "Reading your document");
  mark("native-text-done");
  const source = await file.text();
  const result = parseTextDocument(file, source);
  if (!result.chapters.length)
    throw new Error("No readable text was found in this document.");
  mark("chapters-done");
  onProgress?.(100, "Preparing your reading flow");
  return result;
}

export { ACCEPTED_FILES };
