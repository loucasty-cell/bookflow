"""Tests for sentence segmentation, normalization, and metrics."""

from app.services.text_service import text_service


def test_text_normalization():
    raw = "Hello   world.\r\n\r\nThis is\u00a0a test.\n\n\n\nAnother line."
    cleaned = text_service.normalize_text(raw)
    assert "\r" not in cleaned
    assert "\u00a0" not in cleaned
    assert "\n\n\n" not in cleaned


def test_sentence_segmentation_with_abbreviations():
    text = "Dr. Watson met Mr. Holmes at 3.14 Baker St. in London. They started the investigation immediately!"
    sentences = text_service.extract_sentences(text)
    assert len(sentences) == 2
    assert "Dr. Watson met Mr. Holmes at 3.14 Baker St. in London." in sentences[0]
    assert "They started the investigation immediately!" in sentences[1]


def test_reading_time_calculation():
    # 440 words at 220 WPM = 2 minutes
    minutes, seconds, label = text_service.calculate_reading_time(440, words_per_minute=220)
    assert minutes == 2
    assert seconds == 0
    assert label == "2 min read"

    # 10 words = Less than 1 min read
    m, s, lbl = text_service.calculate_reading_time(10, words_per_minute=220)
    assert lbl == "Less than 1 min read"


def test_front_matter_detection():
    assert text_service.is_likely_front_or_end_matter("Table of Contents", ["Item 1", "Item 2"]) is True
    assert text_service.is_likely_front_or_end_matter("Copyright Notice", ["All rights reserved."]) is True
    assert text_service.is_likely_front_or_end_matter("Chapter One", ["The wind howled across the moors."]) is False
