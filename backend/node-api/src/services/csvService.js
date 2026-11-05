// Shared CSV generation — any module can hand this an array of plain
// objects plus its own column definitions, instead of hand-rolling escaping
// logic per module.
function escapeCsvValue(value) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// columns: [{ header: string, value: (row) => any }]
export function toCsv(rows, columns) {
  const headerLine = columns.map((col) => escapeCsvValue(col.header)).join(',')
  const dataLines = rows.map((row) => columns.map((col) => escapeCsvValue(col.value(row))).join(','))
  return [headerLine, ...dataLines].join('\n')
}
