import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import Card from '../common/Card'
import Button from '../common/Button'
import { MODULE_STATUS } from '../../config/moduleRegistry'

export default function ModuleCard({ module }) {
  const isActive = module.status === MODULE_STATUS.ACTIVE
  const Icon = module.icon

  return (
    <Card padding="sm" interactive className="flex flex-col">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 text-white shadow-md shadow-indigo-500/25 dark:from-blue-500 dark:to-cyan-500 dark:shadow-blue-500/25">
          <Icon size={20} />
        </span>
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{module.name}</h3>
      </div>
      <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{module.description}</p>
      <div className="mt-4">
        {isActive ? (
          <Button as={Link} to={module.route} size="sm">
            Open Module
            <ArrowRight size={14} />
          </Button>
        ) : (
          <Button size="sm" variant="secondary" disabled className="cursor-not-allowed">
            Coming Soon
          </Button>
        )}
      </div>
    </Card>
  )
}
