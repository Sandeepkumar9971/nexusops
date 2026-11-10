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
    # For the one direction Python calls Node instead of the usual reverse:
    # posting a notification after a job finishes (or a critical anomaly
    # fires mid-job). Shares INTERNAL_API_TOKEN with Node's
    # requireInternalToken middleware — never a user JWT.
    node_api_base_url: str = os.getenv("NODE_API_BASE_URL", "http://127.0.0.1:4000/api")
    internal_api_token: str = os.getenv("INTERNAL_API_TOKEN", "")


settings = Settings()
