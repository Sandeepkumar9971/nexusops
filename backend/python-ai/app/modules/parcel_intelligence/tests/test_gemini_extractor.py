"""Regression tests for a real bug fixed during submission review: with no
GEMINI_API_KEY configured, extract_with_gemini() used to raise an unhandled
ValueError (genai.Client(api_key=None)) straight out of the pipeline —
meaning a batch run with zero Gemini key (the documented free-tier setup)
would crash on the first image needing the fallback. It must now always
degrade to the same clean {} result as any other Gemini failure."""

from app.modules.parcel_intelligence.extraction import gemini_extractor


def test_is_configured_false_when_no_api_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    assert gemini_extractor.is_configured() is False


def test_is_configured_true_when_api_key_present(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake-key-for-test")
    assert gemini_extractor.is_configured() is True


def test_extract_with_gemini_does_not_raise_with_no_api_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    gemini_extractor._client = None  # reset any cached client from another test
    result = gemini_extractor.extract_with_gemini(b"not-a-real-image")
    assert result == {}


def test_extract_with_gemini_degrades_cleanly_if_client_init_fails(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "fake-key-for-test")
    gemini_extractor._client = None

    def _boom():
        raise RuntimeError("SDK init failed")

    monkeypatch.setattr(gemini_extractor, "_get_client", _boom)
    result = gemini_extractor.extract_with_gemini(b"not-a-real-image")
    assert result == {}
