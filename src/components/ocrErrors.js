export const API_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
  '';

export function ocrRequestErrorMessage(error, apiBase = API_BASE) {
  const displayBase = apiBase || 'http://localhost:8000';
  if (error instanceof TypeError) {
    return `Cannot reach the OCR backend at ${displayBase}. Start it with "docker compose up --build", then retry.`;
  }

  return error instanceof Error && error.message
    ? error.message
    : 'Failed to start OCR scan.';
}

