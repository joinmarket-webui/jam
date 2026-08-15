import type { SweepPreconditionSummary } from '@/components/sweep/preconditions'
import { PreconditionAlert } from '@/components/ui/jam/PreconditionAlert'

interface SendCoinjoinPreconditionAlertProps {
  summary: SweepPreconditionSummary
}

export const SendCoinjoinPreconditionAlert = ({ summary }: SendCoinjoinPreconditionAlertProps) => {
  return <PreconditionAlert summary={summary} i18nPrefix="send.coinjoin_precondition" />
}
