import type { SweepPreconditionSummary } from '@/components/sweep/preconditions'
import { PreconditionAlert } from '@/components/ui/jam/PreconditionAlert'

interface SweepPreconditionAlertProps {
  summary: SweepPreconditionSummary
}

export const SweepPreconditionAlert = ({ summary }: SweepPreconditionAlertProps) => {
  return <PreconditionAlert summary={summary} i18nPrefix="scheduler.precondition" />
}
