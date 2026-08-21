export function normalizeText(value = '') {
  return value
    .replace(/\u00ad/g, '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function splitSentences(text, locale = 'en') {
  const clean = text.trim()
  if (!clean) return []

  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    const segmenter = new Intl.Segmenter(locale, { granularity: 'sentence' })
    return [...segmenter.segment(clean)]
      .map(({ segment }) => segment.trim())
      .filter(Boolean)
  }

  return clean.match(/[^.!?]+(?:[.!?]+["'’”)]*|$)/g)?.map((part) => part.trim()).filter(Boolean) ?? [clean]
}

export function splitParagraphs(text) {
  const normalized = normalizeText(text)
  if (!normalized) return []

  const explicit = normalized.split(/\n{2,}/).map((part) => part.replace(/\n/g, ' ').trim()).filter(Boolean)
  if (explicit.length > 1) return explicit

  const sentences = splitSentences(normalized.replace(/\n/g, ' '))
  const paragraphs = []
  for (let index = 0; index < sentences.length; index += 4) {
    paragraphs.push(sentences.slice(index, index + 4).join(' '))
  }
  return paragraphs
}

export function wordCount(text) {
  return normalizeText(text).match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)?.length ?? 0
}

export function stripMarkdown(markdown) {
  return markdown
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(`{1,3}|\*{1,2}|_{1,2}|~~)/g, '')
}

export function documentId(file) {
  return `${file.name}:${file.size}:${file.lastModified}`
}

export function formatClassification(index, text, classification) {
  const words = text.split(/\s+/).slice(0, 7).join(' ');
  return `Paragraph [${index}]: "${words}..."\n- Type: ${classification.type}\n- Variant: ${classification.variant}\n- Logic: ${classification.logic}`;
}

export function classifyParagraph(text) {
  const clean = text.trim();

  if (/^(?:\*\*\*|###|---)$/.test(clean) || (clean.length < 50 && /^#{1,6}\s/.test(clean))) {
    return { type: 'STRUCTURAL_MARKER', variant: 'None', logic: 'Non-prose separator or heading.' };
  }

  const quoteMatch = clean.match(/["'“‘][^"'”’]+["'”’]/g);
  if (quoteMatch) {
    const speechLength = quoteMatch.reduce((sum, match) => sum + match.length, 0);
    const hasDialogueTag = /\b(?:he|she|they|i)\s+(?:said|asked|replied|whispered|shouted|muttered|answered)\b|\b(?:said|asked|replied)\s+(?:he|she|they)\b/i.test(clean);
    if (hasDialogueTag || speechLength >= clean.length * 0.3) {
      if (hasDialogueTag && speechLength >= clean.length * 0.6) {
        return { type: 'DIALOGUE', variant: 'Pure Dialogue', logic: 'Contains spoken communication with standard tags.' };
      }
      return { type: 'DIALOGUE', variant: 'Dialogue + Action Beat', logic: 'Speech paired with physical movement in the same paragraph.' };
    }
  }

  if (/[\r\n]+/.test(clean) && clean.split(/[\r\n]+/).every((line) => line.trim().length < 50)) {
    return { type: 'VERSE / POETRY', variant: 'None', logic: 'Intentionally line-broken poetic text.' };
  }

  const isTransition = /^(?:Three hours later|By morning|Back at|Later|Meanwhile)/i.test(clean);
  if (isTransition) {
    return { type: 'TRANSITIONAL', variant: 'None', logic: 'Bridges time, location, or scene perspective.' };
  }

  const isInternal = clean.match(/\?(?:\w+\s){2,}\?/g) || clean.includes(' thought ') || clean.includes(' wondered ');
  if (isInternal && !quoteMatch) {
    return { type: 'INTERNAL_MONOLOGUE', variant: 'None', logic: 'Displays character inner thoughts or direct questions.' };
  }

  const isDescriptive = (clean.match(/\b(?:was|were|had|seemed|appeared|looked|felt)\b/gi) || []).length > 3;
  if (isDescriptive) {
    return { type: 'DESCRIPTIVE', variant: 'None', logic: 'Focuses on sensory details, setting scene or mood.' };
  }

  const isExpository = clean.match(/\b(?:because|history|years ago|century|known as)\b/gi);
  if (isExpository) {
    return { type: 'EXPOSITORY', variant: 'None', logic: 'Delivers background information or conceptual explanations.' };
  }

  return { type: 'ACTION', variant: 'None', logic: 'Focuses on physical movement, real-time events, or dynamic narrative progression.' };
}
