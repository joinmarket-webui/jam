import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'

export type OperationBlockReason = 'makerRunning' | 'coinjoinRunning' | 'rescanRunning' | 'schedulePending'

export interface OperationAvailability {
  enabled: boolean
  reasons: OperationBlockReason[]
}

export interface OperationsAvailability {
  receive: OperationAvailability
  rescan: OperationAvailability
  earn: OperationAvailability
  send: OperationAvailability
  sweep: OperationAvailability
  walletUtxos: OperationAvailability
  walletLock: OperationAvailability
}

export const getOperationsAvailability = (
  session: SessionResponse | undefined,
  rescanning: boolean,
): OperationsAvailability => {
  const reasons: OperationBlockReason[] = []
  if (session?.maker_running === true) reasons.push('makerRunning')
  if (session?.coinjoin_in_process === true) reasons.push('coinjoinRunning')
  if (rescanning) reasons.push('rescanRunning')
  if ((session?.schedule?.length ?? 0) > 0) reasons.push('schedulePending')

  const sweepReasons = reasons.filter((reason) => reason !== 'schedulePending')
  const receiveReasons = reasons.filter((reason) => reason === 'rescanRunning')
  const walletLockReasons = reasons.filter((reason) => reason !== 'rescanRunning')
  return {
    receive: { enabled: receiveReasons.length === 0, reasons: receiveReasons },
    rescan: { enabled: receiveReasons.length === 0, reasons: receiveReasons },
    earn: { enabled: sweepReasons.length === 0, reasons: sweepReasons },
    send: { enabled: reasons.length === 0, reasons },
    sweep: { enabled: sweepReasons.length === 0, reasons: sweepReasons },
    walletUtxos: { enabled: sweepReasons.length === 0, reasons: sweepReasons },
    walletLock: { enabled: walletLockReasons.length === 0, reasons: walletLockReasons },
  }
}
