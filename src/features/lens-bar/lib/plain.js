/**
 * Normalises a model answer into plain text.
 *
 * A truncated stream can leave a NUL byte behind, so it is stripped before the
 * text is ever rendered. Split/join rather than a regex, because a literal
 * control character in a pattern trips the no-control-regex lint rule.
 */
export function toPlain(value, max = 4000) {
  if (typeof value !== 'string') return '';
  return value
    .split('\u0000')
    .join('')
    .replace(/\r\n?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .slice(0, max)
    .trim();
}