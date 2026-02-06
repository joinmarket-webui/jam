import { useMemo } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { useForm, useWatch, type Resolver, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as yup from 'yup'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { SelectableJar } from '@/components/ui/jam/SelectableJar'
import { useWalletBalanceSummary, type Jar } from '@/context/JamWalletInfoContext'
import { cn } from '@/lib/utils'
import { DevBadge } from '../dev/DevBadge'
import { Field, FieldLabel } from '../ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group'
import { SatSymbol } from '../ui/jam/CurrencySymbol'
import type { ReceiveFormValues } from './types'

const FieldPrefixSatSymbol = (
  <SatSymbol
    width={'18px'}
    height={'18px'}
    style={{
      margin: '5px -1px',
    }}
  />
)

const receiveFormSchema = (jars: Jar[]) => {
  return yup
    .object({
      source: yup
        .object({
          fromJar: yup
            .number()
            .integer()
            .test('valid-source-jar-index-test', 'Invalid source jar index.', (value) =>
              jars.some((it) => it.jarIndex === value),
            )
            .required(),
        })
        .required(),
      amount: yup
        .object({
          amount: yup
            .number()
            .integer()
            .min(1)
            .max(21_000_000 * 100_000_000)
            .transform((value) => (Number.isSafeInteger(value) ? Number(value) : null))
            .nullable()
            .optional(),
        })
        .required(),
    })
    .required()
}

interface ReceiveFormProps {
  className?: string
  defaultValues?: ReceiveFormValues
  onSubmit: SubmitHandler<ReceiveFormValues>
  jars: Jar[]
  disabled?: boolean
  debug?: boolean
}

export const ReceiveForm = ({ className, defaultValues, onSubmit, jars, disabled, debug }: ReceiveFormProps) => {
  const { t } = useTranslation()
  const { walletBalanceSummary } = useWalletBalanceSummary()

  const schema = useMemo(() => receiveFormSchema(jars), [jars])

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    setValue,
  } = useForm<ReceiveFormValues, unknown, ReceiveFormValues>({
    mode: 'onChange',
    defaultValues,
    // force type (see https://github.com/react-hook-form/resolvers/issues/807)
    resolver: yupResolver(schema) as Resolver<ReceiveFormValues, unknown, ReceiveFormValues>,
  })

  const values = useWatch({ control })

  const doOnChange = handleSubmit(onSubmit)

  return (
    <form onChange={(event) => void doOnChange(event)} className={cn('flex flex-col gap-4', className)} noValidate>
      <div className="space-y-2">
        <Field className="space-y-4" data-invalid={errors.source !== undefined}>
          <FieldLabel>{t('receive.label_source_jar')}</FieldLabel>
          <div className="grid grid-cols-5 gap-4">
            {jars.map((jar, index) => (
              <SelectableJar
                key={index}
                name={jar.name}
                color={jar.color}
                balance={jar.balanceSummary.calculatedTotalBalanceInSats}
                totalBalance={walletBalanceSummary.calculatedTotalBalanceInSats}
                isSelected={values.source?.fromJar === jar.jarIndex}
                onClick={() => {
                  setValue('source.fromJar', jar.jarIndex, { shouldValidate: true })
                }}
                disabled={disabled || isSubmitting}
              />
            ))}
          </div>
        </Field>
      </div>

      <div className="space-y-2">
        <Field data-invalid={errors.amount?.amount !== undefined}>
          <FieldLabel htmlFor="receive-amount">{t('receive.label_amount_input')}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="receive-amount"
              {...register('amount.amount', {
                required: false,
                disabled,
              })}
              type="number"
              min={1}
              step={1}
              placeholder={t('receive.placeholder_amount_input')}
            />
            <InputGroupAddon align="inline-start">{FieldPrefixSatSymbol}</InputGroupAddon>
          </InputGroup>
        </Field>
        {errors.amount?.amount && (
          <div className="text-destructive text-xs">{t('receive.feedback_invalid_amount')}</div>
        )}
      </div>

      {debug && (
        <Card className="mt-8">
          <CardHeader className="grid">
            <DevBadge className="justify-self-end" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="overflow-scroll">
              <code className="light:text-red-700 text-red-800">isValid:</code>
              <pre className="text-xs">{JSON.stringify(isValid, null, 2)}</pre>
            </div>
            <div className="overflow-scroll">
              <code className="light:text-red-700 text-red-800">values:</code>
              <pre className="text-xs">{JSON.stringify(values, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </form>
  )
}
