from backend.app.services.language_service import (
    split_unique_morisien_word_boundaries,
)


def prepare_morisien_transcript(mms_transcript: str) -> dict:
    corrected_transcript, corrections = (
        split_unique_morisien_word_boundaries(mms_transcript)
    )

    return {
        "language": "mfe",
        "raw_transcript": mms_transcript,
        "corrected_transcript": corrected_transcript,
        "automatic_corrections": [
            {
                "original": correction.original,
                "replacement": correction.replacement,
            }
            for correction in corrections
        ],
        "requires_confirmation": True,
    }