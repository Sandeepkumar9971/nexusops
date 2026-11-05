from app.modules.employee_compliance.matching.name_matcher import classify_name_similarity, compute_name_similarity
from app.modules.employee_compliance.schemas.models import PfEcrRecord, WagesheetRow
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


def verify_pf(row: WagesheetRow, pf_ecr_by_uan: dict[str, list[PfEcrRecord]]) -> dict:
    """PF verification per Case Study 2: UAN is the primary identifier.
    Priority mirrors the spec's own status definitions exactly — a name
    mismatch is reported before any amount comparison is even attempted,
    since AMOUNT_MISMATCH is only meaningful once identifier AND name are
    both confirmed to be the same person."""
    if row.errors or not row.uan:
        reason = "; ".join(row.errors) if row.errors else "Missing UAN in wagesheet."
        return _result(row.pf_amount, None, None, None, None, statuses.NEEDS_REVIEW, reason, None)

    matches = pf_ecr_by_uan.get(row.uan, [])

    if not matches:
        return _result(
            row.pf_amount, None, None, None, None, statuses.MISSING, f"UAN {row.uan} not found in PF ECR.", None
        )

    if len(matches) > 1:
        return _result(
            row.pf_amount,
            None,
            None,
            None,
            None,
            statuses.NEEDS_REVIEW,
            f"UAN {row.uan} appears {len(matches)} times in the PF ECR — ambiguous, needs manual review.",
            None,
        )

    ecr = matches[0]
    name_score = compute_name_similarity(row.name, ecr.name)
    name_class = classify_name_similarity(name_score)

    if ecr.ee_share is None or row.pf_amount is None:
        return _result(
            row.pf_amount,
            ecr.ee_share,
            None,
            ecr.name,
            round(name_score, 1),
            statuses.NEEDS_REVIEW,
            "PF amount missing in the wagesheet or the ECR — cannot compare.",
            ecr.page,
        )

    difference = round(row.pf_amount - ecr.ee_share, 2)

    if name_class == "MISMATCH":
        status, reason = (
            statuses.NAME_MISMATCH,
            f"Employee name differs (similarity {name_score:.0f}%): "
            f"wagesheet '{row.name}' vs PF ECR '{ecr.name}'.",
        )
    elif name_class == "REVIEW":
        status, reason = (
            statuses.NEEDS_REVIEW,
            f"Name similarity ({name_score:.0f}%) is in the manual-review range — "
            f"wagesheet '{row.name}' vs PF ECR '{ecr.name}'.",
        )
    elif abs(difference) > AMOUNT_TOLERANCE:
        status, reason = (
            statuses.AMOUNT_MISMATCH,
            f"PF contribution differs by {difference:+.2f} (wagesheet {row.pf_amount:.2f} vs ECR EE share {ecr.ee_share:.2f}).",
        )
    else:
        status, reason = statuses.MATCHED, "Name and PF contribution both match within tolerance."

    return _result(row.pf_amount, ecr.ee_share, difference, ecr.name, round(name_score, 1), status, reason, ecr.page)
