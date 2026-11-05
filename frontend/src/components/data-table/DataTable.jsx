import { useMemo, useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'
import Card from '../common/Card'
import Button from '../common/Button'
import SearchInput from '../common/SearchInput'
import FilterSelect from '../common/FilterSelect'
import { humanizeStatus } from '../../utils/formatStatus'

export default function DataTable({ columns, rows, searchKeys = [], statusKey, statusOptions, pageSize = 10 }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sort, setSort] = useState({ key: null, direction: 'asc' })
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    let result = rows

    if (statusFilter !== 'ALL' && statusKey) {
      result = result.filter((row) => row[statusKey] === statusFilter)
    }

    if (search.trim()) {
      const term = search.trim().toLowerCase()
      result = result.filter((row) => searchKeys.some((key) => String(row[key] ?? '').toLowerCase().includes(term)))
    }

    if (sort.key) {
      result = [...result].sort((a, b) => {
        const aVal = a[sort.key]
        const bVal = b[sort.key]
        if (aVal == null) return 1
        if (bVal == null) return -1
        if (aVal < bVal) return sort.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sort.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return result
  }, [rows, search, statusFilter, sort, searchKeys, statusKey])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const toggleSort = (key) => {
    setSort((prev) =>
      prev.key === key ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' } : { key, direction: 'asc' },
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {searchKeys.length > 0 && (
          <SearchInput
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            className="w-full sm:max-w-xs"
          />
        )}
        {statusKey && statusOptions && (
          <FilterSelect
            value={statusFilter === 'ALL' ? '' : statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value || 'ALL')
              setPage(1)
            }}
            placeholder="All statuses"
            options={statusOptions.map((option) => ({ value: option, label: humanizeStatus(option) }))}
          />
        )}
      </div>

      <Card padding="none" className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200/80 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-500">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-semibold ${col.sortable ? 'cursor-pointer select-none hover:text-slate-600 dark:hover:text-slate-300' : ''}`}
                  onClick={() => col.sortable && toggleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable &&
                      sort.key === col.key &&
                      (sort.direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-400 dark:text-slate-500">
                  No matching results.
                </td>
              </tr>
            ) : (
              paginated.map((row, idx) => (
                <tr key={row.id ?? idx} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-white/[0.03]">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {col.render ? col.render(row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
