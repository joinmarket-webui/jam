import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export const DevBadge = ({ className }: { className?: string }) => {
  return (
    <Badge className={cn('z-10', className)} variant="dev">
      dev
    </Badge>
  )
}
