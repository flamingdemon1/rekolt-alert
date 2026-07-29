# Proposed shared data contract

The following JSON shape is a proposal only. It is not implemented, validated, or guaranteed by any frontend or backend code.

**The full team must agree on field meaning, required fields, allowed values, privacy handling, and versioning before implementation begins.**

```json
{
  "case_id": "string",
  "language": "mfe | en",
  "crop": "string",
  "location": {
    "district": "string",
    "locality": "string"
  },
  "farmer_statement": "string",
  "visual_observations": [],
  "possible_risks": [],
  "missing_information": [],
  "follow_up_questions": [],
  "weather_context": {},
  "recommended_actions": [],
  "urgency": "low | medium | high",
  "warnings": [],
  "status": "draft | analysing | needs_information | ready_for_review"
}
```

Open decisions include whether observations and risks need typed objects, how warnings and actions are localised, which fields may be absent, and how preliminary results are distinguished from reviewed information.
