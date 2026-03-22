interface StatCardProps {
  title: string
  value: string | number
  icon: string
  subtitle?: string
  color?: 'default' | 'red' | 'green' | 'yellow'
}

const colorMap = {
  default: 'bg-primary-50 text-primary-700',
  red:     'bg-red-50 text-red-700',
  green:   'bg-green-50 text-green-700',
  yellow:  'bg-amber-50 text-amber-700',
}

export default function StatCard({ title, value, icon, subtitle, color = 'default' }: StatCardProps) {
  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`rounded-xl p-3 text-xl ${colorMap[color]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p>
        <p className="mt-1 text-2xl font-bold text-gray-900 truncate">{value}</p>
        {subtitle && <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>}
      </div>
    </div>
  )
}
