import { MonitorCheckIcon, MonitorUpIcon, MonitorXIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { JmWebsocket } from '@/hooks/useJmWebsocket'
import { cn } from '@/lib/utils'

type JmWebsocketIconProps = Pick<JmWebsocket, 'isOpen' | 'isAuthenticated'> & {
  className?: string
}

const JmWebsocketIcon = ({ className, isOpen, isAuthenticated }: JmWebsocketIconProps) => {
  if (isAuthenticated) {
    return <MonitorCheckIcon className={cn('light:text-green-600 text-green-300', className)} />
  }
  if (isOpen) {
    return <MonitorUpIcon className={cn('text-foreground', className)} />
  }
  return <MonitorXIcon className={cn('text-muted-foreground', className)} />
}

type JmWebsocketInfoProps = JmWebsocketIconProps

export const JmWebsocketInfo = ({ className, isOpen, isAuthenticated }: JmWebsocketInfoProps) => {
  const { t } = useTranslation()
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <JmWebsocketIcon isOpen={isOpen} isAuthenticated={isAuthenticated} className={className} />
      </TooltipTrigger>
      <TooltipContent>{isOpen ? t('footer.websocket_connected') : t('footer.websocket_disconnected')}</TooltipContent>
    </Tooltip>
  )
}
