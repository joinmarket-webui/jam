import type { SessionResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { describe, expect, it } from 'vitest'
import { getOperationsAvailability } from './operationAvailability'

const session = (overrides: Partial<SessionResponse> = {}): SessionResponse => ({
  session: true,
  maker_running: false,
  coinjoin_in_process: false,
  ...overrides,
})

describe('getOperationsAvailability', () => {
  it('enables operations when the wallet is idle', () => {
    expect(getOperationsAvailability(session({ schedule: [] }), false)).toEqual({
      receive: { enabled: true, reasons: [] },
      rescan: { enabled: true, reasons: [] },
      earn: { enabled: true, reasons: [] },
      send: { enabled: true, reasons: [] },
      sweep: { enabled: true, reasons: [] },
      walletUtxos: { enabled: true, reasons: [] },
      walletLock: { enabled: true, reasons: [] },
    })
  })

  it('blocks a pending schedule even when no coinjoin is running', () => {
    const operations = getOperationsAvailability(session({ schedule: [['pending']] }), false)
    expect(operations.send).toEqual({ enabled: false, reasons: ['schedulePending'] })
    expect(operations.sweep).toEqual({ enabled: true, reasons: [] })
    expect(operations.earn).toEqual({ enabled: true, reasons: [] })
    expect(operations.receive).toEqual({ enabled: true, reasons: [] })
    expect(operations.rescan).toEqual({ enabled: true, reasons: [] })
  })

  it('reports every active blocker', () => {
    expect(
      getOperationsAvailability(
        session({ maker_running: true, coinjoin_in_process: true, schedule: [['pending']] }),
        true,
      ).sweep,
    ).toEqual({
      enabled: false,
      reasons: ['makerRunning', 'coinjoinRunning', 'rescanRunning'],
    })
  })

  it('only blocks receive during a rescan', () => {
    expect(getOperationsAvailability(session({ maker_running: true }), false).receive).toEqual({
      enabled: true,
      reasons: [],
    })
    expect(getOperationsAvailability(session(), true).receive).toEqual({
      enabled: false,
      reasons: ['rescanRunning'],
    })
  })
})
