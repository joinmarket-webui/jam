import type { ReactNode } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { Bip21ParseResult } from '@/lib/bip21'
import QrScannerDialog from './QrScannerDialog'

const h = vi.hoisted(() => ({
  toastError: vi.fn<(message: string) => void>(),
  parseResult: undefined as Bip21ParseResult | null | undefined,
  startImpl: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
  scanFileImpl: vi.fn<() => Promise<string>>().mockResolvedValue('decoded-text'),
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
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: class {
    isScanning = false
    start(_config: unknown, _scanConfig: unknown, onDecode: (text: string) => void) {
      h.decodeCallbacks.push(onDecode)
      this.isScanning = true
      return h.startImpl()
    }
    stop() {
      this.isScanning = false
      return Promise.resolve()
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

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: { children?: ReactNode; onClick?: () => void }) => (
    <button onClick={onClick}>{children}</button>
  ),
}))

const bip21: Bip21ParseResult = { address: 'bc1qscan' } as Bip21ParseResult

const renderDialog = (overrides?: { onScan?: (r: Bip21ParseResult) => void; onOpenChange?: (o: boolean) => void }) =>
  render(
    <QrScannerDialog open onOpenChange={overrides?.onOpenChange ?? vi.fn()} onScan={overrides?.onScan ?? vi.fn()} />,
  )

describe('QrScannerDialog', () => {
  beforeEach(() => {
    h.toastError = vi.fn<(message: string) => void>()
    h.parseResult = bip21
    h.startImpl = vi.fn<() => Promise<void>>().mockResolvedValue(undefined)
    h.scanFileImpl = vi.fn<() => Promise<string>>().mockResolvedValue('decoded-text')
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
})
