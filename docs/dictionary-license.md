# Dictionary License

Local-only definition lookup. No selected word leaves the device.

## Current state

- Bundled starter lexicon in `src/features/reader/lib/dictionary.js` (12 words, version 2).
- Loader `loadLicensedDictionary()` fetches `dictionary/licensed.json` lazily, only when lookup is invoked and `showDefinitionLookup` is enabled.
- Licensed entries are validated, capped at 60000, and merged without overwriting starter entries.
- Unknown words return null with plain UI copy. No fabricated definitions.

## Drop-in contract

Place a license-verified JSON file at `public/dictionary/licensed.json`:

```json
[
  { "word": "focus", "partOfSpeech": "noun", "definitions": ["..."], "example": "...", "etymology": "..." }
]
```

Requirements:

- Array or `{ "entries": [...] }` shape.
- Each entry needs `word` and at least one non-empty string in `definitions`.
- `partOfSpeech`, `example`, `etymology` optional, length-capped.
- Record source, license name, version, and attribution here before shipping.
- Never fetch definitions from a remote API at lookup time.

## Pending decision

License source not yet chosen. Starter lexicon remains authoritative until a verified file lands.
