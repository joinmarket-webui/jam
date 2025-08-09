import { cn } from '@/lib/utils'
import { Badge } from './badge'

export const DevBadge = ({ className }: { className?: string }) => {
  return (
    <Badge className={cn('z-10', className)} variant="dev">
      dev
    </Badge>
  )
}
