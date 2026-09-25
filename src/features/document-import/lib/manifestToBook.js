export function manifestToBook(manifest) {
  const readyUnits = [...(manifest?.units ?? [])]
    .filter((u) => u.status === "READY" && u.paragraphs?.length)
    .sort((a, b) => (a.sourcePage ?? 0) - (b.sourcePage ?? 0));
  return {
    title: manifest.title,
    author: manifest.author ?? "",
    kind: manifest.kind,
    chapters: readyUnits.map((u) => ({
      title: u.label,
      paragraphs: u.paragraphs,
    })),
    ocrPageCount: readyUnits.filter((u) => u.ocrStatus === "ocr-ready").length,
  };
}
