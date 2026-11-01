import type { TakerStatusResponse } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PaymentAttempt, TakerInfo } from '@/context/JamSessionInfoContext'
import type { Jar } from '@/context/JamWalletInfoContext'
import { TX_FEE_UNITS } from '@/lib/feeConfig'
import { toTakerStatusInfo } from '@/lib/takerStatus'
import { TakerStatusCard } from './TakerStatusCard'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => (options ? `${key}:${JSON.stringify(options)}` : key),
  }),
  Trans: ({ i18nKey, children }: { i18nKey: string; children?: React.ReactNode }) => <span>{i18nKey || children}</span>,
}))

vi.mock('@/context/JamDisplayContext', () => ({
  useJamDisplayContext: () => ({ addressChunkingEnabled: false }),
}))

const sampleJars: Jar[] = [
  {
    balanceSummary: {
      calculatedAvailableBalanceInSats: 100_000,
      calculatedConfirmedAvailableBalanceInSats: 100_000,
      calculatedAvailableFrozenBalanceInSats: 0,
      calculatedFrozenOrLockedBalanceInSats: 0,
      calculatedTotalBalanceInSats: 100_000,
    },
    color: '#e2b86a',
    jarIndex: 0,
    name: 'Jar Zero',
    utxos: [],
  },
  {
    balanceSummary: {
      calculatedAvailableBalanceInSats: 50_000,
      calculatedConfirmedAvailableBalanceInSats: 50_000,
      calculatedAvailableFrozenBalanceInSats: 0,
      calculatedFrozenOrLockedBalanceInSats: 0,
      calculatedTotalBalanceInSats: 50_000,
    },
    color: '#3b5ba9',
    jarIndex: 1,
    name: 'Jar One',
    utxos: [],
  },
]

const sampleAttempt: PaymentAttempt = {
  createdAt: 1_000,
  utxosHashHex: bytesToHex(sha256(hexToBytes('00'))),
  walletFileName: 'test.jmdat',
  data: {
    amount: { amount: 21_000, isSweep: false as const, sweepAmount: undefined, sweepUtxos: undefined },
    destination: { address: 'bcrt1qdestinationaddress123456789', fromJar: undefined },
    isCoinJoin: true,
    numCollaborators: 5,
    source: { fromJar: 0 as const },
    txFee: { txFeeInBlocks: 3, txFeeInSatsPerVbyte: undefined, txFeeUnit: TX_FEE_UNITS.BLOCKS },
  },
}

const sampleTakerInfo: TakerInfo = {
  currentPaymentAttempt: sampleAttempt,
  running: true,
  status: toTakerStatusInfo({ running: true, status: 'idle' }),
  scheduler: {
    running: false,
  },
}

const endedTakerInfo = (raw?: TakerStatusResponse): TakerInfo => ({
  ...sampleTakerInfo,
  running: false,
  status: toTakerStatusInfo(raw),
  __raw: raw,
})

