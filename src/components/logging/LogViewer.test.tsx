import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LogViewer } from './LogViewer'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/lib/utils', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/utils')>()),
  delayedPromise: vi.fn(() => Promise.resolve()),
}))

const createObjectURLMock = vi.fn(() => 'blob:log')

describe('LogViewer', () => {
  beforeEach(() => {
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
})
