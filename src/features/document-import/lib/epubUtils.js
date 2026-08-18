import { normalizeText } from "../../../shared/lib/text.js";

export function xmlElements(root, localName) {
  return [...root.getElementsByTagName("*")].filter(
    (element) => element.localName === localName,
  );
}

export function resolveArchivePath(baseFile, relativePath) {
  const base = baseFile.includes("/")
    ? baseFile.slice(0, baseFile.lastIndexOf("/") + 1)
    : "";
  const stack = `${base}${decodeURIComponent(relativePath)}`.split("/");
  const result = [];
  for (const part of stack) {
    if (!part || part === ".") continue;
    if (part === "..") result.pop();
    else result.push(part);
  }
  return result.join("/");
}

export function collectContentBlocks(element) {
  element
    .querySelectorAll("script, style, nav, svg, noscript")
    .forEach((node) => node.remove());
  const candidates = [
    ...element.querySelectorAll("h1, h2, h3, h4, h5, h6, p, blockquote, li"),
  ];
  const blocks = [];
  for (const node of candidates) {
    if (
      node.querySelector("h1, h2, h3, h4, h5, h6, p, blockquote, li")
    )
      continue;
    const text = normalizeText(node.textContent);
    const tag = node.tagName.toLowerCase();
    if (tag === "p" || tag === "blockquote" || tag === "li") {
      if (text.length > 20) blocks.push({ type: "content", text });
    } else if (text.length > 0) {
      blocks.push({ type: "heading", level: Number(tag[1]), text });
    }
  }
  return blocks;
}

export function buildEpubSections(blocks) {
  const titleIndex = blocks.findIndex((block) => block.type === "heading");
  const sections = [];
  let current = null;
  let inlineHeadingText = [];
  const title = titleIndex >= 0 ? blocks[titleIndex].text : "";

  const ensureLeading = () => {
    if (!current) {
      current = { title: null, paragraphs: [] };
      sections.push(current);
    }
  };

  const appendInlineHeadingText = () => {
    if (!inlineHeadingText.length) return;
    ensureLeading();
    const inlineText = inlineHeadingText.join(" ");
    if (current.paragraphs.length) {
      const lastIndex = current.paragraphs.length - 1;
      current.paragraphs[lastIndex] = `${current.paragraphs[lastIndex]} ${inlineText}`;
    } else {
      current.paragraphs.push(inlineText);
    }
    inlineHeadingText = [];
  };

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    if (
      block.type === "heading" &&
      index !== titleIndex &&
      [2, 3].includes(block.level)
    ) {
      appendInlineHeadingText();
      current = { title: block.text, paragraphs: [] };
      sections.push(current);
    } else if (block.type === "heading" && index !== titleIndex) {
      inlineHeadingText.push(block.text);
    } else if (index !== titleIndex) {
      ensureLeading();
      current.paragraphs.push(
        [...inlineHeadingText, block.text].join(" "),
      );
      inlineHeadingText = [];
    } else {
      ensureLeading();
    }
  }
  appendInlineHeadingText();
  return { title, sections };
}

export function chapterFromSections(title, sections) {
  const populated = sections.filter((section) => section.paragraphs.length);
  const paragraphs = populated.flatMap((section) => section.paragraphs);
  const subheadings = populated.map((section) => ({
    title: section.title,
    paragraphs: section.paragraphs,
  }));
  return {
    title,
    paragraphs,
    ...(subheadings.some((section) => section.title)
      ? { subheadings }
      : {}),
  };
}

export function parseXml(source, type = "application/xml") {
  const document = new DOMParser().parseFromString(source, type);
  if (document.querySelector("parsererror"))
    throw new Error("This ebook contains invalid XML.");
  return document;
}
