from app.modules.employee_compliance.matching.name_matcher import classify_name_similarity, compute_name_similarity
from app.modules.employee_compliance.schemas.models import EsicEcrRecord, WagesheetRow
from app.modules.employee_compliance.verification import statuses
from app.modules.employee_compliance.verification.config import AMOUNT_TOLERANCE


def _result(wagesheet_amount, ecr_amount, difference, ecr_name, name_similarity, status, reason, source_page):
    return {
        "wagesheetAmount": wagesheet_amount,
        "ecrAmount": ecr_amount,
        "difference": difference,
        "ecrName": ecr_name,
        "nameSimilarity": name_similarity,
        "status": status,
        "reason": reason,
        "sourcePage": source_page,
    }


def verify_esic(row: WagesheetRow, esic_ecr_by_ip: dict[str, list[EsicEcrRecord]]) -> dict:
    """ESIC verification per Case Study 2: IP Number is the primary
    identifier. Same priority order as PF verification — name mismatch is
    reported before amount comparison, matching the spec's own status
    definitions (AMOUNT_MISMATCH requires identifier AND name to already
    match)."""
    if row.errors or not row.ip_number:
        reason = "; ".join(row.errors) if row.errors else "Missing IP Number in wagesheet."
        return _result(row.esic_amount, None, None, None, None, statuses.NEEDS_REVIEW, reason, None)

    matches = esic_ecr_by_ip.get(row.ip_number, [])

    if not matches:
        return _result(
            row.esic_amount,
            None,
            None,
            None,
            None,
            statuses.MISSING,
            f"IP Number {row.ip_number} not found in ESIC ECR.",
            None,
        )

    if len(matches) > 1:
        return _result(
            row.esic_amount,
            None,
            None,
            None,
            None,
            statuses.NEEDS_REVIEW,
            f"IP Number {row.ip_number} appears {len(matches)} times in the ESIC ECR — ambiguous, needs manual review.",
            None,
        )

    ecr = matches[0]
    name_score = compute_name_similarity(row.name, ecr.name)
    name_class = classify_name_similarity(name_score)

    if ecr.ip_contribution is None or row.esic_amount is None:
        return _result(
            row.esic_amount,
            ecr.ip_contribution,
            None,
            ecr.name,
            round(name_score, 1),
            statuses.NEEDS_REVIEW,
            "ESIC amount missing in the wagesheet or the ECR — cannot compare.",
            ecr.page,
        )

    difference = round(row.esic_amount - ecr.ip_contribution, 2)

    if name_class == "MISMATCH":
        status, reason = (
            statuses.NAME_MISMATCH,
            f"Employee name differs (similarity {name_score:.0f}%): "
            f"wagesheet '{row.name}' vs ESIC ECR '{ecr.name}'.",
        )
    elif name_class == "REVIEW":
        status, reason = (
            statuses.NEEDS_REVIEW,
            f"Name similarity ({name_score:.0f}%) is in the manual-review range — "
            f"wagesheet '{row.name}' vs ESIC ECR '{ecr.name}'.",
        )
    elif abs(difference) > AMOUNT_TOLERANCE:
        status, reason = (
            statuses.AMOUNT_MISMATCH,
            f"ESIC contribution differs by {difference:+.2f} "
            f"(wagesheet {row.esic_amount:.2f} vs ECR IP contribution {ecr.ip_contribution:.2f}).",
        )
    else:
        status, reason = statuses.MATCHED, "Name and ESIC contribution both match within tolerance."

    return _result(
        row.esic_amount, ecr.ip_contribution, difference, ecr.name, round(name_score, 1), status, reason, ecr.page
    )
