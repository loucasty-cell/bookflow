"""Text processing utilities for segmentation, normalization, and metrics."""

import re
from typing import List, Dict, Any, Optional, Tuple


ABBREVIATIONS = {
    "mr.", "mrs.", "ms.", "dr.", "prof.", "sr.", "jr.", "vs.", "etc.",
    "e.g.", "i.e.", "vol.", "no.", "pp.", "p.", "chap.", "sec.", "fig.",
    "dept.", "univ.", "inc.", "ltd.", "co.", "corp.", "st.", "ave.", "rd.",
}


class TextService:
    """Provides sentence segmentation, paragraph normalization, and reading metrics."""

    @staticmethod
    def normalize_text(text: str) -> str:
        """Normalize line breaks and clean non-printable characters."""
        if not text:
            return ""
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        # Replace non-breaking spaces and zero-width spaces
        text = text.replace("\u00a0", " ").replace("\u200b", "")
        # Remove consecutive blank lines
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    @staticmethod
    def extract_paragraphs(text: str) -> List[str]:
        """Split text into cleaned, non-empty paragraphs."""
        normalized = TextService.normalize_text(text)
        if not normalized:
            return []
        raw_paragraphs = re.split(r"\n\s*\n", normalized)
        paragraphs = []
        for p in raw_paragraphs:
            cleaned = " ".join(p.split())
            if cleaned:
                paragraphs.append(cleaned)
        return paragraphs

    @staticmethod
    def extract_sentences(text: str) -> List[str]:
        """
        Segment text into full sentences respecting common English abbreviations
        and punctuation boundaries.
        """
        if not text or not text.strip():
            return []

        text = " ".join(text.split())
        # Regex matching sentence ending punctuation followed by space or end of string
        pattern = r"([.!?]+)(?:\s+|$)"
        tokens = re.split(pattern, text)
        sentences: List[str] = []
        current = ""

        i = 0
        while i < len(tokens):
            chunk = tokens[i]
            if i + 1 < len(tokens):
                punct = tokens[i + 1]
                combined = chunk + punct

                # Check if this period belongs to a known abbreviation or decimal
                last_word = chunk.split()[-1].lower() if chunk.split() else ""
                is_abbrev = (last_word + ".") in ABBREVIATIONS or last_word in ABBREVIATIONS
                is_decimal = bool(re.search(r"\d+\.\d*$", chunk))

                if (is_abbrev or is_decimal) and i + 2 < len(tokens):
                    current += combined + " "
                else:
                    current += combined
                    if current.strip():
                        sentences.append(current.strip())
                    current = ""
                i += 2
            else:
                current += chunk
                if current.strip():
                    sentences.append(current.strip())
                i += 1

        if current.strip():
            sentences.append(current.strip())

        return sentences

    @staticmethod
    def count_words(text: str) -> int:
        """Count words in text."""
        if not text:
            return 0
        return len(re.findall(r"\b\w+\b", text))

    @staticmethod
    def calculate_reading_time(
        word_count: int, words_per_minute: int = 220
    ) -> Tuple[int, int, str]:
        """
        Calculate estimated reading time.
        Returns: (minutes, seconds, formatted_label)
        """
        if word_count <= 0:
            return 0, 0, "0 min read"

        total_seconds = int((word_count / max(words_per_minute, 1)) * 60)
        minutes = total_seconds // 60
        seconds = total_seconds % 60

        if minutes == 0:
            label = "Less than 1 min read"
        elif minutes == 1 and seconds < 15:
            label = "1 min read"
        else:
            display_minutes = minutes if seconds < 30 else minutes + 1
            label = f"{display_minutes} min read"

        return minutes, seconds, label

    @staticmethod
    def is_likely_front_or_end_matter(title: str, paragraphs: List[str]) -> bool:
        """
        Heuristic to detect non-body sections like Copyright, Index, Table of Contents,
        Bibliography, Dedication, or Title Page.
        """
        title_lower = title.lower() if title else ""
        matter_keywords = {
            "copyright", "table of contents", "contents", "index",
            "bibliography", "acknowledgments", "acknowledgements",
            "dedication", "about the author", "title page", "imprint",
            "colophon", "epigraph", "preface", "notes",
        }
        for kw in matter_keywords:
            if kw in title_lower:
                return True

        # If very few words across all paragraphs in an opening section, likely front matter
        total_words = sum(TextService.count_words(p) for p in paragraphs)
        if total_words < 40 and any(w in title_lower for w in ["cover", "title", "half title"]):
            return True

        return False


text_service = TextService()
