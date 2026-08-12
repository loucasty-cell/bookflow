function orderedParagraphs(paragraphs) {
  return paragraphs
    .filter((paragraph) => paragraph && Number.isFinite(paragraph.top) && Number.isFinite(paragraph.bottom))
    .sort((first, second) => first.top - second.top || first.left - second.left || first.id.localeCompare(second.id))
}

function preferCurrent(paragraphs, currentId) {
  return paragraphs.find((paragraph) => paragraph.id === currentId) ?? paragraphs[0]
}

export function selectClosestParagraph(paragraphs, anchorY, currentId = '') {
  const ordered = orderedParagraphs(paragraphs)
  if (!ordered.length) return null

  const crossing = ordered.filter((paragraph) => paragraph.top <= anchorY && paragraph.bottom >= anchorY)
  if (crossing.length) return preferCurrent(crossing, currentId)

  return ordered.reduce((closest, paragraph) => {
    const paragraphCenter = (paragraph.top + paragraph.bottom) / 2
    const closestCenter = (closest.top + closest.bottom) / 2
    return Math.abs(paragraphCenter - anchorY) < Math.abs(closestCenter - anchorY) ? paragraph : closest
  })
}

export function selectNextParagraph(paragraphs, currentId, direction, step = 1) {
  const ordered = orderedParagraphs(paragraphs)
  if (!ordered.length) return null

  const currentIndex = ordered.findIndex((paragraph) => paragraph.id === currentId)
  const startIndex = currentIndex < 0 ? (direction > 0 ? -1 : ordered.length) : currentIndex
  const nextIndex = Math.min(ordered.length - 1, Math.max(0, startIndex + Math.sign(direction) * Math.max(1, step)))
  return ordered[nextIndex]
}

export function selectFocusTarget(paragraphs, railY, currentId = '') {
  return selectClosestParagraph(paragraphs, railY, currentId)
}
