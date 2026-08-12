export const MAX_FILE_SIZE = 50 * 1024 * 1024;
export const SUPPORTED_EXTENSIONS = ["pdf", "epub", "txt", "md", "markdown"];
export const ACCEPTED_FILES = ".pdf,.epub,.txt,.md,.markdown";

const TEXT_SAMPLE_SIZE = 128 * 1024;

export function extensionOf(name = "") {
  return name.toLowerCase().split(".").pop();
}

function startsWith(bytes, signature) {
  return signature.every((value, index) => bytes[index] === value);
}

function hasZipSignature(bytes) {
  return [
    [0x50, 0x4b, 0x03, 0x04],
    [0x50, 0x4b, 0x05, 0x06],
    [0x50, 0x4b, 0x07, 0x08],
  ].some((signature) => startsWith(bytes, signature));
}

function validateTextSample(sample, extension) {
  const source = String(sample ?? "");
  const trimmed = source.trim();
  const controlCharacters = [...source].filter((character) => {
    const code = character.charCodeAt(0);
    return code === 0 || (code < 32 && ![9, 10, 13].includes(code));
  }).length;
  const readableTokens = trimmed.match(/[\p{L}\p{N}]+/gu) ?? [];

  if (!trimmed || controlCharacters / Math.max(1, source.length) > 0.02) {
    throw new Error(
      `This .${extension} file does not look like readable book text. Choose a plain-text or Markdown book.`,
    );
  }

  if (/^\s*(?:<!doctype\s+html|<html\b)/i.test(source)) {
    throw new Error(
      "This looks like an HTML page, not a supported book file. Choose PDF, EPUB, TXT, or Markdown.",
    );
  }

  if (readableTokens.length < 8) {
    throw new Error(
      `This .${extension} file is too short to identify as readable book content.`,
    );
  }
}

export function validateFileDescriptor({ name, size, headerBytes, textSample }) {
  if (!name) throw new Error("Choose a document first.");
  if (!size) throw new Error("This file is empty and cannot be opened as a book.");
  if (size > MAX_FILE_SIZE)
    throw new Error("Please choose a file smaller than 50 MB.");

  const extension = extensionOf(name);
  if (!SUPPORTED_EXTENSIONS.includes(extension)) {
    throw new Error(
      "This does not look like a supported book file. Bookflow accepts PDF, EPUB, TXT, and Markdown.",
    );
  }

  const bytes = [...(headerBytes ?? [])];
  if (
    extension === "pdf" &&
    !startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])
  ) {
    throw new Error(
      "This file has a .pdf name but is not a valid PDF book. Choose the original PDF file.",
    );
  }

  if (extension === "epub" && !hasZipSignature(bytes)) {
    throw new Error(
      "This file has an .epub name but is not a valid EPUB book. Choose the original EPUB file.",
    );
  }

  if (["txt", "md", "markdown"].includes(extension)) {
    validateTextSample(textSample, extension);
  }

  return extension;
}

export async function validateBookFile(file) {
  if (!file) throw new Error("Choose a document first.");

  const extension = extensionOf(file.name);
  const headerBytes = new Uint8Array(
    await file.slice(0, 8).arrayBuffer(),
  );
  const textSample = ["txt", "md", "markdown"].includes(extension)
    ? await file.slice(0, TEXT_SAMPLE_SIZE).text()
    : "";

  return validateFileDescriptor({
    name: file.name,
    size: file.size,
    headerBytes,
    textSample,
  });
}
