export function resolvePdfWorkerSrc() {
  const base =
    (typeof import.meta !== "undefined" && import.meta.env?.BASE_URL) || "/";
  const normalized = base.endsWith("/") ? base : `${base}/`;
  return `${normalized}pdf.worker.min.mjs`;
}

export function classifyPdfOpenError(error) {
  const name = error?.name || "";
  const message = String(error?.message || "");
  if (
    name === "PasswordException" ||
    /password|encrypted/i.test(message)
  ) {
    return new Error(
      "This PDF is locked with a password. Unlock it first, then try again.",
    );
  }
  if (/fake worker|setting up.*worker|worker.*failed/i.test(message)) {
    return new Error(
      "The PDF reader failed to start in this build. Reload the app, then try again.",
    );
  }
  return null;
}

let cachedWorkerSrc = null;

export async function openPdfDocument(pdfjs, data) {
  if (!cachedWorkerSrc) cachedWorkerSrc = resolvePdfWorkerSrc();
  if (pdfjs.GlobalWorkerOptions.workerSrc !== cachedWorkerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = cachedWorkerSrc;
  }
  const strictOptions = {
    data,
    isEvalSupported: false,
    useSystemFonts: true,
  };
  try {
    return await pdfjs.getDocument(strictOptions).promise;
  } catch (firstError) {
    const classified = classifyPdfOpenError(firstError);
    if (classified) throw classified;
    try {
      return await pdfjs.getDocument({ ...strictOptions, ignoreErrors: true })
        .promise;
    } catch (secondError) {
      throw new Error(
        "This PDF looks damaged, but the accelerated backend scan may still read it.",
        { cause: secondError?.message ?? firstError?.message ?? secondError ?? firstError },
      );
    }
  }
}
