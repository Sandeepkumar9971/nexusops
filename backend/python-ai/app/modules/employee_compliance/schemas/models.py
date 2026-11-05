from typing import Optional

from pydantic import BaseModel, Field


class WagesheetRow(BaseModel):
    """One parsed row from the vendor wagesheet. Kept permissive (fields
    optional) on purpose — validation happens explicitly in the parser,
    which records problems in `errors` instead of raising and discarding
    the row. A row with errors still flows through to verification as
    NEEDS_REVIEW rather than vanishing silently."""

    row_number: int = Field(description="1-based row number in the original sheet, for error messages")
    name: Optional[str] = None
    uan: Optional[str] = None
    ip_number: Optional[str] = None
    agency: Optional[str] = None
    state: Optional[str] = None
    esic_amount: Optional[float] = None
    pf_amount: Optional[float] = None
    errors: list[str] = Field(default_factory=list)


class PfEcrRecord(BaseModel):
    uan: str
    name: Optional[str] = None
    ee_share: Optional[float] = None
    page: Optional[int] = None


class EsicEcrRecord(BaseModel):
    ip_number: str
    name: Optional[str] = None
    wages: Optional[float] = None
    ip_contribution: Optional[float] = None
    page: Optional[int] = None


class ParseResult(BaseModel):
    """Generic wrapper every parser returns: what it found, plus
    document-level problems (corrupt file, missing columns, unreadable
    PDF) that apply to the whole document rather than one row/record."""

    rows: list = Field(default_factory=list)
    document_errors: list[str] = Field(default_factory=list)
    is_reliable: bool = True
    # Real EPFO/ESIC ECR exports (confirmed against an actual sample) are
    # routinely plain text with no drawn table gridlines at all — pdfplumber
    # finds zero tables and the line-based text fallback is the NORMAL path,
    # not a degraded one. That fallback has proven accurate when it can
    # confidently parse each line. OCR (a genuinely scanned page) is the
    # actually-risky case, so it gets its own flag rather than being lumped
    # into the same "unreliable" bucket as an ordinary text-based ECR.
    used_ocr: bool = False
