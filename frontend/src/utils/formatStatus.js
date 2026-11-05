// "PARTIALLY_COMPLETED" -> "Partially Completed" — shared by StatusBadge and
// any filter/select that lists raw status enum values to a human.
export function humanizeStatus(status) {
  return status
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
}
