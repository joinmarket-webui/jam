import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EarnReportEntry } from '@/components/earn/report/hooks/useQueryYieldgenReport'
import { JamDisplayContextProvider } from '@/context/JamDisplayContextProvider'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { EarnReportChart } from './EarnReportChart'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

const renderChart = () => {
  const entries = [{ earnedAmount: 123_456, timestamp: new Date() }] as unknown as EarnReportEntry[]

  return render(
    <JamDisplayContextProvider>
      <EarnReportChart entries={entries} days={1} />
    </JamDisplayContextProvider>,
  )
}

afterEach(() => {
  jamSettingsStore.getState().clear()
})

describe('EarnReportChart in private mode', () => {
  it('hides the earned amount in the tooltip when private mode is enabled', () => {
    jamSettingsStore.getState().update({ privateMode: true })

    renderChart()

    expect(screen.getByText('*****')).toBeInTheDocument()
    expect(document.querySelector('[data-raw-value]')).not.toBeInTheDocument()
  })

  it('does not allow revealing the earned amount from the tooltip', () => {
    jamSettingsStore.getState().update({ privateMode: true })

    renderChart()

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('shows the earned amount in the tooltip when private mode is disabled', () => {
    jamSettingsStore.getState().update({ privateMode: false })

    renderChart()

    expect(document.querySelector('[data-raw-value="123456"]')).toBeInTheDocument()
  })
})
