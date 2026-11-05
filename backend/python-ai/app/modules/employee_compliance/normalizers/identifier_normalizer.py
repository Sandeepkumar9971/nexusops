from __future__ import annotations

import re

_NON_ALNUM_PATTERN = re.compile(r"[^A-Za-z0-9]")


def normalize_identifier(raw_value) -> str | None:
    """Normalizes a UAN or IP Number read from Excel or extracted from a
    PDF. Excel in particular is a common source of corruption here: pandas
    reads an all-digit identifier column as a float by default (e.g.
    "100123456789" becomes 100123456789.0), so that specific shape is
    unwrapped before generic cleanup. Returns None for anything that isn't
    actually an identifier (blank, NaN, placeholder dashes)."""
    if raw_value is None:
        return None

    text = str(raw_value).strip()
    if not text or text.lower() in ("nan", "none", "-", "--"):
        return None

    # pandas float-ified integer, e.g. "100123456789.0"
    if re.fullmatch(r"\d+\.0+", text):
        text = text.split(".")[0]

    text = _NON_ALNUM_PATTERN.sub("", text)
    return text or None