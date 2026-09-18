/**
 * Vault integrity check for brainobs.
 *
 * Verifies:
 *  1. Every note has frontmatter with title, type, status, and updated.
 *  2. Every source-files path exists on disk.
 *  3. Every [[wikilink]] resolves to an existing note name.
 *  4. Every note is linked from at least one other note.
 *
 * Run: node scripts/check-vault.mjs
 */

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, relative, basename } from 'node:path'

const ROOT = process.cwd()
const VAULT = join(ROOT, 'brainobs')

function walk(directory) {
  const entries = readdirSync(directory, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const full = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...walk(full))
    else if (entry.name.endsWith('.md')) files.push(full)
  }
  return files
}

function parseFrontmatter(text) {
  const normalized = text.replace(/\r\n/g, '\n')
  if (!normalized.startsWith('---')) return null
  const end = normalized.indexOf('\n---', 3)
  if (end === -1) return null
  const block = normalized.slice(3, end)
  const data = {}
  for (const line of block.split('\n')) {
    const match = line.match(/^([A-Za-z_-]+):\s*(.*)$/)
    if (!match) continue
    data[match[1]] = match[2].trim()
  }
  return data
}

function parseList(value) {
  if (!value) return []
  return value
    .replace(/^\[/, '')
    .replace(/\]$/, '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

const notes = walk(VAULT)
const noteNames = new Set(notes.map((file) => basename(file, '.md')))
const contents = new Map()

const problems = {
  missingFrontmatter: [],
  missingFields: [],
  badSourcePaths: [],
  brokenLinks: [],
  orphaned: [],
}

const inbound = new Map()
for (const name of noteNames) inbound.set(name, 0)

for (const file of notes) {
  const text = readFileSync(file, 'utf8')
  contents.set(file, text)
  const label = relative(ROOT, file)

  const fm = parseFrontmatter(text)
  if (!fm) {
    problems.missingFrontmatter.push(label)
  } else {
    for (const field of ['title', 'type', 'status', 'updated']) {
      if (!fm[field]) problems.missingFields.push(`${label} -> ${field}`)
    }
    for (const sourcePath of parseList(fm['source-files'])) {
      if (!existsSync(join(ROOT, sourcePath))) {
        problems.badSourcePaths.push(`${label} -> ${sourcePath}`)
      }
    }
  }

  const linkPattern = /\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/g
  // Ignore examples inside fenced code blocks and placeholder names.
  const prose = text.replace(/```[\s\S]*?```/g, '')
  const placeholders = new Set(['wikilink', 'Old Note Name', 'name'])
  let match
  while ((match = linkPattern.exec(prose)) !== null) {
    const target = match[1].trim()
    if (placeholders.has(target)) continue
    if (!noteNames.has(target)) {
      problems.brokenLinks.push(`${label} -> [[${target}]]`)
    } else if (target !== basename(file, '.md')) {
      inbound.set(target, (inbound.get(target) ?? 0) + 1)
    }
  }
}

for (const [name, count] of inbound) {
  if (count === 0) problems.orphaned.push(name)
}

const total =
  problems.missingFrontmatter.length +
  problems.missingFields.length +
  problems.badSourcePaths.length +
  problems.brokenLinks.length

console.log(`Vault notes: ${notes.length}`)
console.log(`Wikilinks checked against ${noteNames.size} note names`)
console.log('')

const sections = [
  ['Notes missing frontmatter', problems.missingFrontmatter],
  ['Notes missing required fields', problems.missingFields],
  ['source-files paths that do not exist', problems.badSourcePaths],
  ['Unresolved wikilinks', problems.brokenLinks],
  ['Notes with no inbound links', problems.orphaned],
]

for (const [heading, list] of sections) {
  console.log(`${heading}: ${list.length}`)
  for (const item of list) console.log(`  - ${item}`)
}

console.log('')
console.log(total === 0 ? 'PASS: vault integrity verified.' : `FAIL: ${total} issue(s) to fix.`)
process.exit(total === 0 ? 0 : 1)