import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import ChartCard from '../../../components/common/ChartCard'
import { useTheme } from '../../../app/providers/ThemeProvider'
import { COST_CATEGORIES, METRIC_LABELS } from '../constants'

const COST_COLORS = ['#6366f1', '#f59e0b', '#ef4444', '#10b981', '#8b5cf6', '#06b6d4']

export default function FCDetailCharts({ trends, anomalyCounts }) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const gridColor = isDark ? '#334155' : '#f1f5f9'
  const tickColor = isDark ? '#94a3b8' : '#64748b'
  const tooltipStyle = isDark
    ? { background: '#1C2B40', border: '1px solid #334155', borderRadius: 8, color: '#F8FAFC', fontSize: 12 }
    : { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12 }
  const primaryLine = isDark ? '#3B82F6' : '#4f46e5'
  const secondaryLine = isDark ? '#22D3EE' : '#10b981'
  const barColor = isDark ? '#F59E0B' : '#f59e0b'

  const revenueData = trends.map((t) => ({ date: t.date, revenue: t.revenue }))
  const marginData = trends.map((t) => ({ date: t.date, 'CM1 %': t.cm1Percentage, 'CM2 %': t.cm2Percentage }))
  const costData = trends.map((t) => ({
    date: t.date,
    ...Object.fromEntries(COST_CATEGORIES.map((key) => [METRIC_LABELS[key], t.costPercentages?.[key] ?? null])),
  }))
  const anomalyData = anomalyCounts.map((a) => ({ date: a.date, anomalies: a.count }))

  return (
    <div className="space-y-4">
      <ChartCard title="Daily Revenue Trend">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={revenueData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} />
            <YAxis tick={{ fontSize: 11, fill: tickColor }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Line type="monotone" dataKey="revenue" stroke={primaryLine} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="CM1 % / CM2 % Trend">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={marginData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} />
            <YAxis tick={{ fontSize: 11, fill: tickColor }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, color: tickColor }} />
            <Line type="monotone" dataKey="CM1 %" stroke={primaryLine} strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="CM2 %" stroke={secondaryLine} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Cost Category % Trends">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={costData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} />
            <YAxis tick={{ fontSize: 11, fill: tickColor }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 12, color: tickColor }} />
            {COST_CATEGORIES.map((key, idx) => (
              <Line key={key} type="monotone" dataKey={METRIC_LABELS[key]} stroke={COST_COLORS[idx]} strokeWidth={2} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <ChartCard title="Historical Anomaly Counts">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={anomalyData}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: tickColor }} />
            <YAxis tick={{ fontSize: 11, fill: tickColor }} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="anomalies" fill={barColor} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  )
}
