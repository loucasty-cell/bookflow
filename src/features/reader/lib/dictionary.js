/**
 * dictionary: local-only word lookup.
 *
 * No selected word ever leaves the device. The bundled starter lexicon keeps the
 * lookup path working end to end now; a full license-verified dataset drops in
 * behind the same API with no UI change. An unknown word returns null, and the
 * UI says so plainly rather than guessing or fabricating a definition.
 */

export const DICTIONARY_VERSION = 2;
export const LICENSED_DICTIONARY_URL = 'dictionary/licensed.json';
export const MAX_LICENSED_ENTRIES = 60000;

/**
 * Starter lexicon. Structured per entry so a dataset swap changes only the
 * source constant, not the lookup or the UI.
 */
const STARTER_LEXICON = {
  reading: {
    word: 'reading',
    partOfSpeech: 'noun',
    definitions: [
      'The activity of looking at and understanding written words.',
      'A particular interpretation or understanding of a text or situation.',
    ],
    example: 'Her reading of the passage changed after the second pass.',
    etymology: 'From Old English rædan, to advise or interpret.',
  },
  focus: {
    word: 'focus',
    partOfSpeech: 'noun',
    definitions: [
      'The centre of interest, activity, or attention.',
      'The state of having a clear, sharp image or well-defined subject.',
    ],
    example: 'The paragraph held the reader\u2019s focus at the golden ratio line.',
    etymology: 'From Latin focus, meaning hearth or fireplace, the point where light gathered.',
  },
  curiosity: {
    word: 'curiosity',
    partOfSpeech: 'noun',
    definitions: [
      'A strong desire to know or learn something.',
      'An unusual or interesting object or fact.',
    ],
    example: 'Curiosity rarely arrives with a grand announcement.',
    etymology: 'From Latin curiositas, a desire to know, from cura, care.',
  },
  attention: {
    word: 'attention',
    partOfSpeech: 'noun',
    definitions: [
      'Notice taken of someone or something; the regarding of something as important.',
      'The mental faculty of concentrating on a particular thing.',
    ],
    example: 'Attention turns familiar moments into open doors.',
    etymology: 'From Latin attendere, to stretch toward.',
  },
  comprehension: {
    word: 'comprehension',
    partOfSpeech: 'noun',
    definitions: [
      'The action or capability of understanding something.',
      'The ability to grasp the meaning of written or spoken material.',
    ],
    example: 'Calm reading preserves comprehension better than forced speed.',
    etymology: 'From Latin comprehendere, to grasp or seize together.',
  },
  typography: {
    word: 'typography',
    partOfSpeech: 'noun',
    definitions: [
      'The style and appearance of printed or displayed text.',
      'The art of arranging type to make written language legible and appealing.',
    ],
    example: 'Good typography disappears so the words can be read.',
    etymology: 'From Greek typos, impression, and graphein, to write.',
  },
  highlight: {
    word: 'highlight',
    partOfSpeech: 'verb',
    definitions: [
      'To mark a passage of text with emphasis so it can be found again.',
      'To draw special attention to something.',
    ],
    example: 'She highlighted the sentence she wanted to revisit.',
    etymology: 'From the contrast between the brightest part of an image and the rest.',
  },
  bookmark: {
    word: 'bookmark',
    partOfSpeech: 'noun',
    definitions: [
      'A marker placed in a book so the reader can return to a specific place.',
      'A saved location that lets a reader resume where they stopped.',
    ],
    example: 'He set a bookmark on the paragraph about deep focus.',
    etymology: 'A compound of book and mark, a sign placed in a volume.',
  },
  annotation: {
    word: 'annotation',
    partOfSpeech: 'noun',
    definitions: [
      'A note added to a text by way of explanation or comment.',
      'The act of adding such notes.',
    ],
    example: 'Her annotation in the margin captured a better question.',
    etymology: 'From Latin annotare, to note down.',
  },
  rhythm: {
    word: 'rhythm',
    partOfSpeech: 'noun',
    definitions: [
      'A strong, regular, repeated pattern of movement or sound.',
      'A measured flow that makes reading sustainable.',
    ],
    example: 'A gentle rhythm is more sustainable than forcing concentration.',
    etymology: 'From Greek rhythmos, measured motion or flow.',
  },
  persistence: {
    word: 'persistence',
    partOfSpeech: 'noun',
    definitions: [
      'Firm or obstinate continuance in a course of action.',
      'The continued existence of something over time, such as saved progress.',
    ],
    example: 'Persistence means the book is still there when you return.',
    etymology: 'From Latin persistere, to continue steadfastly.',
  },
  serenity: {
    word: 'serenity',
    partOfSpeech: 'noun',
    definitions: [
      'The state of being calm, peaceful, and untroubled.',
      'A quiet, undistracted quality of mind suited to reading.',
    ],
    example: 'The calm reader is the design goal, not a side effect.',
    etymology: 'From Latin serenus, clear or calm.',
  },
};

