export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function ocrRequestErrorMessage(error, apiBase = API_BASE) {
  if (error instanceof TypeError) {
    return `Cannot reach the OCR backend at ${apiBase}. Start it from the backend folder with "python run.py", then retry.`;
  }

  return error instanceof Error && error.message
    ? error.message
    : 'Failed to start OCR scan.';
}
