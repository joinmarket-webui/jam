import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react'
import { Html5Qrcode, Html5QrcodeScannerState, type Html5QrcodeCameraScanConfig } from 'html5-qrcode'
import { ClipboardPasteIcon, ImageUpIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { parseBip21Uri, type Bip21ParseResult } from '@/lib/bip21'
import type { WithRequiredProperty } from '@/types/global'

const QR_READER_ELEMENT_ID = 'qr-scanner-reader'
const SCAN_CONFIG = {
  fps: 10,
  qrbox: (viewfinderWidth, viewfinderHeight) => {
    const edgeLength = Math.max(1, Math.floor(Math.min(250, viewfinderWidth * 0.8, viewfinderHeight * 0.8)))
    return { width: edgeLength, height: edgeLength }
  },
} satisfies Html5QrcodeCameraScanConfig

type QrScannerDialogProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> & {
  onScan: (result: Bip21ParseResult) => void
}

type ScannerSession = {
  scanner: Html5Qrcode | null
  cancelled: boolean
  reader?: HTMLElement
  readerWidth?: number
  starting?: boolean
  start?: Promise<void>
  stop?: Promise<void>
  timeout?: ReturnType<typeof setTimeout>
}

const stopSession = (session: ScannerSession): Promise<void> => {
  if (!session.scanner) return Promise.resolve()
  session.stop ??= (async () => {
    await session.start
    try {
      const scanner = session.scanner
      if (!scanner) return
      // start() can resolve before the video emits playing and sets isScanning.
      const video = session.reader?.querySelector('video')
      if (!scanner.isScanning && scanner.getState() === Html5QrcodeScannerState.SCANNING && video) {
        await new Promise<void>((resolve) => {
          const finish = () => {
            clearTimeout(timeout)
            video.removeEventListener('playing', finish)
            video.removeEventListener('error', finish)
            resolve()
          }
          const timeout = setTimeout(finish, 1000)
          video.addEventListener('playing', finish, { once: true })
          video.addEventListener('error', finish, { once: true })
        })
      }
      if (scanner.getState() !== Html5QrcodeScannerState.NOT_STARTED) await scanner.stop()
    } catch {
      // Cleanup must also be safe when the scanner has already stopped.
    }
  })()
  return session.stop
}

export default function QrScannerDialog({ open, onOpenChange, onScan, ...dialogProps }: QrScannerDialogProps) {
  const { t } = useTranslation()
  const sessionRef = useRef<ScannerSession | null>(null)
  const translationRef = useRef(t)
  const onScanRef = useRef(onScan)
  const onOpenChangeRef = useRef(onOpenChange)
  const lastDecodedRef = useRef<string | null>(null)
  const [error, setError] = useState<string>()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const readerContainerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    translationRef.current = t
    onScanRef.current = onScan
    onOpenChangeRef.current = onOpenChange
  })

  const createScanner = useCallback((session: ScannerSession) => {
    const container = readerContainerRef.current
    if (!container) return null
    // The scanner owns this node, so pending startup can outlive the dialog DOM.
    const reader = document.createElement('div')
    reader.id = QR_READER_ELEMENT_ID
    container.append(reader)
    session.reader = reader
    session.readerWidth = reader.clientWidth || 300
    session.scanner = new Html5Qrcode(QR_READER_ELEMENT_ID)
    return session.scanner
  }, [])

  const isCurrentSession = useCallback(
    (session: ScannerSession) => !session.cancelled && sessionRef.current === session,
    [],
  )

  const handleResult = useCallback((parsed: Bip21ParseResult, session: ScannerSession) => {
    if (session.cancelled || sessionRef.current !== session) return
    if ('vibrate' in navigator) navigator.vibrate(100)
    onScanRef.current(parsed)
    onOpenChangeRef.current(false)
  }, [])

  useEffect(() => {
    if (!open) return
    const session: ScannerSession = { scanner: null, cancelled: false }
    sessionRef.current = session
    lastDecodedRef.current = null

    const onDecodeSuccess = (decodedText: string) => {
      if (!isCurrentSession(session) || decodedText === lastDecodedRef.current) return
      lastDecodedRef.current = decodedText
      const parsed = parseBip21Uri(decodedText)
      if (parsed) {
        void stopSession(session).then(() => handleResult(parsed, session))
      } else {
        toast.error(translationRef.current('send.qr_scan_invalid_address'))
      }
    }

    // small delay to let the dialog DOM render
    session.timeout = setTimeout(() => {
      if (!isCurrentSession(session)) return
      setError(undefined)
      const scanner = createScanner(session)
      if (!scanner) return
      session.starting = true
      session.start = (async () => {
        try {
          await scanner.start({ facingMode: 'environment' }, SCAN_CONFIG, onDecodeSuccess, () => {})
        } catch {
          if (!isCurrentSession(session)) return
          try {
            await scanner.start({ facingMode: 'user' }, SCAN_CONFIG, onDecodeSuccess, () => {})
          } catch {
            if (isCurrentSession(session)) setError(translationRef.current('send.qr_scan_camera_error'))
          }
        }
      })()
      void session.start.then(() => {
        session.starting = false
        if (session.cancelled) void stopSession(session)
      })
    }, 300)

    return () => {
      session.cancelled = true
      clearTimeout(session.timeout)
      // html5-qrcode needs a laid-out reader to finish rendering after getUserMedia.
      // Retain the owned reader off-screen until startup and stop complete.
      let retainedReader: HTMLDivElement | undefined
      if (
        session.reader &&
        (session.starting ||
          (session.scanner?.getState() === Html5QrcodeScannerState.SCANNING && !session.scanner.isScanning))
      ) {
        retainedReader = document.createElement('div')
        retainedReader.setAttribute('aria-hidden', 'true')
        Object.assign(retainedReader.style, {
          position: 'fixed',
          left: '-10000px',
          width: `${session.readerWidth}px`,
          pointerEvents: 'none',
        })
        // A reopened dialog must own the public reader ID.
        session.reader.removeAttribute('id')
        retainedReader.append(session.reader)
        document.body.append(retainedReader)
      }
      void stopSession(session).then(() => retainedReader?.remove())
      if (sessionRef.current === session) sessionRef.current = null
    }
  }, [open, createScanner, handleResult, isCurrentSession])

  const handlePaste = useCallback(async () => {
    const session = sessionRef.current
    if (!session) return
    try {
      const text = await navigator.clipboard.readText()
      if (!isCurrentSession(session)) return
      const parsed = parseBip21Uri(text)
      if (parsed) {
        // A pending permission request must not block using the clipboard.
        if (session.scanner?.isScanning) await stopSession(session)
        handleResult(parsed, session)
      } else {
        toast.error(translationRef.current('send.qr_scan_invalid_address'))
      }
    } catch {
      if (isCurrentSession(session)) toast.error(t('send.qr_paste_failed'))
    }
  }, [handleResult, isCurrentSession, t])

  const handleFileUpload = useCallback(
    async (file: File) => {
      const session = sessionRef.current
      if (!session) return
      clearTimeout(session.timeout)
      try {
        await stopSession(session)
        if (!isCurrentSession(session)) return
        const scanner = session.scanner ?? createScanner(session)
        if (!scanner) return
        const decodedText = await scanner.scanFile(file, false)
        if (!isCurrentSession(session)) return
        const parsed = parseBip21Uri(decodedText)
        if (parsed) {
          handleResult(parsed, session)
        } else {
          toast.error(t('send.qr_scan_invalid_address'))
        }
      } catch {
        if (isCurrentSession(session)) toast.error(t('send.qr_scan_file_no_qr'))
      }
    },
    [createScanner, handleResult, isCurrentSession, t],
  )

  const handleClose = () => {
    if (sessionRef.current) sessionRef.current.cancelled = true
    setError(undefined)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose} {...dialogProps}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('send.qr_scan_title')}</DialogTitle>
          <DialogDescription>{t('send.qr_scan_description')}</DialogDescription>
        </DialogHeader>

        <div className="py-4" aria-live="polite">
          <p className="sr-only">{t('send.qr_scan_description')}</p>
          <div ref={readerContainerRef} className="w-full overflow-hidden rounded-md" />
          {error && (
            <div className="text-destructive mt-2 text-sm" role="status" aria-live="assertive">
              {error}
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) void handleFileUpload(file)
            event.target.value = ''
          }}
        />

        <DialogFooter className="sm:justify-center [&>[data-slot=button]]:min-h-10">
          <Button className="flex-1" variant="outline" onClick={() => void handlePaste()}>
            <ClipboardPasteIcon />
            {t('send.qr_paste_button')}
          </Button>
          <Button className="flex-1" variant="outline" onClick={() => fileInputRef.current?.click()}>
            <ImageUpIcon />
            {t('send.qr_scan_file_button')}
          </Button>
          <Button className="flex-1" variant="outline" onClick={handleClose}>
            {t('modal.confirm_button_reject')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
