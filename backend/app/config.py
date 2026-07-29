import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Project Identity Settings
    PROJECT_NAME: str = "Rekolt Alert"
    API_V1_STR: str = "/api/v1"
    
    # Hosted Gemma Model Configuration
    GEMMA_API_KEY: str
    GEMMA_MODEL_NAME: str = "gemma-4-26b-a4b-it"

    # Configure pydantic to scan and load from the local .env file
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore" # Safely bypass extra environment variables
    )

# Instantiate settings to import across services
settings = Settings()