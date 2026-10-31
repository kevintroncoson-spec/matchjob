import { BENEFIT_DATA } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface BenefitBadgeProps {
  benefit: string
  highlighted?: boolean
}

export function BenefitBadge({ benefit, highlighted }: BenefitBadgeProps) {
  const data = BENEFIT_DATA[benefit]
  if (!data) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
        data.color,
        highlighted && 'ring-2 ring-brand-400'
      )}
    >
      <span>{data.icon}</span>
      <span>{data.label}</span>
    </span>
  )
}
