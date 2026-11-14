import type { ReactNode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import type { Bip21ParseResult } from '@/lib/bip21'
import QrScannerDialog from './QrScannerDialog'

const h = vi.hoisted(() => ({
  toastError: vi.fn<(message: string) => void>(),
  parseResult: undefined as Bip21ParseResult | null | undefined,
  startImpl: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  stopImpl: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  scanFileImpl: vi.fn<() => Promise<string>>().mockResolvedValue('decoded-text'),
  t: (key: string) => key,
  deferRender: false,
  instances: [] as Array<{ isScanning: boolean }>,
  stopped: [] as Array<{ isScanning: boolean }>,
  decodeCallbacks: [] as Array<(text: string) => void>,
}))

vi.mock('sonner', () => ({
  toast: {
    error: (message: string) => {
      h.toastError(message)
    },
  },
}))

vi.mock('@/lib/bip21', () => ({
  parseBip21Uri: () => h.parseResult,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: h.t }),
}))

vi.mock('html5-qrcode', () => ({
  Html5QrcodeScannerState: { NOT_STARTED: 1, SCANNING: 2, PAUSED: 3 },
  Html5Qrcode: class {
    isScanning = false
    started = false
    reader = document.getElementById('qr-scanner-reader')
    getState() {
      return this.started ? 2 : 1
    }
    constructor() {
      h.instances.push(this)
    }
    start(_config: unknown, _scanConfig: unknown, onDecode: (text: string) => void) {
      h.decodeCallbacks.push(onDecode)
      return h.startImpl().then(() => {
        this.started = true
        if (h.deferRender) {
          const video = document.createElement('video')
          video.addEventListener(
            'playing',
            () => {
              this.isScanning = true
            },
            { once: true },
          )
          this.reader?.append(video)
        } else this.isScanning = true
      })
    }
    stop() {
      h.stopped.push(this)
      return h.stopImpl().then(() => {
        this.isScanning = false
        this.started = false
      })
    }
    scanFile() {
      return h.scanFileImpl()
    }
  },
}))

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: { children?: ReactNode; open?: boolean }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}))

const bip21: Bip21ParseResult = { address: 'bc1qscan' } as Bip21ParseResult

const renderDialog = (overrides?: { onScan?: (r: Bip21ParseResult) => void; onOpenChange?: (o: boolean) => void }) =>
  render(
    <QrScannerDialog open onOpenChange={overrides?.onOpenChange ?? vi.fn()} onScan={overrides?.onScan ?? vi.fn()} />,
  )

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

