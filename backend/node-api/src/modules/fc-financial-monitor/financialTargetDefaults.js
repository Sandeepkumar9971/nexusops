// Kept in sync with backend/python-ai/app/modules/fc_financial_monitor/targets/target_resolver.py —
// CM1/CM2 target ranges are given directly in the business rules (not
// invented), so they're always available even with no FinancialTarget
// documents configured yet.
export const SPECIFIED_CM_TARGETS = {
  cm1: { minimum: 65, maximum: 70, source: 'specification' },
  cm2: { minimum: 15, maximum: 30, source: 'specification' },
}

export const ALL_METRICS = [
  'cm1',
  'cm2',
  'manpower_cost',
  'packaging_cost',
  'power_and_fuel',
  'fc_rent',
  'equipment_rentals',
  'overheads',
]

export const METRIC_LABELS = {
  cm1: 'CM1',
  cm2: 'CM2',
  manpower_cost: 'Manpower Cost',
  packaging_cost: 'Packaging Cost',
  power_and_fuel: 'Power & Fuel',
  fc_rent: 'FC Rent',
  equipment_rentals: 'Equipment Rentals',
  overheads: 'Overheads',
}

// Merges configured FinancialTarget documents with the always-available
// CM1/CM2 specified ranges — any metric with neither comes back
// unconfigured rather than silently guessed.
export function mergeTargets(configuredDocs) {
  const configured = Object.fromEntries(configuredDocs.map((doc) => [doc.metric, doc]))
  const merged = {}
  for (const metric of ALL_METRICS) {
    if (configured[metric]) {
      merged[metric] = {
        metric,
        minimum: configured[metric].minimum,
        maximum: configured[metric].maximum,
        source: configured[metric].source,
      }
    } else if (SPECIFIED_CM_TARGETS[metric]) {
      merged[metric] = { metric, ...SPECIFIED_CM_TARGETS[metric] }
    } else {
      merged[metric] = { metric, minimum: null, maximum: null, source: 'unconfigured' }
    }
  }
  return merged
}