describe('TakerStatusCard', () => {
  it('renders title and details for active collaborative send to external address', () => {
    render(<TakerStatusCard takerInfo={sampleTakerInfo} jars={sampleJars} isAborting={false} onAbort={vi.fn()} />)

    expect(screen.getByText('send.taker_status.title')).toBeInTheDocument()
    expect(screen.getByText('Jar Zero')).toBeInTheDocument()
    expect(screen.getByText('#0')).toBeInTheDocument()
    expect(screen.getByText(/bcrt1qdestinationaddress123456789/u)).toBeInTheDocument()
    expect(screen.getAllByText('5').length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'global.abort' })).toBeInTheDocument()
  })

  it('renders destination jar badge when destination jar is present', () => {
    const internalTakerInfo = {
      ...sampleTakerInfo,
      currentPaymentAttempt: {
        ...sampleAttempt,
        data: {
          ...sampleAttempt.data,
          destination: { address: 'bc1qinternal', fromJar: 1 as const },
        },
      },
    }

    render(<TakerStatusCard takerInfo={internalTakerInfo} jars={sampleJars} isAborting={false} onAbort={vi.fn()} />)

    expect(screen.getByText('Jar One')).toBeInTheDocument()
    expect(screen.getByText('#1')).toBeInTheDocument()
  })

  it('calls onAbort when abort button is clicked', async () => {
    const user = userEvent.setup()
    const onAbort = vi.fn()

    render(<TakerStatusCard takerInfo={sampleTakerInfo} jars={sampleJars} isAborting={false} onAbort={onAbort} />)

    await user.click(screen.getByRole('button', { name: 'global.abort' }))
    expect(onAbort).toHaveBeenCalledTimes(1)
  })

  it('disables abort button when stopping coinjoin', () => {
    render(<TakerStatusCard takerInfo={sampleTakerInfo} jars={sampleJars} isAborting={true} onAbort={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'global.abort' })).toBeDisabled()
  })

  describe('status', () => {
    it('renders the current phase of a running taker', () => {
      const takerInfo = {
        ...sampleTakerInfo,
        status: toTakerStatusInfo({ running: true, status: 'collecting_signatures' }),
      }
      render(<TakerStatusCard takerInfo={takerInfo} jars={sampleJars} isAborting={false} onAbort={vi.fn()} />)

      expect(screen.getByText('send.taker_status.status_collecting_signatures')).toBeInTheDocument()
    })

    it('renders a waiting state instead of an empty value while running without status', () => {
      const takerInfo = { ...sampleTakerInfo, status: toTakerStatusInfo(undefined) }
      render(<TakerStatusCard takerInfo={takerInfo} jars={sampleJars} isAborting={false} onAbort={vi.fn()} />)

      expect(screen.getByText('send.taker_status.status_idle')).toBeInTheDocument()
      expect(screen.queryByText(/undefined|null/u)).not.toBeInTheDocument()
    })

    it('renders unknown status values verbatim', () => {
      const takerInfo = { ...sampleTakerInfo, status: toTakerStatusInfo({ running: true, status: 'brand_new_phase' }) }
      render(<TakerStatusCard takerInfo={takerInfo} jars={sampleJars} isAborting={false} onAbort={vi.fn()} />)

      expect(screen.getByText('send.taker_status.status_unmapped:{"value":"brand_new_phase"}')).toBeInTheDocument()
    })

    it('does not offer to abort once the run has an outcome but the taker is still shutting down', () => {
      const takerInfo = {
        ...sampleTakerInfo,
        running: true,
        status: toTakerStatusInfo({ running: true, status: 'complete', txid: 'ab'.repeat(32) }),
      }
      render(<TakerStatusCard takerInfo={takerInfo} jars={sampleJars} isAborting={false} onAbort={vi.fn()} />)

      expect(screen.getByText('send.taker_status.status_complete')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'global.abort' })).not.toBeInTheDocument()
    })

    it('renders txid and done button when completed', async () => {
      const user = userEvent.setup()
      const onDone = vi.fn()
      const txid = 'ab'.repeat(32)
      render(
        <TakerStatusCard
          takerInfo={endedTakerInfo({ running: false, status: 'complete', txid, broadcast_method: 'self' })}
          jars={sampleJars}
          isAborting={false}
          onDone={onDone}
        />,
      )

      expect(screen.getByText('send.taker_status.status_complete')).toBeInTheDocument()
      expect(screen.getByText(txid)).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'global.abort' })).not.toBeInTheDocument()

      await user.click(screen.getByRole('button', { name: 'global.done' }))
      expect(onDone).toHaveBeenCalledTimes(1)
    })

    it('marks a completion delivered by makers as unverified', () => {
      render(
        <TakerStatusCard
          takerInfo={endedTakerInfo({
            running: false,
            status: 'complete',
            txid: 'ab'.repeat(32),
            broadcast_method: 'makers-unverified:random-peer',
          })}
          jars={sampleJars}
          isAborting={false}
        />,
      )

      expect(screen.getByText('send.taker_status.status_complete_unverified')).toBeInTheDocument()
      expect(screen.getByText('send.taker_status.text_complete_unverified')).toBeInTheDocument()
    })

    it('renders the error when failed', () => {
      render(
        <TakerStatusCard
          takerInfo={endedTakerInfo({ running: false, status: 'failed', txid: null, error: 'not enough makers' })}
          jars={sampleJars}
          isAborting={false}
        />,
      )

      expect(screen.getByText('send.taker_status.status_failed')).toBeInTheDocument()
      expect(screen.getByText('not enough makers')).toBeInTheDocument()
      expect(screen.queryByText('scheduler.label_transaction_id')).not.toBeInTheDocument()
    })

    it('points to the transaction history when ended without a reported outcome', () => {
      render(<TakerStatusCard takerInfo={endedTakerInfo(undefined)} jars={sampleJars} isAborting={false} />)

      expect(screen.getByText('send.taker_status.status_unknown')).toBeInTheDocument()
      expect(screen.getByText('send.alert_collaborative_stopped_description')).toBeInTheDocument()
    })
  })
})
