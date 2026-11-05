// Kept in sync with the limits enforced server-side in
// backend/node-api/src/modules/fc-financial-monitor/fcFinancialMonitor.routes.js
export const MAX_FILE_SIZE_MB = 20
export const FINANCIAL_FILE_ACCEPT =
  '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv'

export const FC_STATUS = {
  RED: 'RED',
  YELLOW: 'YELLOW',
  GREEN: 'GREEN',
  BLUE: 'BLUE',
  UNKNOWN: 'UNKNOWN',
}

export const FC_STATUS_OPTIONS = [FC_STATUS.RED, FC_STATUS.YELLOW, FC_STATUS.GREEN, FC_STATUS.BLUE]

export const ANOMALY_SEVERITY_OPTIONS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']
export const ANOMALY_STATUS_OPTIONS = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'IGNORED']

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

// Anomaly documents store `metric` as the human label (e.g. "CM1",
// "Manpower Cost") rather than the raw key, since that's what Python's
// anomaly-detection engine produces — these are the values anomaly/FC
// filters actually match against.
export const ANOMALY_METRIC_OPTIONS = Object.values(METRIC_LABELS)

export const COST_CATEGORIES = [
  'manpower_cost',
  'packaging_cost',
  'power_and_fuel',
  'fc_rent',
  'equipment_rentals',
  'overheads',
]

// Mirrors financial_service.py's currentStage values, in pipeline order —
// drives the processing panel's step list.
export const PROCESSING_STAGES = [
  'File validation',
  'Data extraction',
  'Data normalization',
  'FC and date grouping',
  'Target comparison',
  'CM1 calculation',
  'CM2 calculation',
  'Cost percentage calculation',
  'Anomaly detection',
  'Insight generation',
  'Daily digest generation',
]

export const FIELD_LABELS = {
  fc_id: 'FC ID',
  fc_name: 'FC Name',
  day: 'Day',
  revenue: 'Revenue',
  manpower_cost: 'Manpower Cost',
  packaging_cost: 'Packaging Cost',
  power_and_fuel: 'Power & Fuel',
  fc_rent: 'FC Rent',
  equipment_rentals: 'Equipment Rentals',
  overheads: 'Overheads',
}
