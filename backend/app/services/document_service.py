"""Document parsing service supporting PDF, EPUB, TXT, and Markdown files."""

import io
import re
import zipfile
import xml.etree.ElementTree as ET
from typing import List, Optional, Dict, Any, Tuple
from bs4 import BeautifulSoup
import pypdf

from ..models.document import (
    NormalizedBook,
    Chapter,
    Subheading,
    ParseResponse,
    DocumentValidationResponse,
)
from .text_service import text_service
from ..core.config import settings


class DocumentService:
    """Parses local document bytes into normalized Bookflow book structures."""

    @staticmethod
    def validate_file(file_name: str, file_size_bytes: int) -> DocumentValidationResponse:
        """Validate file size and supported extensions."""
        max_bytes = settings.max_upload_size_mb * 1024 * 1024
        if file_size_bytes > max_bytes:
            return DocumentValidationResponse(
                valid=False,
                fileName=file_name,
                fileSizeBytes=file_size_bytes,
                error=f"File exceeds maximum size of {settings.max_upload_size_mb} MB",
            )

        lower_name = file_name.lower()
        if lower_name.endswith(".pdf"):
            kind = "PDF"
        elif lower_name.endswith(".epub"):
            kind = "EPUB"
        elif lower_name.endswith((".md", ".markdown")):
            kind = "MARKDOWN"
        elif lower_name.endswith(".txt"):
            kind = "TEXT"
        else:
            return DocumentValidationResponse(
                valid=False,
                fileName=file_name,
                fileSizeBytes=file_size_bytes,
                error="Unsupported file format. Please upload a .pdf, .epub, .txt, or .md file.",
            )

        return DocumentValidationResponse(
            valid=True,
            kind=kind,
            fileName=file_name,
            fileSizeBytes=file_size_bytes,
        )

    @staticmethod
    def parse_plain_text(content: str, title: str = "Untitled Document") -> NormalizedBook:
        """Parse plain text into normalized book with structured chapters or paragraphs."""
        paragraphs = text_service.extract_paragraphs(content)
        # Check if text contains explicit chapter dividers like "CHAPTER 1", "Chapter I", etc.
        chapter_pattern = r"(?:^|\n)(?:Chapter\s+\d+|CHAPTER\s+[0-9IVXLCDM]+|[A-Z\s]{4,}\b)\n"
        splits = re.split(chapter_pattern, content)

        chapters: List[Chapter] = []
        if len(splits) > 1 and len(paragraphs) > 10:
            for idx, section_text in enumerate(splits):
                sec_paragraphs = text_service.extract_paragraphs(section_text)
                if sec_paragraphs:
                    chapters.append(
                        Chapter(
                            title=f"Section {idx + 1}",
                            paragraphs=sec_paragraphs,
                            focusEligible=not text_service.is_likely_front_or_end_matter(
                                f"Section {idx + 1}", sec_paragraphs
                            ),
                        )
                    )
        else:
            # Single chapter
            chapters.append(
                Chapter(
                    title="Document",
                    paragraphs=paragraphs,
                    focusEligible=True,
                )
            )

        return NormalizedBook(
            title=title,
            author=None,
            kind="TEXT",
            chapters=chapters,
        )

    @staticmethod
    def parse_markdown(content: str, title: str = "Untitled Markdown") -> NormalizedBook:
        """
        Parse Markdown headings and text into chapters and subheadings.
        Follows Bookflow convention: top heading level becomes chapters,
        next level becomes subheadings, deeper headings remain body text.
        """
        lines = content.replace("\r\n", "\n").replace("\r", "\n").split("\n")
        # Identify heading levels present
        heading_levels = set()
        for line in lines:
            m = re.match(r"^(#{1,6})\s+(.+)$", line)
            if m:
                heading_levels.add(len(m.group(1)))

        sorted_levels = sorted(list(heading_levels))
        chapter_level = sorted_levels[0] if sorted_levels else 1
        subheading_level = sorted_levels[1] if len(sorted_levels) > 1 else None

        chapters: List[Chapter] = []
        current_chapter_title = "Introduction"
        current_subheading_title = None
        current_subheadings: List[Subheading] = []
        current_buffer: List[str] = []

        def flush_subheading():
            nonlocal current_buffer, current_subheading_title
            p_list = text_service.extract_paragraphs("\n".join(current_buffer))
            if p_list:
                current_subheadings.append(
                    Subheading(title=current_subheading_title, paragraphs=p_list)
                )
            current_buffer = []

        def flush_chapter():
            nonlocal current_subheadings, current_chapter_title
            flush_subheading()
            all_paragraphs: List[str] = []
            for sub in current_subheadings:
                all_paragraphs.extend(sub.paragraphs)
            if all_paragraphs:
                chapters.append(
                    Chapter(
                        title=current_chapter_title,
                        paragraphs=all_paragraphs,
                        subheadings=current_subheadings if len(current_subheadings) > 1 else None,
                        focusEligible=not text_service.is_likely_front_or_end_matter(
                            current_chapter_title, all_paragraphs
                        ),
                    )
                )
            current_subheadings = []

        for line in lines:
            m = re.match(r"^(#{1,6})\s+(.+)$", line)
            if m:
                level = len(m.group(1))
                h_text = m.group(2).strip()
                if level == chapter_level:
                    flush_chapter()
                    current_chapter_title = h_text
                    current_subheading_title = None
                elif level == subheading_level:
                    flush_subheading()
                    current_subheading_title = h_text
                else:
                    current_buffer.append(h_text)
            else:
                current_buffer.append(line)

        flush_chapter()

        if not chapters:
            all_p = text_service.extract_paragraphs(content)
            chapters.append(Chapter(title="Document", paragraphs=all_p, focusEligible=True))

        return NormalizedBook(
            title=title,
            author=None,
            kind="MARKDOWN",
            chapters=chapters,
        )

    @staticmethod
    def parse_pdf(file_bytes: bytes, file_name: str) -> NormalizedBook:
        """Parse selectable text from PDF pages."""
        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        meta = reader.metadata or {}
        title = meta.get("/Title") or file_name.replace(".pdf", "").replace("_", " ").title()
        author = meta.get("/Author") or None

        chapters: List[Chapter] = []
        for idx, page in enumerate(reader.pages):
            try:
                page_text = page.extract_text() or ""
            except Exception:
                page_text = ""
            paragraphs = text_service.extract_paragraphs(page_text)
            page_title = f"Page {idx + 1}"
            chapters.append(
                Chapter(
                    title=page_title,
                    paragraphs=paragraphs,
                    focusEligible=not text_service.is_likely_front_or_end_matter(
                        page_title, paragraphs
                    ),
                )
            )

        return NormalizedBook(
            title=title,
            author=author,
            kind="PDF",
            chapters=chapters,
        )

    @staticmethod
    def parse_epub(file_bytes: bytes, file_name: str) -> NormalizedBook:
        """Parse EPUB package and extract chapters and text safely."""
        title = file_name.replace(".epub", "").replace("_", " ").title()
        author = None
        chapters: List[Chapter] = []

        try:
            with zipfile.ZipFile(io.BytesIO(file_bytes), "r") as zf:
                # Find OPF file
                container_data = zf.read("META-INF/container.xml")
                root = ET.fromstring(container_data)
                rootfile = root.find(".//{urn:oasis:names:tc:opendocument:xmlns:container}rootfile")
                opf_path = rootfile.attrib["full-path"] if rootfile is not None else "content.opf"
                opf_dir = "/".join(opf_path.split("/")[:-1])

                opf_data = zf.read(opf_path)
                opf_root = ET.fromstring(opf_data)

                # Metadata
                metadata = opf_root.find(".//{http://www.idpf.org/2007/opf}metadata")
                if metadata is not None:
                    t_el = metadata.find(".//{http://purl.org/dc/elements/1.1/}title")
                    if t_el is not None and t_el.text:
                        title = t_el.text.strip()
                    a_el = metadata.find(".//{http://purl.org/dc/elements/1.1/}creator")
                    if a_el is not None and a_el.text:
                        author = a_el.text.strip()

                # Manifest
                manifest_items: Dict[str, str] = {}
                for item in opf_root.findall(".//{http://www.idpf.org/2007/opf}item"):
                    manifest_items[item.attrib["id"]] = item.attrib["href"]

                # Spine
                spine_items: List[str] = []
                for itemref in opf_root.findall(".//{http://www.idpf.org/2007/opf}itemref"):
                    idref = itemref.attrib["idref"]
                    if idref in manifest_items:
                        spine_items.append(manifest_items[idref])

                # Parse spine items
                for idx, rel_path in enumerate(spine_items):
                    full_item_path = f"{opf_dir}/{rel_path}" if opf_dir else rel_path
                    if full_item_path not in zf.namelist():
                        continue

                    doc_bytes = zf.read(full_item_path)
                    soup = BeautifulSoup(doc_bytes, "html.parser")
                    h1 = soup.find(["h1", "h2", "title"])
                    chap_title = h1.get_text().strip() if h1 else f"Chapter {idx + 1}"

                    # Extract paragraphs
                    p_tags = soup.find_all(["p", "div", "blockquote", "li"])
                    paragraphs: List[str] = []
                    for tag in p_tags:
                        text = " ".join(tag.get_text().split())
                        if text and len(text) > 10:
                            paragraphs.append(text)

                    if paragraphs:
                        chapters.append(
                            Chapter(
                                title=chap_title,
                                paragraphs=paragraphs,
                                focusEligible=not text_service.is_likely_front_or_end_matter(
                                    chap_title, paragraphs
                                ),
                            )
                        )
        except Exception as e:
            # Fallback if EPUB is structured differently
            pass

        if not chapters:
            chapters.append(
                Chapter(
                    title="Imported EPUB",
                    paragraphs=["Document processed."],
                    focusEligible=True,
                )
            )

        return NormalizedBook(
            title=title,
            author=author,
            kind="EPUB",
            chapters=chapters,
        )

    def parse_document_file(
        self, file_bytes: bytes, file_name: str, file_kind: Optional[str] = None
    ) -> ParseResponse:
        """Parse any supported document file bytes into a normalized book."""
        kind = file_kind
        if not kind:
            validation = self.validate_file(file_name, len(file_bytes))
            if not validation.valid:
                return ParseResponse(success=False, message=validation.error)
            kind = validation.kind

        try:
            if kind == "PDF":
                book = self.parse_pdf(file_bytes, file_name)
            elif kind == "EPUB":
                book = self.parse_epub(file_bytes, file_name)
            elif kind == "MARKDOWN":
                text_content = file_bytes.decode("utf-8", errors="replace")
                clean_title = file_name.replace(".md", "").replace(".markdown", "").title()
                book = self.parse_markdown(text_content, clean_title)
            elif kind == "TEXT":
                text_content = file_bytes.decode("utf-8", errors="replace")
                clean_title = file_name.replace(".txt", "").title()
                book = self.parse_plain_text(text_content, clean_title)
            else:
                return ParseResponse(success=False, message="Unsupported document format")

            total_words = sum(
                sum(text_service.count_words(p) for p in c.paragraphs)
                for c in book.chapters
            )
            return ParseResponse(
                success=True,
                book=book,
                pageCount=len(book.chapters),
                wordCount=total_words,
                message="Document parsed successfully",
            )
        except Exception as exc:
            return ParseResponse(
                success=False,
                message=f"Failed to parse document: {str(exc)}",
            )


document_service = DocumentService()
