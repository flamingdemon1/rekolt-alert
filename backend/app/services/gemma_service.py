# Inside backend/app/services/gemma_service.py
import os
from backend.app.tools.disease_comp import LightweightDiseaseMatcher

# Initialize the computer vision matcher engine once for the chatbot service
matcher = LightweightDiseaseMatcher()

def process_chatbot_image_message(image_bytes: bytes, user_chat_message: str) -> dict:
    """
    Handles an image uploaded inside the AI chatbot interface.
    Cross-references the image via the OpenCV tool matrix, formats targeted product 
    treatment guidelines if issues exist, packages it into a structured prompt, 
    and returns the Gemma context payload.
    """
    # 1. Run the local OpenCV tool to analyze the image's HSV color space fingerprints
    analysis = matcher.find_matching_condition(image_bytes)
    
    # 2. Extract matching details and conditionally append treatment context
    if analysis["status"] == "success":
        detected_condition = analysis["inferred_label"]
        confidence_score = f"{analysis['confidence']}%"
        
        # Treatment instruction: Dynamically inform Gemma which inventory products apply
        treatment_instruction = (
            f"CRITICAL TREATMENT RULE: An active crop issue ({detected_condition}) was verified. "
            "Cross-reference this condition with available items in the shop area (such as specific agricultural "
            "salts, mineral treatments, or chemical remediation products). Explicitly state the name of the "
            "product, required dosage, and method needed to cure the disease."
        )
    else:
        detected_condition = "Healthy / Inconclusive anomalies"
        confidence_score = "N/A"
        
        # Treatment instruction: Suppress all treatment mentions if no disease is found
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
    Acknowledge the visual verification of {detected_condition}. If an active issue is present, detail the remediation "
    "steps and specific shop products to apply. If no issue is found, assure the user their plant looks clear."
    """
    
    # 5. Return the payload structured for your main chatbot router execution
    return {
        "status": "success",
        "detected_condition": detected_condition,
        "confidence": confidence_score,
        "raw_prompt_for_gemma": prompt_payload
    }