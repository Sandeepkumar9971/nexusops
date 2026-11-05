// A styled native <select> rather than a hand-built dropdown — keeps
// native keyboard/screen-reader support for free while matching the rest
// of the design system. Pass `options` as either strings or {value, label}.
export default function FilterSelect({ value, onChange, options, placeholder, className = '' }) {
  return (
    <select
      value={value || ''}
      onChange={onChange}
      className={`rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 shadow-sm transition-colors focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15 dark:border-navy-border dark:bg-navy-surface2 dark:text-slate-200 dark:focus:border-blue-400/50 dark:focus:ring-blue-500/15 ${className}`}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => {
        const { value: optValue, label } = typeof option === 'string' ? { value: option, label: option } : option
        return (
          <option key={optValue} value={optValue}>
            {label}
          </option>
        )
      })}
    </select>
  )
}
