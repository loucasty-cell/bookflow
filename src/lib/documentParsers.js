import { normalizeText, splitParagraphs, stripMarkdown } from './text.js'

const MAX_FILE_SIZE = 50 * 1024 * 1024
const SUPPORTED = ['pdf', 'epub', 'txt', 'md', 'markdown']

function extensionOf(name) {
  return name.toLowerCase().split('.').pop()
}

function cleanTitle(filename) {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function xmlElements(root, localName) {
  return [...root.getElementsByTagName('*')].filter((element) => element.localName === localName)
}

function resolveArchivePath(baseFile, relativePath) {
  const base = baseFile.includes('/') ? baseFile.slice(0, baseFile.lastIndexOf('/') + 1) : ''
  const stack = `${base}${decodeURIComponent(relativePath)}`.split('/')
  const result = []
  for (const part of stack) {
    if (!part || part === '.') continue
    if (part === '..') result.pop()
    else result.push(part)
  }
  return result.join('/')
}

function paragraphsFromElement(element) {
  element.querySelectorAll('script, style, nav, svg, noscript').forEach((node) => node.remove())
  const blocks = [...element.querySelectorAll('p, blockquote, li')]
    .map((node) => normalizeText(node.textContent))
    .filter((text) => text.length > 20)

  return blocks.length ? blocks : splitParagraphs(element.textContent)
}

function parseXml(source, type = 'application/xml') {
  const document = new DOMParser().parseFromString(source, type)
  if (document.querySelector('parsererror')) throw new Error('This ebook contains invalid XML.')
  return document
}

async function parsePdf(file, onProgress) {
  const [pdfjs, workerModule] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ])
  pdfjs.GlobalWorkerOptions.workerSrc = workerModule.default
  const data = new Uint8Array(await file.arrayBuffer())
  let pdf
  try {
    pdf = await pdfjs.getDocument({ data }).promise
  } catch {
    throw new Error('This PDF is encrypted, damaged, or cannot be read.')
  }

  const metadata = await pdf.getMetadata().catch(() => null)
  const chapters = []
  const documentTitle = normalizeText(metadata?.info?.Title) || cleanTitle(file.name)

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent({ normalizeWhitespace: true })
    const lines = []
    let line = []
    let lastY = null

    for (const item of content.items) {
      const value = item.str?.trim()
      if (!value) continue
      const y = Math.round(item.transform?.[5] ?? 0)
      if (lastY !== null && Math.abs(y - lastY) > 4 && line.length) {
        lines.push(line.join(' '))
        line = []
      }
      line.push(value)
      if (item.hasEOL) {
        lines.push(line.join(' '))
        line = []
      }
      lastY = y
    }
    if (line.length) lines.push(line.join(' '))

    const readableLines = lines.filter((line) => !(pageNumber === 1 && normalizeText(line) === documentTitle))
    const pageText = readableLines
      .map((line, index) => {
        const next = readableLines[index + 1] || ''
        const headingLike = line.length < 90 && !/[.!?…]["'’”)]?$/.test(line) && /^[A-Z\d]/.test(line)
        const paragraphEnd = /[.!?…]["'’”)]?$/.test(line) && (!next || /^[A-Z\d“"'’]/.test(next))
        return `${line}${headingLike || paragraphEnd ? '\n\n' : ' '}`
      })
      .join('')
      .replace(/(\p{L})-\n(\p{Ll})/gu, '$1$2')
      .replace(/\n(?=\p{Ll})/gu, ' ')

    const paragraphs = splitParagraphs(pageText).filter((paragraph) => paragraph.length > 15)
    if (paragraphs.length) chapters.push({ title: `Page ${pageNumber}`, paragraphs })
    onProgress?.(Math.round((pageNumber / pdf.numPages) * 100), `Reading page ${pageNumber} of ${pdf.numPages}`)
  }

  if (!chapters.length) throw new Error('No selectable text was found. Scanned PDFs need OCR before Bookflow can read them.')

  return {
    title: documentTitle,
    author: normalizeText(metadata?.info?.Author),
    kind: 'PDF',
    chapters,
  }
}

