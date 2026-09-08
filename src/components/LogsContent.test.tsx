import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LogsContent } from './LogsContent'

const mocks = vi.hoisted(() => ({
  logState: {
    alert: undefined as { variant: 'destructive' | 'warning'; message: string } | undefined,
    fileName: 'jmwalletd_stdout.log',
    isInitialized: true,
    logFileContent: undefined as string | undefined,
    refresh: vi.fn(),
  },
  useJmwalletdStdoutLogMock: vi.fn(),
  lastLogViewerProps: undefined as
    | {
        fileName: string
        value: string
        refresh: () => Promise<void>
        isAutoFollowEnabled?: boolean
        onToggleAutoFollow?: (enabled: boolean) => void
      }
    | undefined,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/components/logging/useJmwalletdStdoutLog', () => ({
  useJmwalletdStdoutLog: (parameters: unknown) => {
    mocks.useJmwalletdStdoutLogMock(parameters)
    return mocks.logState
  },
}))

vi.mock('@/components/logging/LogViewer', () => ({
  LogViewer: (props: {
    fileName: string
    value: string
    refresh: () => Promise<void>
    isAutoFollowEnabled?: boolean
    onToggleAutoFollow?: (enabled: boolean) => void
  }) => {
    mocks.lastLogViewerProps = props
    return (
      <div>
        viewer:{props.fileName}:{props.value}
        <button
          type="button"
          data-testid="toggle-autofollow"
          onClick={() => props.onToggleAutoFollow?.(!props.isAutoFollowEnabled)}
        >
          toggle
        </button>
      </div>
    )
  },
}))

describe('LogsContent', () => {
  beforeEach(() => {
    mocks.logState.alert = undefined
    mocks.logState.fileName = 'jmwalletd_stdout.log'
    mocks.logState.isInitialized = true
    mocks.logState.logFileContent = 'log body'
    mocks.logState.refresh.mockReset()
    mocks.useJmwalletdStdoutLogMock.mockClear()
    mocks.lastLogViewerProps = undefined
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

  it('manages auto-follow toggle state and connects to log hook and viewer', async () => {
    const user = userEvent.setup()

    render(<LogsContent enabled={true} />)

    expect(mocks.useJmwalletdStdoutLogMock).toHaveBeenLastCalledWith({
      enabled: true,
      isAutoFollowEnabled: false,
    })
    expect(mocks.lastLogViewerProps?.isAutoFollowEnabled).toBe(false)

    await user.click(screen.getByTestId('toggle-autofollow'))

    expect(mocks.useJmwalletdStdoutLogMock).toHaveBeenLastCalledWith({
      enabled: true,
      isAutoFollowEnabled: true,
    })
    expect(mocks.lastLogViewerProps?.isAutoFollowEnabled).toBe(true)
  })
})
