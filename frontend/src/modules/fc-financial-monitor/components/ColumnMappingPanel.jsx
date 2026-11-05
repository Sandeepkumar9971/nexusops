import Card from '../../../components/common/Card'
import { FIELD_LABELS } from '../constants'

const MAPPABLE_FIELDS = [
  'fc_name',
  'fc_id',
  'day',
  'revenue',
  'manpower_cost',
  'packaging_cost',
  'power_and_fuel',
  'fc_rent',
  'equipment_rentals',
  'overheads',
]

export default function ColumnMappingPanel({ detectedColumns, detectedMapping, onRemap }) {
  return (
    <Card padding="sm">
      <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Column Mapping</h3>
      <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
        Columns are matched automatically — override any field below if the detected column is wrong.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {MAPPABLE_FIELDS.map((field) => (
          <label key={field} className="flex items-center justify-between gap-2 text-sm">
            <span className="text-slate-600 dark:text-slate-400">{FIELD_LABELS[field]}</span>
            <select
              value={detectedMapping?.[field] || ''}
              onChange={(event) => onRemap(field, event.target.value || null)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-700 transition-colors focus:border-indigo-400 focus:outline-none dark:border-navy-border dark:bg-navy-surface2 dark:text-slate-200 dark:focus:border-blue-400/50"
            >
              <option value="">— Not mapped —</option>
              {detectedColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </Card>
  )
}
