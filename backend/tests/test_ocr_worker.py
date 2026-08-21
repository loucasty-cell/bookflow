from ocr_worker import OCR_PROFILES, prediction_texts


def test_worker_profiles_use_complete_v6_pairs():
    assert OCR_PROFILES["small"] == {
        "detector": "PP-OCRv6_small_det",
        "recognizer": "PP-OCRv6_small_rec",
    }
    assert OCR_PROFILES["medium"] == {
        "detector": "PP-OCRv6_medium_det",
        "recognizer": "PP-OCRv6_medium_rec",
    }


def test_prediction_texts_reads_nested_paddle_result():
    payload = {
        "res": {
            "rec_texts": ["Chapter One", "A quiet beginning."],
            "rec_scores": [0.99, 0.97],
        }
    }

    assert prediction_texts(payload) == ["Chapter One", "A quiet beginning."]
