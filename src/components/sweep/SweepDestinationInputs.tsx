import { useCallback, useState } from 'react'
import { PlusCircleIcon, ScanQrCodeIcon, XIcon } from 'lucide-react'
import type { UseFieldArrayReturn, UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import QrScannerDialog from '@/components/ui/QrScannerDialog'
import { Button } from '@/components/ui/button'
import { ButtonGroup } from '@/components/ui/button-group'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { parseBip21Uri, type Bip21ParseResult } from '@/lib/bip21'
import type { SweepFormValues } from './SweepFormSchema'

type ParentForm = UseFormReturn<SweepFormValues, unknown, SweepFormValues>

interface SweepDestinationInputsProps {
  minNumberOfFields: number
  register: ParentForm['register']
  setValue: ParentForm['setValue']
  formState: ParentForm['formState']
  fields: UseFieldArrayReturn<SweepFormValues, 'destinations', 'id'>['fields']
  disabled?: boolean
  onClickAppend?: () => void
  onClickRemove?: (index: number) => void
}

export const SweepDestinationInputs = ({
  minNumberOfFields,
  setValue,
  register,
  formState: { errors, isSubmitted, touchedFields },
  fields,
  disabled,
  onClickAppend,
  onClickRemove,
}: SweepDestinationInputsProps) => {
  const { t } = useTranslation()

  const [qrScannerIndex, setQrScannerIndex] = useState<number>()

  const applyBip21Result = useCallback(
    (result: Bip21ParseResult, index: number) => {
      setValue(`destinations.${index}.address`, result.address, { shouldValidate: true })
    },
    [setValue],
  )

  const handleAddressPaste = useCallback(
    (event: React.ClipboardEvent<HTMLInputElement>, index: number) => {
      const pasted = event.clipboardData.getData('text')
      if (!pasted.toLowerCase().startsWith('bitcoin:')) return

      const parsed = parseBip21Uri(pasted)
      if (!parsed) return

      event.preventDefault()
      applyBip21Result(parsed, index)
      toast.success(t('send.qr_scan_bip21_applied'))
    },
    [applyBip21Result, t],
  )

  return (
    <>
      <QrScannerDialog
        open={qrScannerIndex !== undefined}
        onOpenChange={(open) => !open && setQrScannerIndex(undefined)}
        onScan={(result) => {
          if (qrScannerIndex !== undefined) {
            applyBip21Result(result, qrScannerIndex)
            setQrScannerIndex(undefined)
          }
        }}
      />
      <div className="space-y-3">
        {fields.map((field, index) => {
          const fieldError = errors.destinations?.[index]?.address?.message
          const showFieldError = isSubmitted || touchedFields.destinations?.[index]?.address === true

          return (
            <div key={field.id} className="space-y-1">
              <Field data-invalid={showFieldError && fieldError !== undefined}>
                <FieldLabel htmlFor={`sweep-destination-${index}`}>
                  {t('scheduler.label_destination_input', { destination: index + 1 })}
                </FieldLabel>
                <ButtonGroup className="w-full">
                  <Input
                    id={`sweep-destination-${index}`}
                    {...register(`destinations.${index}.address` as const)}
                    className="font-mono"
                    placeholder={t('scheduler.placeholder_destination_input')}
                    disabled={disabled}
                    autoComplete="off"
                    spellCheck={false}
                    onPaste={(event) => handleAddressPaste(event, index)}
                  />
                  {index >= minNumberOfFields && onClickRemove ? (
                    <Button type="button" variant="outline" size="lg" onClick={() => onClickRemove(index)}>
                      <XIcon />
                    </Button>
                  ) : null}
                  <Button
                    id={`show-qr-scanner-trigger-${index}`}
                    type="button"
                    variant="outline"
                    size="lg"
                    disabled={disabled}
                    onClick={() => setQrScannerIndex(index)}
                  >
                    <ScanQrCodeIcon />
                    <span className="sr-only">{t('send.qr_scan_title')}</span>
                  </Button>
                </ButtonGroup>
              </Field>
              {showFieldError && fieldError && <div className="text-destructive text-xs">{fieldError}</div>}
            </div>
          )
        })}
      </div>
      {onClickAppend ? (
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" onClick={onClickAppend}>
            <PlusCircleIcon />
            {/* TODO: i18n */}
            Add additional destination
          </Button>
        </div>
      ) : null}
    </>
  )
}
