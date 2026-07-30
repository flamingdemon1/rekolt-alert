"""FastAPI routes for Morisien transcription, translation, and speech."""

from __future__ import annotations

import base64
import binascii
from functools import lru_cache

from fastapi import APIRouter, HTTPException, Request, Response, status

from backend.app.config import settings
from backend.app.prompts.translation_prompts import LanguageCode
from backend.app.schemas.requests import (
    ConversationTurnRequest,
    ImageConversationTurnRequest,
    SpeechRequest,
    TranslationRequest,
)
from backend.app.schemas.responses import (
    ConversationTurnResponse,
    ImageConversationTurnResponse,
    ShopProductContextResponse,
    TranscriptResponse,
    TranslationResponse,
)
from backend.app.services.conversation_service import (
    InMemoryConversationStore,
    VoiceConversationService,
    resolve_conversation_language,
)
from backend.app.services.gemma_client import GoogleGemmaClient
from backend.app.services.image_analysis_service import ImageAnalysisService
from backend.app.services.speech_service import MorisienASRService
from backend.app.services.translation_service import TranslationService
from backend.app.services.tts_service import MorisienTTSService

router = APIRouter(prefix="/language", tags=["Language"])

_asr_service = MorisienASRService()
_tts_service = MorisienTTSService()
_conversation_store = InMemoryConversationStore()


def warm_language_models() -> None:
    """Prepare local speech models before the first farmer interaction."""

    _asr_service.warm_up()
    _tts_service.warm_up()


def _matches_image_signature(data: bytes, mime_type: str) -> bool:
    """Reject files whose declared type does not match their bytes."""

    if mime_type == "image/jpeg":
        return data.startswith(b"\xff\xd8\xff")
    if mime_type == "image/png":
        return data.startswith(b"\x89PNG\r\n\x1a\n")
    if mime_type == "image/webp":
        return (
            len(data) >= 12
            and data.startswith(b"RIFF")
            and data[8:12] == b"WEBP"
        )
    return False


@lru_cache(maxsize=1)
def _gemma_client() -> GoogleGemmaClient:
    """Reuse one lazy SDK client instead of reconnecting on every turn."""

    return GoogleGemmaClient(
        api_key=settings.gemma_api_key(),
        model_name=settings.GEMMA_MODEL_NAME,
        fallback_model_names=(settings.GEMMA_FALLBACK_MODEL_NAME,),
        maximum_attempts=2,
        maximum_output_tokens=1_024,
        thinking_level="minimal",
        request_timeout_ms=25_000,
    )


@lru_cache(maxsize=1)
def _fast_conversation_client() -> GoogleGemmaClient:
    """Use direct answering for low-latency voice conversation turns."""

    return GoogleGemmaClient(
        api_key=settings.gemma_api_key(),
        model_name=settings.GEMMA_MODEL_NAME,
        fallback_model_names=(settings.GEMMA_FALLBACK_MODEL_NAME,),
        maximum_attempts=2,
        maximum_output_tokens=512,
        thinking_level="minimal",
        request_timeout_ms=12_000,
    )


def _translation_service() -> TranslationService:
    return TranslationService(_gemma_client())


