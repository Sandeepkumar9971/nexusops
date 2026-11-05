import { Building2, IndianRupee, TrendingUp, TrendingDown } from 'lucide-react'
import KpiCard from '../../../components/dashboard/KpiCard'
import Card from '../../../components/common/Card'

export default function FinancialSummaryCards({ data, loading }) {
  const kpis = [
    { label: 'Total FCs', value: data.totalFCs, icon: Building2, accent: 'indigo' },
    { label: 'Total Revenue', value: `₹${data.totalRevenue.toLocaleString()}`, icon: IndianRupee, accent: 'green' },
    { label: 'Average CM1 %', value: data.averageCm1Percentage != null ? `${data.averageCm1Percentage}%` : '—', icon: TrendingUp, accent: 'indigo' },
    { label: 'Average CM2 %', value: data.averageCm2Percentage != null ? `${data.averageCm2Percentage}%` : '—', icon: TrendingDown, accent: 'slate' },
  ]

  const statusCards = [
    { label: 'Red FCs', value: data.redFCs, color: 'text-red-600 dark:text-red-400' },
    { label: 'Yellow FCs', value: data.yellowFCs, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Green FCs', value: data.greenFCs, color: 'text-green-600 dark:text-green-400' },
    { label: 'Blue FCs', value: data.blueFCs, color: 'text-blue-600 dark:text-cyan-400' },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} loading={loading} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {statusCards.map((card) => (
          <Card key={card.label} padding="sm">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{card.label}</p>
            <p className={`mt-2 text-2xl font-semibold tabular-nums ${card.color}`}>{loading ? '—' : card.value}</p>
          </Card>
        ))}
      </div>
    </div>
  )
}
