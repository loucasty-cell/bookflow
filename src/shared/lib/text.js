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
