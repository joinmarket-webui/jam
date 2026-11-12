import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LogViewer } from './LogViewer'

const translations = vi.hoisted(() => ({ t: vi.fn((key: string) => key) }))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: translations.t,
  }),
}))

vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  delayedPromise: vi.fn(() => Promise.resolve()),
}))

const createObjectURLMock = vi.fn<(blob: Blob | MediaSource) => string>(() => 'blob:log')

describe('LogViewer', () => {
  beforeEach(() => {
    translations.t.mockClear()
    createObjectURLMock.mockClear()
    URL.createObjectURL = createObjectURLMock
    URL.revokeObjectURL = vi.fn()
    HTMLElement.prototype.scrollTo = vi.fn()
  })

  it('filters and clears matching log lines', async () => {
    const user = userEvent.setup()

    render(<LogViewer fileName="jmwalletd.log" value={'first line\nneedle found\nlast line'} refresh={vi.fn()} />)

    await user.type(screen.getByLabelText('logs.label_search'), 'needle')

    expect(screen.getByText('logs.text_search_matches')).toBeInTheDocument()
    expect(screen.getByText('needle')).toBeInTheDocument()
    expect(screen.queryByText('first line')).not.toBeInTheDocument()

    await user.click(screen.getByTitle('global.clear'))

    expect(screen.queryByText('logs.text_search_matches')).not.toBeInTheDocument()
    expect(screen.getByText('first line')).toBeInTheDocument()
  })

  it('shows the empty search state', async () => {
    const user = userEvent.setup()

    render(<LogViewer fileName="jmwalletd.log" value={'alpha\nbeta'} refresh={vi.fn()} />)

    await user.type(screen.getByLabelText('logs.label_search'), 'missing')

    expect(screen.getByText('logs.text_search_matches')).toBeInTheDocument()
  })

  it('refreshes without allowing duplicate in-flight refreshes', async () => {
    const user = userEvent.setup()
    const refresh = vi.fn(() => Promise.resolve())

    render(<LogViewer fileName="jmwalletd.log" value="line" refresh={refresh} />)

    await user.click(screen.getByRole('button', { name: 'global.refresh' }))

    await waitFor(() => expect(refresh).toHaveBeenCalledTimes(1))
  })

  it('downloads the visible log content', async () => {
    const user = userEvent.setup()
    const appendSpy = vi.spyOn(document.body, 'append')
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    const removeSpy = vi.spyOn(HTMLAnchorElement.prototype, 'remove').mockImplementation(() => undefined)

    render(<LogViewer fileName="jmwalletd.log" value="log body" refresh={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'global.download' }))

    expect(createObjectURLMock).toHaveBeenCalled()
    expect(appendSpy).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(removeSpy).toHaveBeenCalled()

    appendSpy.mockRestore()
    clickSpy.mockRestore()
    removeSpy.mockRestore()
  })

  it('tracks scroll progress and can jump back to the bottom', async () => {
    const user = userEvent.setup()

    render(<LogViewer fileName="jmwalletd.log" value={'a\nb\nc'} refresh={vi.fn()} />)

    const log = screen.getByText('a').closest('pre')
    expect(log).toBeInTheDocument()

    Object.defineProperties(log!, {
      clientHeight: { configurable: true, value: 10 },
      scrollHeight: { configurable: true, value: 100 },
      scrollTop: { configurable: true, value: 0 },
    })
    const scrollTo = vi.fn()
    log!.scrollTo = scrollTo

    act(() => {
      log!.dispatchEvent(new Event('scroll', { bubbles: true }))
    })

    const card = screen.getByText('jmwalletd.log').closest<HTMLElement>('[data-slot="card"]')!
    await user.click(within(card).getByTitle('logs.button_scroll_to_bottom'))

    expect(scrollTo).toHaveBeenCalledWith({
      top: 100,
      behavior: 'smooth',
    })
  })

  it('toggles auto-follow switch when clicked', async () => {
    const user = userEvent.setup()
    const onToggleAutoFollow = vi.fn()

    const { rerender } = render(
      <LogViewer
        fileName="jmwalletd.log"
        value="log content"
        refresh={vi.fn()}
        enableAutoFollow={false}
        onToggleAutoFollow={onToggleAutoFollow}
      />,
    )

    const switchElement = screen.getByRole('switch', { name: 'logs.label_auto_follow' })
    expect(switchElement).toBeInTheDocument()
    expect(switchElement).not.toBeChecked()

    await user.click(switchElement)
    expect(onToggleAutoFollow).toHaveBeenCalledWith(true)

    rerender(
      <LogViewer
        fileName="jmwalletd.log"
        value="log content"
        refresh={vi.fn()}
        enableAutoFollow={true}
        onToggleAutoFollow={onToggleAutoFollow}
      />,
    )

    expect(switchElement).toBeChecked()
  })

  it('bounds a growing log to the latest 1000 lines and explains the omitted lines', () => {
    const value = Array.from({ length: 10000 }, (_, index) => `line-${index}`).join('\n')
    const { container, rerender } = render(<LogViewer fileName="large.log" value={value} refresh={vi.fn()} />)
    expect(container.querySelectorAll('pre > span')).toHaveLength(1000)
    expect(screen.queryByText('line-0')).not.toBeInTheDocument()
    expect(screen.getByText('line-9999')).toBeInTheDocument()
    expect(screen.getByText('logs.text_display_limit')).toBeInTheDocument()
    expect(translations.t).toHaveBeenCalledWith('logs.text_display_limit', { shown: 1000, count: 10000 })

    rerender(<LogViewer fileName="large.log" value={`${value}\nlatest-entry`} refresh={vi.fn()} />)
    expect(container.querySelectorAll('pre > span')).toHaveLength(1000)
    expect(screen.queryByText('line-9000')).not.toBeInTheDocument()
    expect(screen.getByText('latest-entry')).toBeInTheDocument()
  })

  it('searches older omitted lines and bounds large sets of matches', async () => {
    const user = userEvent.setup()
    const value = 'old-needle\n' + Array.from({ length: 10000 }, (_, index) => `line-${index}`).join('\n')
    const { container } = render(<LogViewer fileName="large.log" value={value} refresh={vi.fn()} />)
    await user.type(screen.getByLabelText('logs.label_search'), 'old-needle')
    expect(container.querySelectorAll('pre > span')).toHaveLength(1)
    expect(screen.getByText('old-needle')).toBeInTheDocument()
    expect(screen.queryByText('logs.text_display_limit')).not.toBeInTheDocument()

    await user.click(screen.getByTitle('global.clear'))
    await user.type(screen.getByLabelText('logs.label_search'), 'line-')
    expect(container.querySelectorAll('pre > span')).toHaveLength(1000)
    expect(translations.t).toHaveBeenCalledWith('logs.text_search_matches', { count: 10000, searchValue: 'line-' })
    expect(translations.t).toHaveBeenCalledWith('logs.text_display_limit', { shown: 1000, count: 10000 })
    expect(container.querySelector('mark')).toHaveTextContent('line-')
    await user.click(screen.getByTitle('global.clear'))
    expect(container.querySelectorAll('pre > span')).toHaveLength(1000)
    expect(screen.getByText('line-9999')).toBeInTheDocument()
  })

  it('downloads the complete original input while the displayed matches are limited', async () => {
    const user = userEvent.setup()
    const value = 'older entry\n' + Array.from({ length: 2000 }, (_, index) => `line-${index}`).join('\n')
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    try {
      const { container } = render(<LogViewer fileName="large.log" value={value} refresh={vi.fn()} />)
      await user.type(screen.getByLabelText('logs.label_search'), 'line-')
      expect(container.querySelectorAll('pre > span')).toHaveLength(1000)
      await user.click(screen.getByRole('button', { name: 'global.download' }))
      const blob = createObjectURLMock.mock.calls[0][0] as Blob
      const text = await blob.text()
      expect(text).toBe(value)
    } finally {
      clickSpy.mockRestore()
    }
  })

  it('does not show a limit notice at the boundary and removes it after log rotation', () => {
    const value = Array.from({ length: 1000 }, (_, index) => `line-${index}`).join('\n')
    const { container, rerender } = render(<LogViewer fileName="large.log" value={value} refresh={vi.fn()} />)
    expect(container.querySelectorAll('pre > span')).toHaveLength(1000)
    expect(screen.queryByText('logs.text_display_limit')).not.toBeInTheDocument()
    rerender(<LogViewer fileName="large.log" value={`${value}\nextra`} refresh={vi.fn()} />)
    expect(screen.getByText('logs.text_display_limit')).toBeInTheDocument()
    rerender(<LogViewer fileName="large.log" value="rotated" refresh={vi.fn()} />)
    expect(container.querySelectorAll('pre > span')).toHaveLength(1)
    expect(screen.getByText('rotated')).toBeInTheDocument()
    expect(screen.queryByText('logs.text_display_limit')).not.toBeInTheDocument()
  })

  it('continues auto-following appended lines after the display limit is reached', async () => {
    const value = Array.from({ length: 10000 }, (_, index) => `line-${index}`).join('\n')
    const scrollTo = vi.spyOn(HTMLElement.prototype, 'scrollTo')
    try {
      const { container, rerender } = render(
        <LogViewer fileName="large.log" value={value} refresh={vi.fn()} enableAutoFollow={true} />,
      )
      await waitFor(() => expect(scrollTo).toHaveBeenCalled())
      scrollTo.mockClear()
      rerender(
        <LogViewer fileName="large.log" value={`${value}\nlatest-entry`} refresh={vi.fn()} enableAutoFollow={true} />,
      )
      await waitFor(() => expect(scrollTo).toHaveBeenCalled())
      expect(container.querySelectorAll('pre > span')).toHaveLength(1000)
      expect(screen.getByText('latest-entry')).toBeInTheDocument()
    } finally {
      scrollTo.mockRestore()
    }
  })
})
