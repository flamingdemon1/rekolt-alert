# Inside backend/app/services/gemma_service.py
import json
from google import genai
from google.genai import types
from pydantic import BaseModel, Field

from backend.app.config import settings
from backend.app.tools.disease_comp import LightweightDiseaseMatcher
from backend.app.prompts.translation_prompts import (
    TRANSLATION_SYSTEM_PROMPT,
    build_translation_prompt,
)

# 1. Initialize the shared Google GenAI Client explicitly using settings
client = genai.Client(api_key=settings.GEMMA_API_KEY)

# 2. Initialize the computer vision matcher engine once
matcher = LightweightDiseaseMatcher()


class TranslationResponseSchema(BaseModel):
    source_language: str
    target_language: str
    translated_text: str = Field(min_length=1)
    uncertain_segments: list[str] = Field(default_factory=list)


def connection_test() -> str:
    """
    Validates connection integrity to the hosted Gemma instance.
    Must request and return exactly 'CONNECTION_OK'.
    """
    try:
        response = client.models.generate_content(
            model=settings.GEMMA_MODEL_NAME,
            contents="Respond with exactly the text: CONNECTION_OK. Do not include any formatting, markdown, punctuation, or other words.",
            config=types.GenerateContentConfig(temperature=0.0),
        )
        return response.text.strip()
    except Exception as e:
        raise RuntimeError(f"Gemma connection test failed: {str(e)}")


def translate_text(
    source_text: str, source_language: str, target_language: str
) -> dict:
    """
    Translates agricultural text using the established translation system prompts.
    Safely validates JSON variants returned by the hosted model.
    """
    if not source_text or not source_text.strip():
        raise ValueError("Source text cannot be empty or whitespace.")

    prompt_payload = build_translation_prompt(
        source_text=source_text,
        source_language=source_language,
        target_language=target_language,
    )

    try:
        response = client.models.generate_content(
            model=settings.GEMMA_MODEL_NAME,
            contents=prompt_payload,
            config=types.GenerateContentConfig(
                system_instruction=TRANSLATION_SYSTEM_PROMPT,
                temperature=0.1,
                response_mime_type="application/json",
            ),
        )

        raw_text = response.text.strip()
        if not raw_text:
            raise ValueError("Model returned an empty translation response.")

        parsed_json = json.loads(raw_text)

        if isinstance(parsed_json, list):
            if len(parsed_json) != 1:
                raise ValueError("Model returned a list with invalid item count.")
            data_payload = parsed_json[0]
        elif isinstance(parsed_json, dict):
            data_payload = parsed_json
        else:
            raise ValueError("Malformed model response structural type.")

        validated_data = TranslationResponseSchema(**data_payload)
        
        if (validated_data.source_language != source_language or 
                validated_data.target_language != target_language):
            raise ValueError("Model structural output language fields mismatch.")

        return validated_data.model_dump()

    except json.JSONDecodeError as je:
        raise ValueError(f"Failed to parse model translation response as valid JSON: {str(je)}")
    except Exception as e:
        raise RuntimeError(f"Translation execution failed: {str(e)}")


def process_chatbot_image_message(image_bytes: bytes, user_chat_message: str) -> dict:
    """
    Handles an image uploaded inside the AI chatbot interface.
    Cross-references the image via the OpenCV tool matrix, formats targeted product 
    treatment guidelines if issues exist, packages it into a structured prompt, 
    runs hosted inference, and returns a structured response payload.
    """
    # 1. Run the local OpenCV tool to analyze the image's HSV color space fingerprints
    analysis = matcher.find_matching_condition(image_bytes)
    
    # 2. Extract matching details and conditionally append treatment context
    if analysis["status"] == "success":
        detected_condition = analysis["inferred_label"]
        confidence_score = f"{analysis['confidence']}%"
        
        treatment_instruction = (
            f"CRITICAL TREATMENT RULE: An active crop issue ({detected_condition}) was verified. "
            "Cross-reference this condition with available items in the shop area (such as specific agricultural "
            "salts, mineral treatments, or chemical remediation products). Explicitly state the name of the "
            "product, required dosage, and method needed to cure the disease."
        )
    else:
        detected_condition = "Healthy / Inconclusive anomalies"
        confidence_score = "N/A"
        
        treatment_instruction = (
            "CRITICAL TREATMENT RULE: No disease or pathological anomaly was conclusively verified. "
            "Do not mention any treatment plans, chemical products, remedial steps, or shop inventory recommendations. "
            "State that the crop appears healthy or that visual metrics look normal."
        )

    # 3. Formulate the comprehensive system prompt for the Chatbot agent
    system_instruction = (
        "You are the Rekolt Alert expert AI Chatbot specializing in crop diagnostics, soil telemetry, and plant health management. "
        "Your task is to review the computer vision tool data along with the user's message, validate the finding, "
        "and provide an actionable, supportive response. Address the crop problem directly if one exists. "
        "Do not use markdown formatting like bolding tags (** text **) or deep headers anywhere in your output text."
    )
    
    # 4. Package the message payload for Gemma integration
    prompt_payload = f"""
    [SYSTEM CONTEXT]: {system_instruction}
    
    [SHOP INVENTORY & REMEDIATION RULE]: {treatment_instruction}
    
    [USER CHAT MESSAGE]: "{user_chat_message}"
    [LOCAL VISION TOOL DIAGNOSIS]: {detected_condition} (Confidence Match: {confidence_score})
    
    [TASK]: Respond naturally to the user as a knowledgeable chatbot assistant. 
    Acknowledge the visual verification of {detected_condition}. If an active issue is present, detail the remediation 
    steps and specific shop products to apply. If no issue is found, assure the user their plant looks clear.
    """
    
    # 5. Execute hosted inference using your configured Gemma Model Name
    try:
        response = client.models.generate_content(
            model=settings.GEMMA_MODEL_NAME,
            contents=prompt_payload,
        )
        ai_response_text = response.text.strip()
    except Exception as e:
        ai_response_text = f"Hosted AI engine error. Local system metrics noticed {detected_condition}."

    return {
        "status": "success",
        "detected_condition": detected_condition,
        "confidence": confidence_score,
        "ai_response": ai_response_text
    }