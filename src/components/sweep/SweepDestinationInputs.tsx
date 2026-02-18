import { useTranslation } from 'react-i18next'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

interface SweepDestinationInputsProps {
  addresses: string[]
  errors: Array<string | undefined>
  touched: boolean[]
  disabled: boolean
  onChange: (index: number, value: string) => void
  onBlur: (index: number) => void
}

export const SweepDestinationInputs = ({
  addresses,
  errors,
  touched,
  disabled,
  onChange,
  onBlur,
}: SweepDestinationInputsProps) => {
  const { t } = useTranslation()

  return (
    <div className="space-y-3">
      {addresses.map((address, index) => (
        <div key={index} className="space-y-1">
          <Field data-invalid={touched[index] && errors[index] !== undefined}>
            <FieldLabel htmlFor={`sweep-destination-${index}`}>
              {t('scheduler.label_destination_input', { destination: index + 1 })}
            </FieldLabel>
            <Input
              id={`sweep-destination-${index}`}
              value={address}
              onChange={(event) => onChange(index, event.currentTarget.value)}
              onBlur={() => onBlur(index)}
              className="font-mono"
              placeholder={t('scheduler.placeholder_destination_input')}
              disabled={disabled}
              autoComplete="off"
              spellCheck={false}
            />
          </Field>
          {touched[index] && errors[index] && <div className="text-destructive text-xs">{errors[index]}</div>}
        </div>
      ))}
    </div>
  )
}
