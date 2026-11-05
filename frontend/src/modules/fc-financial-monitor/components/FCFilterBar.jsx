import SearchInput from '../../../components/common/SearchInput'
import FilterSelect from '../../../components/common/FilterSelect'
import { FC_STATUS_OPTIONS, ANOMALY_METRIC_OPTIONS } from '../constants'
import { humanizeStatus } from '../../../utils/formatStatus'

export default function FCFilterBar({ filters, onChange }) {
  const update = (key, value) => onChange({ ...filters, [key]: value || undefined })

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <SearchInput
        value={filters.fc || ''}
        onChange={(event) => update('fc', event.target.value)}
        placeholder="Search FC name..."
        className="w-full sm:max-w-xs"
      />

      <input
        type="date"
        value={filters.dateFrom || ''}
        onChange={(event) => update('dateFrom', event.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 dark:border-navy-border dark:bg-navy-surface2 dark:text-slate-200 dark:[color-scheme:dark] dark:focus:border-blue-400/50 dark:focus:ring-blue-500/15"
      />
      <span className="text-xs text-slate-400 dark:text-slate-500">to</span>
      <input
        type="date"
        value={filters.dateTo || ''}
        onChange={(event) => update('dateTo', event.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 dark:border-navy-border dark:bg-navy-surface2 dark:text-slate-200 dark:[color-scheme:dark] dark:focus:border-blue-400/50 dark:focus:ring-blue-500/15"
      />

      <FilterSelect
        value={filters.status}
        onChange={(event) => update('status', event.target.value)}
        placeholder="All statuses"
        options={FC_STATUS_OPTIONS.map((status) => ({ value: status, label: humanizeStatus(status) }))}
      />

      <FilterSelect
        value={filters.anomalyCategory}
        onChange={(event) => update('anomalyCategory', event.target.value)}
        placeholder="All anomaly categories"
        options={ANOMALY_METRIC_OPTIONS}
      />
    </div>
  )
}
