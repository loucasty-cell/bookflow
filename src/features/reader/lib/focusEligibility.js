import { wordCount } from '../../../shared/lib/index.js'

const FRONT_MATTER_PATTERN = /cover|title page|contents|table of contents|copyright|dedication|acknowledg|preface|foreword|prologue|introduction|epigraph|author(?:'s)? note|opening note/i
const BACK_MATTER_PATTERN = /appendix|bibliograph|references|glossary|index|credits|afterword|epilogue|about the author/i

export function isFocusEligibleChapter(chapter, index, total) {
  const title = String(chapter.title ?? '')
  const words = wordCount(chapter.paragraphs.join(' '))
  const chapterLikeTitle = /chapter|part|section|lesson|unit|act|volume/i.test(title)
  const genericTitle = /^(?:page\s*)?\d+$|^untitled$|^section$/i.test(title.trim())

  if (FRONT_MATTER_PATTERN.test(title)) return false
  if (BACK_MATTER_PATTERN.test(title)) return false
  if (index < 2 && /^(page\s*)?[12]$/i.test(title.trim())) return false
  if (index < 2 && words < 90 && !chapterLikeTitle && genericTitle) return false
  if (index >= total - 2 && words < 80 && !chapterLikeTitle && genericTitle) return false

  return true
}
