import { InfoIcon, PercentIcon } from 'lucide-react'
import { type UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { Field, FieldDescription, FieldLabel } from '../ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group'
import { SatSymbol } from '../ui/jam/CurrencySymbol'
import type { CollaboratorFeesFormValues } from './CollaboratorFeesFormSchema'

const FieldPrefixSatSymbol = (
  <SatSymbol
    width={'18px'}
    height={'18px'}
    style={{
      margin: '5px -1px',
    }}
  />
)

interface CollaboratorFeesFormProps {
  className?: string
  form: UseFormReturn<CollaboratorFeesFormValues, unknown, CollaboratorFeesFormValues>
}

export const CollaboratorFeesForm = ({
  className,
  form: {
    register,
    formState: { errors },
  },
}: CollaboratorFeesFormProps) => {
  const { t } = useTranslation()

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <p className="text-muted-foreground text-sm">{t('settings.fees.description_max_cj_fee_settings')}</p>

      <Alert variant="default">
        <InfoIcon className="text-muted-foreground size-4 shrink-0" />
        <AlertDescription>{t('settings.fees.subtitle_max_cj_fee')}</AlertDescription>
      </Alert>

      {/* Absolute limit field */}

      <div className="space-y-2">
        <Field data-invalid={errors.maxCjFeeAbs !== undefined}>
          <FieldLabel htmlFor="collaborator-fees-max-cj-fee-abs">{t('settings.fees.label_max_cj_fee_abs')}</FieldLabel>
          <FieldDescription className="text-xs">{t('settings.fees.description_max_cj_fee_abs')}</FieldDescription>
          <InputGroup>
            <InputGroupInput
              id="collaborator-fees-max-cj-fee-abs"
              {...register('maxCjFeeAbs')}
              type="number"
              inputMode="numeric"
              min="0"
              step="any"
            />
            <InputGroupAddon align="inline-start">{FieldPrefixSatSymbol}</InputGroupAddon>
          </InputGroup>
        </Field>
        {errors.maxCjFeeAbs?.message && <div className="text-destructive text-xs">{errors.maxCjFeeAbs.message}</div>}
      </div>

      {/* Relative limit field */}
      <div className="space-y-2">
        <Field data-invalid={errors.maxCjFeeRelInPercent !== undefined}>
          <FieldLabel htmlFor="collaborator-fees-max-cj-fee-rel">{t('settings.fees.label_max_cj_fee_rel')}</FieldLabel>
          <FieldDescription className="text-xs">{t('settings.fees.description_max_cj_fee_rel')}</FieldDescription>
          <InputGroup>
            <InputGroupInput
              id="collaborator-fees-max-cj-fee-rel"
              {...register('maxCjFeeRelInPercent')}
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="any"
            />
            <InputGroupAddon align="inline-start">
              <PercentIcon />
            </InputGroupAddon>
          </InputGroup>
        </Field>
        {errors.maxCjFeeRelInPercent?.message && (
          <div className="text-destructive text-xs">{errors.maxCjFeeRelInPercent.message}</div>
        )}
      </div>
    </div>
  )
}
