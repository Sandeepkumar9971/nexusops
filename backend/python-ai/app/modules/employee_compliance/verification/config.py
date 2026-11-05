import os

# --- Name-matching thresholds (0-100 similarity score from rapidfuzz) ---
#
# Three bands, not a single cutoff, because a single threshold forces every
# borderline case into either "trust it" or "reject it" — neither is safe
# for a compliance tool. The gap between the two thresholds is a deliberate
# "I'm not confident enough to decide" zone that routes to human review
# instead of guessing.
#
#   score >= NAME_AUTO_MATCH_THRESHOLD   -> name treated as matching
#   NAME_MISMATCH_THRESHOLD <= score <   -> ambiguous: NEEDS_REVIEW
#     NAME_AUTO_MATCH_THRESHOLD
#   score <  NAME_MISMATCH_THRESHOLD     -> treated as a genuine mismatch
#
# 90 was chosen for auto-match because it comfortably absorbs common
# formatting noise (extra spaces, inconsistent capitalization, a swapped
# first/last name order) without absorbing a real spelling difference
# between two different people's names. 70 was chosen as the mismatch
# floor because below it, two names share so little character overlap
# that treating them as "probably the same person, needs a quick look"
# would be misleading — below 70 is "probably a different person".
# Both are overridable via env for teams that want to tune them.
NAME_AUTO_MATCH_THRESHOLD = float(os.getenv("COMPLIANCE_NAME_AUTO_MATCH_THRESHOLD", "90"))
NAME_MISMATCH_THRESHOLD = float(os.getenv("COMPLIANCE_NAME_MISMATCH_THRESHOLD", "70"))

# --- Amount tolerance (currency units, e.g. rupees) ---
#
# Payroll software and government ECR portals round contributions
# independently (nearest rupee, truncation vs rounding, etc.), so a ₹1
# difference is routine noise, not a compliance finding. Anything larger
# is a real, reportable discrepancy. Overridable via env since different
# organizations may have different internal rounding conventions.
AMOUNT_TOLERANCE = float(os.getenv("COMPLIANCE_AMOUNT_TOLERANCE", "1.0"))
