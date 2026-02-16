import { useCallback, useEffect, useRef, useState, type ComponentProps } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
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
const SCAN_CONFIG = { fps: 10, qrbox: { width: 250, height: 250 } }

type QrScannerDialogProps = WithRequiredProperty<
  Omit<ComponentProps<typeof Dialog>, 'children'>,
  'open' | 'onOpenChange'
> & {
  onScan: (result: Bip21ParseResult) => void
}

export default function QrScannerDialog({ open, onOpenChange, onScan }: QrScannerDialogProps) {
  const { t } = useTranslation()
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const onScanRef = useRef(onScan)
  const onOpenChangeRef = useRef(onOpenChange)
  const lastDecodedRef = useRef<string | null>(null)
  const [error, setError] = useState<string>()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    onScanRef.current = onScan
    onOpenChangeRef.current = onOpenChange
  })

  const handleResult = useCallback((parsed: Bip21ParseResult) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(100)
    }
    onScanRef.current(parsed)
    onOpenChangeRef.current(false)
  }, [])

  const stopScanner = useCallback(async () => {
    const scanner = scannerRef.current
    if (scanner?.isScanning) {
      await scanner.stop().catch(() => {})
    }
  }, [])

  const onDecodeSuccess = useCallback(
    (decodedText: string) => {
      if (decodedText === lastDecodedRef.current) return
      lastDecodedRef.current = decodedText

      const parsed = parseBip21Uri(decodedText)
      if (parsed) {
        void stopScanner().then(() => handleResult(parsed))
      } else {
        toast.error(t('send.qr_scan_invalid_address'))
      }
    },
    [handleResult, stopScanner, t],
  )

  useEffect(() => {
    if (!open) return

    lastDecodedRef.current = null

    // small delay to let the dialog DOM render
    const timeout = setTimeout(() => {
      setError(undefined)
      const element = document.querySelector(`#${QR_READER_ELEMENT_ID}`)
      if (!element) return

      const scanner = new Html5Qrcode(QR_READER_ELEMENT_ID)
      scannerRef.current = scanner

      scanner
        .start({ facingMode: 'environment' }, SCAN_CONFIG, onDecodeSuccess, () => {})
        .catch(() => {
          // environment camera failed, try user-facing camera
          scanner
            .start({ facingMode: 'user' }, SCAN_CONFIG, onDecodeSuccess, () => {})
            .catch(() => {
              setError(t('send.qr_scan_camera_error'))
            })
        })
    }, 300)

    return () => {
      clearTimeout(timeout)
      const scanner = scannerRef.current
      if (scanner?.isScanning) {
        scanner.stop().catch(() => {})
      }
      scannerRef.current = null
    }
  }, [open, onDecodeSuccess, handleResult, stopScanner, t])

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText()
      const parsed = parseBip21Uri(text)
      if (parsed) {
        await stopScanner()
        handleResult(parsed)
      } else {
        toast.error(t('send.qr_scan_invalid_address'))
      }
    } catch {
      toast.error(t('send.qr_paste_failed'))
    }
  }, [handleResult, stopScanner, t])

  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
        const scanner = scannerRef.current
        if (!scanner) return
        const decodedText = await scanner.scanFile(file, false)
        const parsed = parseBip21Uri(decodedText)
        if (parsed) {
          await stopScanner()
          handleResult(parsed)
        } else {
          toast.error(t('send.qr_scan_invalid_address'))
        }
      } catch {
        toast.error(t('send.qr_scan_file_no_qr'))
      }
    },
    [handleResult, stopScanner, t],
  )

  const handleClose = () => {
    setError(undefined)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('send.qr_scan_title')}</DialogTitle>
          <DialogDescription>{t('send.qr_scan_description')}</DialogDescription>
        </DialogHeader>

        <div className="py-4" aria-live="polite">
          <p className="sr-only">{t('send.qr_scan_description')}</p>
          <div id={QR_READER_ELEMENT_ID} className="w-full overflow-hidden rounded-md" />
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

        <DialogFooter className="sm:justify-center">
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
