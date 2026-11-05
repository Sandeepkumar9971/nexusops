import os

from dotenv import load_dotenv

load_dotenv()

# app/core/config.py -> core -> app -> python-ai -> backend -> ai-hub (project root)
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../../"))


class Settings:
    app_name: str = "NexusOps - Python AI Service"
    port: int = int(os.getenv("PORT", "8000"))
    mongodb_uri: str = os.getenv("MONGODB_URI", "")
    # Same physical folder Node writes uploads into — both services assume
    # a shared local filesystem for now (fine for a single-host MVP).
    upload_root: str = os.path.join(PROJECT_ROOT, "uploads")


settings = Settings()
