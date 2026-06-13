import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LogsContent } from './LogsContent'

const mocks = vi.hoisted(() => ({
  logState: {
    alert: undefined as { variant: 'destructive' | 'warning'; message: string } | undefined,
    fileName: 'jmwalletd_stdout.log',
    isInitialized: true,
    logFileContent: 'log body',
    refresh: vi.fn(),
  },
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/logging/useJmwalletdStdoutLog', () => ({
  useJmwalletdStdoutLog: vi.fn(() => mocks.logState),
}))

vi.mock('@/components/logging/LogViewer', () => ({
  LogViewer: ({ fileName, value }: { fileName: string; value: string }) => (
    <div>
      viewer:{fileName}:{value}
    </div>
  ),
}))

describe('LogsContent', () => {
  beforeEach(() => {
    mocks.logState.alert = undefined
    mocks.logState.fileName = 'jmwalletd_stdout.log'
    mocks.logState.isInitialized = true
    mocks.logState.logFileContent = 'log body'
    mocks.logState.refresh.mockReset()
  })

  it('shows a loading state before logs initialize', () => {
    mocks.logState.isInitialized = false

    render(<LogsContent enabled={true} />)

    expect(screen.getByText('global.loading')).toBeInTheDocument()
  })

  it('renders alerts and log content after initialization', () => {
    mocks.logState.alert = {
      variant: 'warning',
      message: 'log loading failed',
    }

    render(<LogsContent enabled={true} />)

    expect(screen.getByText('log loading failed')).toBeInTheDocument()
    expect(screen.getByText('viewer:jmwalletd_stdout.log:log body')).toBeInTheDocument()
  })

  it('does not render the viewer without content', () => {
    mocks.logState.logFileContent = undefined

    render(<LogsContent enabled={true} />)

    expect(screen.queryByText(/viewer:/u)).not.toBeInTheDocument()
  })
})