async function parseEpub(file, onProgress) {
  const { default: JSZip } = await import('jszip')
  let zip
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer())
  } catch {
    throw new Error('This EPUB is damaged or cannot be opened.')
  }

  const containerSource = await zip.file('META-INF/container.xml')?.async('text')
  if (!containerSource) throw new Error('This file is missing the EPUB container manifest.')
  const container = parseXml(containerSource)
  const rootfile = xmlElements(container, 'rootfile')[0]?.getAttribute('full-path')
  if (!rootfile) throw new Error('This EPUB does not identify its book package.')

  const packageSource = await zip.file(rootfile)?.async('text')
  if (!packageSource) throw new Error('This EPUB package could not be read.')
  const packageDoc = parseXml(packageSource)
  const manifest = new Map(
    xmlElements(packageDoc, 'item').map((item) => [item.getAttribute('id'), item.getAttribute('href')]),
  )
  const spine = xmlElements(packageDoc, 'itemref').map((item) => item.getAttribute('idref')).filter(Boolean)
  const metadata = xmlElements(packageDoc, 'metadata')[0]
  const title = normalizeText(xmlElements(metadata ?? packageDoc, 'title')[0]?.textContent) || cleanTitle(file.name)
  const author = normalizeText(xmlElements(metadata ?? packageDoc, 'creator')[0]?.textContent)
  const chapters = []

  for (let index = 0; index < spine.length; index += 1) {
    const href = manifest.get(spine[index])
    if (!href) continue
    const path = resolveArchivePath(rootfile, href.split('#')[0])
    const source = await zip.file(path)?.async('text')
    if (!source) continue

    const chapterDoc = parseXml(source, 'application/xhtml+xml')
    const heading = normalizeText(chapterDoc.querySelector('h1, h2, h3, title')?.textContent)
    const paragraphs = paragraphsFromElement(chapterDoc.body ?? chapterDoc.documentElement)
    if (paragraphs.length) chapters.push({ title: heading || `Chapter ${chapters.length + 1}`, paragraphs })
    onProgress?.(Math.round(((index + 1) / spine.length) * 100), `Opening chapter ${index + 1} of ${spine.length}`)
  }

  if (!chapters.length) throw new Error('No readable chapters were found in this EPUB.')
  return { title, author, kind: 'EPUB', chapters }
}

function parseTextDocument(file, source) {
  const isMarkdown = ['md', 'markdown'].includes(extensionOf(file.name))
  const raw = isMarkdown ? stripMarkdown(source) : source
  const normalized = normalizeText(raw)
  const headings = isMarkdown
    ? [...source.matchAll(/^#{1,3}\s+(.+)$/gm)].map((match) => ({ title: stripMarkdown(match[1]), index: match.index }))
    : []

  let chapters
  if (headings.length) {
    chapters = headings.map((heading, index) => {
      const start = heading.index + source.slice(heading.index).indexOf('\n') + 1
      const end = headings[index + 1]?.index ?? source.length
      return { title: heading.title, paragraphs: splitParagraphs(stripMarkdown(source.slice(start, end))) }
    }).filter((chapter) => chapter.paragraphs.length)
  } else {
    const paragraphs = splitParagraphs(normalized)
    chapters = []
    for (let index = 0; index < paragraphs.length; index += 10) {
      chapters.push({ title: `Section ${chapters.length + 1}`, paragraphs: paragraphs.slice(index, index + 10) })
    }
  }

  return { title: cleanTitle(file.name), author: '', kind: isMarkdown ? 'MARKDOWN' : 'TEXT', chapters }
}

export async function parseDocument(file, onProgress) {
  if (!file) throw new Error('Choose a document first.')
  if (file.size > MAX_FILE_SIZE) throw new Error('Please choose a file smaller than 50 MB.')
  const extension = extensionOf(file.name)
  if (!SUPPORTED.includes(extension)) throw new Error('Bookflow supports PDF, EPUB, TXT, and Markdown files.')

  if (extension === 'pdf') return parsePdf(file, onProgress)
  if (extension === 'epub') return parseEpub(file, onProgress)

  onProgress?.(45, 'Reading your document')
  const source = await file.text()
  const result = parseTextDocument(file, source)
  if (!result.chapters.length) throw new Error('No readable text was found in this document.')
  onProgress?.(100, 'Preparing your reading flow')
  return result
}

export const ACCEPTED_FILES = '.pdf,.epub,.txt,.md,.markdown'