function normalizeWord(word) {
  return String(word ?? '')
    .trim()
    .toLowerCase()
    .replace(/[.,!?;:'"()\u2018\u2019\u201c\u201d]/g, '');
}

let cachedDictionary = null;
let dictionarySource = 'starter';
let licensedLoadAttempted = false;

function normalizeLicensedEntry(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const word = normalizeWord(raw.word);
  if (!word || word.length > 64) return null;
  const definitions = Array.isArray(raw.definitions)
    ? raw.definitions.filter((d) => typeof d === 'string' && d.trim()).slice(0, 4)
    : [];
  if (!definitions.length) return null;
  return {
    word,
    partOfSpeech: typeof raw.partOfSpeech === 'string' ? raw.partOfSpeech.slice(0, 32) : 'unknown',
    definitions,
    example: typeof raw.example === 'string' ? raw.example.slice(0, 280) : '',
    etymology: typeof raw.etymology === 'string' ? raw.etymology.slice(0, 280) : '',
  };
}

function buildDictionary(extraEntries = []) {
  const index = new Map();
  for (const entry of Object.values(STARTER_LEXICON)) {
    index.set(entry.word, entry);
  }
  let licensedCount = 0;
  for (const entry of extraEntries) {
    const normalized = normalizeLicensedEntry(entry);
    if (!normalized) continue;
    index.set(normalized.word, normalized);
    licensedCount += 1;
  }
  return { version: DICTIONARY_VERSION, size: index.size, index, licensedCount };
}

export function getDictionary() {
  if (cachedDictionary) return cachedDictionary;
  cachedDictionary = buildDictionary();
  return cachedDictionary;
}

export function getDictionarySource() {
  return dictionarySource;
}

export async function loadLicensedDictionary(url = LICENSED_DICTIONARY_URL) {
  if (licensedLoadAttempted) return getDictionary();
  let payload = null;
  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return getDictionary();
    payload = await response.json();
  } catch {
    return getDictionary();
  }
  const list = Array.isArray(payload) ? payload : payload?.entries;
  if (!Array.isArray(list)) return getDictionary();
  if (Number(payload?.version) > 0 && payload.version !== DICTIONARY_VERSION) return getDictionary();
  const capped = list.slice(0, MAX_LICENSED_ENTRIES);
  licensedLoadAttempted = true;
  cachedDictionary = buildDictionary(capped);
  if (cachedDictionary.licensedCount > 0) dictionarySource = 'licensed';
  return cachedDictionary;
}

/** Whether a word has a definition. Never makes a network call. */
export function hasDefinition(word) {
  const normalized = normalizeWord(word);
  if (!normalized) return false;
  return getDictionary().index.has(normalized);
}

/**
 * Looks up a word. Returns the definition entry, or null when the word is not
 * in the local lexicon. Never returns a fabricated definition.
 */
export function lookup(word) {
  const normalized = normalizeWord(word);
  if (!normalized) return null;
  const index = getDictionary().index;
  return index.get(normalized) ?? index.get(normalized.replace(/['\u2019]/g, '')) ?? null;
}

/** Suggests defined words sharing the prefix, for a gentle autocomplete hint. */
export function suggest(prefix, limit = 5) {
  const normalized = normalizeWord(prefix);
  const safeLimit = Math.max(0, Math.round(Number(limit) || 0));
  if (!normalized || safeLimit === 0) return [];

  const results = [];
  for (const word of getDictionary().index.keys()) {
    if (word.startsWith(normalized)) results.push(word);
    if (results.length >= safeLimit) break;
  }
  return results;
}

/** The dictionary's declared vocabulary, in stable order. */
export function allWords() {
  return [...getDictionary().index.keys()].sort();
}

/** Exposed for tests: resets the memoized dictionary. */
export function resetDictionaryCache() {
  cachedDictionary = null;
  dictionarySource = 'starter';
  licensedLoadAttempted = false;
}