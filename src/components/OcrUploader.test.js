import { describe, expect, it } from 'vitest';

import { ocrRequestErrorMessage } from './ocrErrors.js';

describe('OCR request errors', () => {
  it('turns a network failure into an actionable backend message', () => {
    expect(
      ocrRequestErrorMessage(new TypeError('Failed to fetch'), 'http://localhost:8000')
    ).toBe(
      'Cannot reach the OCR backend at http://localhost:8000. Start it with "docker compose up --build", then retry.'
    );
  });

  it('preserves API error details', () => {
    expect(ocrRequestErrorMessage(new Error('Upload failed with status 413'))).toBe(
      'Upload failed with status 413'
    );
  });
});
