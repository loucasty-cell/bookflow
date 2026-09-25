const FILENAME_FALLBACK = "bookflow-reading-notes";
const FILENAME_MAX_LENGTH = 60;
const REVOKE_DELAY_MS = 1000;

const pendingRevocations = new Map();

export const NOTES_EXPORT_STATUS = Object.freeze({
  IDLE: "idle",
  WORKING: "working",
  SUCCESS: "success",
  ERROR: "error",
});

export const NOTES_EXPORT_FAILURE_MESSAGE =
  "PDF export failed. Your notes are still saved locally. Use Markdown export to keep emoji and non-Latin text.";

/**
 * Sanitizes a title into a safe, lowercase, hyphenated download stem.
 */
export function sanitizeFilename(title) {
  const base = String(title ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, FILENAME_MAX_LENGTH)
    .replace(/^-+|-+$/g, "");
  return base ? `${base}-notes` : FILENAME_FALLBACK;
}

/**
 * Builds a full download filename from a title and a file extension.
 */
export function notesFilename(title, extension) {
  const suffix = String(extension ?? "").replace(/^\.+/, "").replace(/[^a-z0-9]+/gi, "").toLowerCase();
  return suffix ? `${sanitizeFilename(title)}.${suffix}` : sanitizeFilename(title);
}

/**
 * Revokes every object URL that is still pending so downloads never leak.
 */
export function revokePendingDownloads() {
  for (const [timer, url] of pendingRevocations) {
    clearTimeout(timer);
    URL.revokeObjectURL(url);
  }
  pendingRevocations.clear();
}

/**
 * Triggers a browser download and revokes the object URL once the click is done.
 */
export function downloadBlob(blob, filename) {
  if (typeof document === "undefined" || typeof URL === "undefined") return false;
  if (typeof URL.createObjectURL !== "function" || typeof document.createElement !== "function") return false;

  revokePendingDownloads();

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";

  let attached = false;
  try {
    if (document.body) {
      document.body.appendChild(anchor);
      attached = true;
    }
    anchor.click();
  } finally {
    if (attached && typeof anchor.remove === "function") {
      anchor.remove();
    } else if (attached && document.body) {
      document.body.removeChild(anchor);
    }
    const timer = setTimeout(() => {
      pendingRevocations.delete(timer);
      URL.revokeObjectURL(url);
    }, REVOKE_DELAY_MS);
    pendingRevocations.set(timer, url);
  }

  return true;
}

/**
 * Maps a failed export attempt to a user-facing message.
 */
export function describeNotesExportFailure(error) {
  const detail = String(error?.message ?? "").trim();
  if (!detail) return NOTES_EXPORT_FAILURE_MESSAGE;
  return `${NOTES_EXPORT_FAILURE_MESSAGE} (${detail.slice(0, 120)})`;
}

/**
 * Explains how many characters the PDF font could not draw.
 */
export function describeReplacedGlyphs(count) {
  const total = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
  if (!total) return "";
  const noun = total === 1 ? "character was" : "characters were";
  return `${total} emoji or non-Latin ${noun} replaced in the PDF. Markdown export keeps them.`;
}

/**
 * Runs the PDF export and resolves to an explicit outcome instead of throwing,
 * so callers can always render a user-visible success or error state.
 */
export async function runNotesPdfExport({
  notes = [],
  bookTitle = "Bookflow Reading Session",
  chapterTitle = "",
  progress = null,
  exportPdf,
} = {}) {
  const list = Array.isArray(notes) ? notes : [];
  if (!list.length || typeof exportPdf !== "function") {
    return { status: NOTES_EXPORT_STATUS.IDLE, result: null, message: "" };
  }

  try {
    const result = await exportPdf({
      notes: list,
      bookTitle: bookTitle || "Bookflow Reading Session",
      chapterTitle: chapterTitle || "",
      progress: Number.isFinite(progress) ? progress : null,
    });
    return { status: NOTES_EXPORT_STATUS.SUCCESS, result: result ?? null, message: "" };
  } catch (error) {
    return {
      status: NOTES_EXPORT_STATUS.ERROR,
      result: null,
      message: describeNotesExportFailure(error),
    };
  }
}
