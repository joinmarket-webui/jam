import type { TakerStatusResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'

type KnownTakerStatus =
  | 'idle'
  | 'fetching_orderbook'
  | 'filling'
  | 'authenticating'
  | 'collecting_signatures'
  | 'broadcasting'
  | 'complete'
  | 'failed'
  | 'cancelled'

// backend may report values unknown to this version of the ui
export type TakerStatus = KnownTakerStatus | (string & Record<never, never>)

// a broadcast delivered via makers without local mempool access is not verified
const UNVERIFIED_BROADCAST_METHOD_PREFIX = 'makers-unverified:'

export interface TakerStatusInfo {
  value?: TakerStatus
  idle: boolean
  fetchingOrderbook: boolean
  filling: boolean
  authenticating: boolean
  collectingSignatures: boolean
  broadcasting: boolean
  completed: boolean
  completedUnverified: boolean
  failed: boolean
  cancelled: boolean
  // the run has an outcome (the taker might still report `running` while shutting down)
  final: boolean
}

export const toTakerStatusInfo = (response?: TakerStatusResponse): TakerStatusInfo => {
  const value = response?.status ?? undefined
  const completed = value === 'complete'
  const failed = value === 'failed'
  const cancelled = value === 'cancelled'
  return {
    value,
    idle: value === 'idle',
    fetchingOrderbook: value === 'fetching_orderbook',
    filling: value === 'filling',
    authenticating: value === 'authenticating',
    collectingSignatures: value === 'collecting_signatures',
    broadcasting: value === 'broadcasting',
    completed,
    completedUnverified: completed && !!response?.broadcast_method?.startsWith(UNVERIFIED_BROADCAST_METHOD_PREFIX),
    failed,
    cancelled,
    final: completed || failed || cancelled,
  }
}
