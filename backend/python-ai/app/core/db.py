from pymongo import MongoClient

from app.core.config import settings

_client = None


def get_db():
    """Returns the shared 'ai-hub' database — same cluster and database
    Node connects to. The worker writes job progress and per-image results
    directly here; Node never needs to relay anything between the two."""
    global _client
    if _client is None:
        _client = MongoClient(settings.mongodb_uri)
    return _client.get_default_database()