@router.post(
    "/transcribe",
    response_model=TranscriptResponse,
    summary="Transcribe a Morisien or English PCM WAV recording",
)
async def transcribe_speech(
    request: Request,
    language: LanguageCode = "mfe",
) -> dict:
    """Return a draft transcript that must be confirmed by the farmer."""

    content_type = request.headers.get("content-type", "")
    if not content_type.lower().startswith(
        ("audio/wav", "audio/x-wav")
    ):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Send the recording as uncompressed PCM WAV audio",
        )

    wav_bytes = await request.body()
    maximum_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if not wav_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The audio body is empty",
        )
    if len(wav_bytes) > maximum_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"Audio must be {settings.MAX_UPLOAD_MB} MB or smaller"
            ),
        )

    try:
        return _asr_service.transcribe_wav(
            wav_bytes,
            language=language,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error


@router.post(
    "/translate",
    response_model=TranslationResponse,
    summary="Translate confirmed text between Morisien and English",
)
def translate_text(payload: TranslationRequest) -> TranslationResponse:
    """Translate text while preserving explicit uncertainty."""

    if not payload.source_confirmed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="source text must be confirmed before translation",
        )

    try:
        result = _translation_service().translate(
            payload.source_text,
            source_language=payload.source_language,
            target_language=payload.target_language,
            source_confirmed=payload.source_confirmed,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    return TranslationResponse(
        source_language=result.source_language,
        target_language=result.target_language,
        translated_text=result.translated_text,
        uncertain_segments=list(result.uncertain_segments),
    )


@router.post(
    "/speech",
    response_class=Response,
    responses={200: {"content": {"audio/wav": {}}}},
    summary="Generate calibrated Morisien speech",
)
def synthesize_morisien(payload: SpeechRequest) -> Response:
    """Return WAV audio without retaining the supplied text or waveform."""

    try:
        wav_bytes = _tts_service.synthesize_wav(payload.text)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    return Response(
        content=wav_bytes,
        media_type="audio/wav",
        headers={"Cache-Control": "no-store"},
    )


@router.post(
    "/conversation/turn",
    response_model=ConversationTurnResponse,
    summary="Continue a conversation from a confirmed transcript",
)
def continue_conversation(
    payload: ConversationTurnRequest,
) -> ConversationTurnResponse:
    """Run the text portion of a turn; request speech separately."""

    try:
        client = _fast_conversation_client()
        service = VoiceConversationService(
            client=client,
            store=_conversation_store,
        )
        language = resolve_conversation_language(
            payload.confirmed_transcript,
            payload.language,
        )
        result = service.respond(
            payload.confirmed_transcript,
            language=language,
            case_id=payload.case_id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    return ConversationTurnResponse(
        case_id=result.case_id,
        source_language=result.source_language,
        confirmed_transcript=result.confirmed_transcript,
        meaning_for_analysis_en=result.meaning_for_analysis_en,
        reply_text=result.reply_text,
        reply_language=result.reply_language,
        translation_uncertain_segments=list(
            result.translation_uncertain_segments
        ),
        shop_products=[
            ShopProductContextResponse(**product.as_prompt_dict())
            for product in result.shop_products
        ],
        preliminary_only=True,
    )


@router.post(
    "/conversation/turn-with-images",
    response_model=ImageConversationTurnResponse,
    summary="Continue a conversation with crop-image observations",
)
def continue_conversation_with_images(
    payload: ImageConversationTurnRequest,
) -> ImageConversationTurnResponse:
    """Send validated crop images to Gemma as preliminary evidence."""

    decoded_images: list[tuple[bytes, str]] = []
    total_bytes = 0
    for image in payload.images:
        try:
            image_bytes = base64.b64decode(
                image.data_base64,
                validate=True,
            )
        except (binascii.Error, ValueError) as error:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"{image.filename} is not valid base64 image data",
            ) from error
        if not image_bytes or not _matches_image_signature(
            image_bytes,
            image.mime_type,
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=f"{image.filename} does not match its image type",
            )
        total_bytes += len(image_bytes)
        decoded_images.append((image_bytes, image.mime_type))

    maximum_bytes = settings.MAX_UPLOAD_MB * 1024 * 1024
    if total_bytes > maximum_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=(
                f"Images must total {settings.MAX_UPLOAD_MB} MB or less"
            ),
        )

    try:
        service = ImageAnalysisService(
            client=_gemma_client(),
            store=_conversation_store,
        )
        language = resolve_conversation_language(
            payload.confirmed_transcript,
            payload.language,
        )
        result = service.respond(
            payload.confirmed_transcript,
            images=decoded_images,
            language=language,
            case_id=payload.case_id,
        )
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error
    except RuntimeError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        ) from error

    return ImageConversationTurnResponse(
        case_id=result.case_id,
        source_language=result.source_language,
        confirmed_transcript=result.confirmed_transcript,
        meaning_for_analysis_en=result.meaning_for_analysis_en,
        reply_text=result.reply_text,
        reply_language=result.reply_language,
        translation_uncertain_segments=list(
            result.translation_uncertain_segments
        ),
        shop_products=[
            ShopProductContextResponse(**product.as_prompt_dict())
            for product in result.shop_products
        ],
        preliminary_only=True,
        visual_observations=list(result.visual_observations),
        possible_risks=list(result.possible_risks),
        missing_information=list(result.missing_information),
        recommended_actions=list(result.recommended_actions),
        urgency=result.urgency,
        warnings=list(result.warnings),
    )
