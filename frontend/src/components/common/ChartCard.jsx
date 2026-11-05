import Card from './Card'

// Charts stay on the solid Card surface (never glass) per the design
// system's rule that dense/analytical content needs full contrast — this
// just standardizes the title + height wrapper every chart in the app uses.
export default function ChartCard({ title, action, children, height = 'h-64' }) {
  return (
    <Card padding="sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
        {action}
      </div>
      <div className={`mt-3 ${height}`}>{children}</div>
    </Card>
  )
}
