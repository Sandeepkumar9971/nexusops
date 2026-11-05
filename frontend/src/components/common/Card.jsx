// Two surface types, per the design system's glassmorphism rule: `glass`
// is translucent + blurred, reserved for KPI cards, modals, dropdowns, and
// drawers — never for data tables, forms, charts, or warnings, which stay
// on the solid `variant` so dense data keeps full contrast and readability.
export default function Card({ children, className = '', padding = 'md', interactive = false, variant = 'solid', ...rest }) {
  const paddingClass = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' }[padding]

  const surfaceClass =
    variant === 'glass'
      ? 'border border-slate-200/80 bg-white shadow-soft dark:border-white/10 dark:bg-[rgba(22,34,53,0.72)] dark:shadow-glass dark:backdrop-blur-xl'
      : 'border border-slate-200/80 bg-white shadow-soft dark:border-navy-border/60 dark:bg-navy-surface dark:shadow-none'

  return (
    <div
      className={`rounded-2xl transition-shadow duration-200 ${surfaceClass} ${
        interactive ? 'hover:shadow-soft-md dark:hover:border-navy-border' : ''
      } ${paddingClass} ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