describe('QrScannerDialog', () => {
  afterEach(() => vi.useRealTimers())
  beforeEach(() => {
    h.toastError = vi.fn<(message: string) => void>()
    h.parseResult = bip21
    h.startImpl = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    h.scanFileImpl = vi.fn<() => Promise<string>>().mockResolvedValue('decoded-text')
    h.stopImpl.mockReset().mockResolvedValue(undefined)
    h.deferRender = false
    h.instances = []
    h.stopped = []
    h.decodeCallbacks = []
    Object.assign(navigator, {
      clipboard: { readText: vi.fn<() => Promise<string>>().mockResolvedValue('bitcoin:bc1qscan') },
    })
  })

  it('renders the scanner UI when open', () => {
    renderDialog()
    expect(screen.getByText('send.qr_scan_title')).toBeInTheDocument()
    expect(screen.getByText('send.qr_paste_button')).toBeInTheDocument()
  })

  it('starts the camera scanner after the render delay', async () => {
    renderDialog()
    await waitFor(() => expect(h.startImpl).toHaveBeenCalled())
  })

  it('invokes onScan and closes when a valid code is decoded', async () => {
    const onScan = vi.fn()
    const onOpenChange = vi.fn()
    renderDialog({ onScan, onOpenChange })
    await waitFor(() => expect(h.decodeCallbacks.length).toBeGreaterThan(0))
    await act(async () => {
      h.decodeCallbacks.at(-1)?.('bitcoin:bc1qscan')
      await Promise.resolve()
    })
    await waitFor(() => expect(onScan).toHaveBeenCalledWith(bip21))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows an error toast when a decoded code is not a valid bip21 uri', async () => {
    h.parseResult = null
    renderDialog()
    await waitFor(() => expect(h.decodeCallbacks.length).toBeGreaterThan(0))
    act(() => {
      h.decodeCallbacks.at(-1)?.('not-a-uri')
    })
    expect(h.toastError).toHaveBeenCalledWith('send.qr_scan_invalid_address')
  })

  it('shows a camera error when both camera facings fail', async () => {
    h.startImpl = vi.fn<() => Promise<void>>().mockRejectedValue(new Error('no camera'))
    renderDialog()
    await waitFor(() => expect(screen.getByText('send.qr_scan_camera_error')).toBeInTheDocument())
  })

  it('applies a pasted bip21 uri from the clipboard', async () => {
    const onScan = vi.fn()
    renderDialog({ onScan })
    fireEvent.click(screen.getByText('send.qr_paste_button'))
    await waitFor(() => expect(onScan).toHaveBeenCalledWith(bip21))
  })

  it('shows an error when the clipboard contains an invalid address', async () => {
    h.parseResult = null
    renderDialog()
    fireEvent.click(screen.getByText('send.qr_paste_button'))
    await waitFor(() => expect(h.toastError).toHaveBeenCalledWith('send.qr_scan_invalid_address'))
  })

  it('shows an error when reading the clipboard fails', async () => {
    Object.assign(navigator, {
      clipboard: { readText: vi.fn<() => Promise<string>>().mockRejectedValue(new Error('denied')) },
    })
    renderDialog()
    fireEvent.click(screen.getByText('send.qr_paste_button'))
    await waitFor(() => expect(h.toastError).toHaveBeenCalledWith('send.qr_paste_failed'))
  })

  it('decodes an uploaded image file', async () => {
    const onScan = vi.fn()
    renderDialog({ onScan })
    const file = new File(['x'], 'qr.png', { type: 'image/png' })
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } })
    await waitFor(() => expect(onScan).toHaveBeenCalledWith(bip21))
  })

  it('shows an error when the uploaded image has no readable qr code', async () => {
    h.scanFileImpl = vi.fn<() => Promise<string>>().mockRejectedValue(new Error('no qr'))
    renderDialog()
    const file = new File(['x'], 'qr.png', { type: 'image/png' })
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } })
    await waitFor(() => expect(h.toastError).toHaveBeenCalledWith('send.qr_scan_file_no_qr'))
  })

  it('closes via the reject button', () => {
    const onOpenChange = vi.fn()
    renderDialog({ onOpenChange })
    fireEvent.click(screen.getByText('modal.confirm_button_reject'))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('stops a camera that starts after close', async () => {
    vi.useFakeTimers()
    try {
      const pending = deferred<void>()
      h.startImpl.mockReturnValue(pending.promise)
      const callbacks = { onOpenChange: vi.fn(), onScan: vi.fn() }
      const view = render(<QrScannerDialog open {...callbacks} />)
      await act(async () => vi.advanceTimersByTimeAsync(301))
      expect(h.startImpl).toHaveBeenCalledTimes(1)
      view.rerender(<QrScannerDialog open={false} {...callbacks} />)
      expect(document.querySelector('#qr-scanner-reader')).toBeNull()
      await act(async () => pending.resolve())
      expect(h.stopImpl).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not retry the front camera after close', async () => {
    vi.useFakeTimers()
    try {
      const pending = deferred<void>()
      h.startImpl.mockReturnValueOnce(pending.promise).mockReturnValue(new Promise(() => {}))
      const callbacks = { onOpenChange: vi.fn(), onScan: vi.fn() }
      const view = render(<QrScannerDialog open {...callbacks} />)
      await act(async () => vi.advanceTimersByTimeAsync(301))
      view.rerender(<QrScannerDialog open={false} {...callbacks} />)
      await act(async () => pending.reject(new Error('rear camera unavailable')))
      expect(h.startImpl).toHaveBeenCalledTimes(1)
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not start a camera when closed before the initialization delay', async () => {
    vi.useFakeTimers()
    const callbacks = { onOpenChange: vi.fn(), onScan: vi.fn() }
    const view = render(<QrScannerDialog open {...callbacks} />)
    view.rerender(<QrScannerDialog open={false} {...callbacks} />)
    await act(async () => vi.advanceTimersByTimeAsync(301))
    expect(h.startImpl).not.toHaveBeenCalled()
  })

  it('cleans up a pending start after unmount', async () => {
    vi.useFakeTimers()
    const pending = deferred<void>()
    h.startImpl.mockReturnValue(pending.promise)
    const view = renderDialog()
    await act(async () => vi.advanceTimersByTimeAsync(301))
    const reader = document.querySelector('#qr-scanner-reader')!
    view.unmount()
    expect(reader.isConnected).toBe(true)
    await act(async () => pending.resolve())
    expect(h.stopImpl).toHaveBeenCalledTimes(1)
    expect(h.instances[0].isScanning).toBe(false)
    expect(reader.isConnected).toBe(false)
  })

  it('stops a fallback camera that finishes starting after close', async () => {
    vi.useFakeTimers()
    const pending = deferred<void>()
    h.startImpl.mockRejectedValueOnce(new Error('no rear camera')).mockReturnValue(pending.promise)
    const callbacks = { onOpenChange: vi.fn(), onScan: vi.fn() }
    const view = render(<QrScannerDialog open {...callbacks} />)
    await act(async () => vi.advanceTimersByTimeAsync(301))
    expect(h.startImpl).toHaveBeenCalledTimes(2)
    view.rerender(<QrScannerDialog open={false} {...callbacks} />)
    await act(async () => pending.resolve())
    expect(h.stopImpl).toHaveBeenCalledTimes(1)
  })

  it('keeps cleanup for an old session separate from a reopened scanner', async () => {
    vi.useFakeTimers()
    const pending = deferred<void>()
    h.startImpl.mockReturnValueOnce(pending.promise).mockResolvedValue(undefined)
    const callbacks = { onOpenChange: vi.fn(), onScan: vi.fn() }
    const view = render(<QrScannerDialog open {...callbacks} />)
    await act(async () => vi.advanceTimersByTimeAsync(301))
    const oldDecode = h.decodeCallbacks[0]
    view.rerender(<QrScannerDialog open={false} {...callbacks} />)
    view.rerender(<QrScannerDialog open {...callbacks} />)
    await act(async () => vi.advanceTimersByTimeAsync(301))
    await act(async () => pending.resolve())
    expect(h.stopped).toEqual([h.instances[0]])
    expect(h.instances[1].isScanning).toBe(true)
    await act(async () => oldDecode('bitcoin:bc1qscan'))
    expect(callbacks.onScan).not.toHaveBeenCalled()
    expect(callbacks.onOpenChange).not.toHaveBeenCalled()
  })

  it('shares a pending stop between a decode and closing the dialog', async () => {
    vi.useFakeTimers()
    const pendingStop = deferred<void>()
    h.stopImpl.mockReturnValue(pendingStop.promise)
    const callbacks = { onOpenChange: vi.fn(), onScan: vi.fn() }
    const view = render(<QrScannerDialog open {...callbacks} />)
    await act(async () => vi.advanceTimersByTimeAsync(301))
    await act(async () => h.decodeCallbacks[0]('bitcoin:bc1qscan'))
    view.rerender(<QrScannerDialog open={false} {...callbacks} />)
    await act(async () => pendingStop.resolve())
    expect(h.stopImpl).toHaveBeenCalledTimes(1)
    expect(callbacks.onScan).not.toHaveBeenCalled()
  })

  it('handles a synchronous stop error during cleanup', async () => {
    vi.useFakeTimers()
    h.stopImpl.mockImplementation(() => {
      throw new Error('already stopped')
    })
    const view = renderDialog()
    await act(async () => vi.advanceTimersByTimeAsync(301))
    view.unmount()
    await act(async () => Promise.resolve())
    expect(h.stopImpl).toHaveBeenCalledTimes(1)
  })

  it('does not apply a late clipboard result after closing', async () => {
    const pending = deferred<string>()
    Object.assign(navigator, { clipboard: { readText: () => pending.promise } })
    const callbacks = { onOpenChange: vi.fn(), onScan: vi.fn() }
    const view = render(<QrScannerDialog open {...callbacks} />)
    fireEvent.click(screen.getByText('send.qr_paste_button'))
    view.rerender(<QrScannerDialog open={false} {...callbacks} />)
    await act(async () => pending.resolve('bitcoin:bc1qscan'))
    expect(callbacks.onScan).not.toHaveBeenCalled()
  })

  it('waits for the video render after start resolves before stopping', async () => {
    vi.useFakeTimers()
    h.deferRender = true
    const pending = deferred<void>()
    h.startImpl.mockReturnValue(pending.promise)
    const view = renderDialog()
    await act(async () => vi.advanceTimersByTimeAsync(301))
    const reader = document.getElementById('qr-scanner-reader')!
    view.unmount()
    await act(async () => pending.resolve())
    expect(h.stopImpl).not.toHaveBeenCalled()
    fireEvent.playing(reader.querySelector('video')!)
    await act(async () => Promise.resolve())
    expect(h.stopImpl).toHaveBeenCalledTimes(1)
    expect(reader.isConnected).toBe(false)
  })

  it('bounds waiting for a video that never emits playing', async () => {
    vi.useFakeTimers()
    h.deferRender = true
    const view = renderDialog()
    await act(async () => vi.advanceTimersByTimeAsync(301))
    view.unmount()
    await act(async () => vi.advanceTimersByTimeAsync(1000))
    expect(h.stopImpl).toHaveBeenCalledTimes(1)
    expect(document.querySelector('video')).toBeNull()
  })

  it('does not restart a pending camera when the translation function changes', async () => {
    vi.useFakeTimers()
    const pending = deferred<void>()
    h.startImpl.mockReturnValue(pending.promise)
    const callbacks = { onOpenChange: vi.fn(), onScan: vi.fn() }
    const view = render(<QrScannerDialog open {...callbacks} />)
    await act(async () => vi.advanceTimersByTimeAsync(301))
    const previous = h.t
    try {
      h.t = (key) => `translated:${key}`
      view.rerender(<QrScannerDialog open {...callbacks} />)
      await act(async () => vi.advanceTimersByTimeAsync(301))
      expect(h.startImpl).toHaveBeenCalledTimes(1)
      await act(async () => pending.resolve())
    } finally {
      h.t = previous
    }
  })

  it('retains the reader when closing between start resolution and video playing', async () => {
    vi.useFakeTimers()
    h.deferRender = true
    const view = renderDialog()
    await act(async () => vi.advanceTimersByTimeAsync(301))
    const reader = document.getElementById('qr-scanner-reader')!
    view.unmount()
    expect(reader.isConnected).toBe(true)
    fireEvent.playing(reader.querySelector('video')!)
    await act(async () => Promise.resolve())
    expect(h.stopImpl).toHaveBeenCalledTimes(1)
    expect(reader.isConnected).toBe(false)
  })
})
