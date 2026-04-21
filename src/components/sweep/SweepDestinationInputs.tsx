import type { FieldArrayWithId, UseFormReturn } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { SweepFormValues } from './SweepFormSchema'

interface SweepDestinationInputsProps {
  form: UseFormReturn<SweepFormValues, unknown, SweepFormValues>
  fields: Array<FieldArrayWithId<SweepFormValues, 'destinations', 'id'>>
  disabled: boolean
}

export const SweepDestinationInputs = ({ form, fields, disabled }: SweepDestinationInputsProps) => {
  const { t } = useTranslation()
  const {
    formState: { errors, isSubmitted, touchedFields },
    register,
  } = form

  return (
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
              <Input
                id={`sweep-destination-${index}`}
                {...register(`destinations.${index}.address`)}
                className="font-mono"
                placeholder={t('scheduler.placeholder_destination_input')}
                disabled={disabled}
                autoComplete="off"
                spellCheck={false}
              />
            </Field>
            {showFieldError && fieldError && <div className="text-destructive text-xs">{fieldError}</div>}
          </div>
        )
      })}
    </div>
  )
}
