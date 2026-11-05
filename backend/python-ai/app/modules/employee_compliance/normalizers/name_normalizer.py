from __future__ import annotations

import re

_PUNCTUATION_PATTERN = re.compile(r"[.,\-_/\\'\"]+")
_WHITESPACE_PATTERN = re.compile(r"\s+")


def normalize_name(raw_name: str | None) -> str:
    """Case/whitespace/punctuation normalization for comparing two names
    that were typed independently into a payroll sheet and a government
    ECR portal. Word order is deliberately NOT changed here — that's
    handled by the matcher's token_sort_ratio, which compares normalized
    names regardless of word order without destroying the original."""
    if not raw_name:
        return ""
    text = raw_name.strip().lower()
    text = _PUNCTUATION_PATTERN.sub(" ", text)
    text = _WHITESPACE_PATTERN.sub(" ", text)
    return text.strip()