import { yupResolver } from '@hookform/resolvers/yup'
import { useForm, useWatch } from 'react-hook-form'
import type { Resolver, SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as yup from 'yup'
import { isDevMode } from '@/constants/debugFeatures'
import { JM_MINIMUM_MAKERS_DEFAULT } from '@/constants/jm'
import { cn, pseudoRandomInteger } from '@/lib/utils'
import { DevBadge } from '../dev/DevBadge'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Input } from '../ui/input'
import { SatSymbol } from '../ui/jam/CurrencySymbol'
import { Label } from '../ui/label'
import { Spinner } from '../ui/spinner'
import type { SendFormValues } from './types'

const FORM_INPUT_DEFAULT_VALUES: SendFormValues = {
  sourceJarIndex: undefined,
  destination: undefined,
  amount: undefined,
  txFee: undefined,
  isCoinJoin: true,
  numCollaborators: undefined,
}

const initialNumCollaborators = (minValue: number): number => {
  if (minValue > 8) {
    return minValue + pseudoRandomInteger(0, 2)
  }

  return pseudoRandomInteger(8, 10)
}

// set the default to one collaborator in dev mode
const DEV_INITIAL_NUM_COLLABORATORS_INPUT = 1

const MAX_NUM_COLLABORATORS = 99

// TODO: this value should be dynamic via jm backend settings
const MIN_NUM_COLLABORATORS = isDevMode()
  ? DEV_INITIAL_NUM_COLLABORATORS_INPUT
  : initialNumCollaborators(JM_MINIMUM_MAKERS_DEFAULT)

const baseSchema = yup
  .object({
    isCoinJoin: yup.boolean().default(FORM_INPUT_DEFAULT_VALUES.isCoinJoin).required(),
    numCollaborators: yup
      .number()
      .integer()
      .when('isCoinJoin', {
        is: (val: boolean) => val === true,
        then: (schema) =>
          schema
            .default(FORM_INPUT_DEFAULT_VALUES.numCollaborators)
            .min(MIN_NUM_COLLABORATORS)
            .max(MAX_NUM_COLLABORATORS)
            .required(),
        otherwise: (schema) =>
          schema
            .transform((value) => (Number.isNaN(value) ? null : value))
            .nullable()
            .optional(),
      }),
    amount: yup
      .object({
        isSweep: yup.boolean().default(false).required(),
        value: yup
          .number()
          .integer()
          .when('isSweep', {
            is: (val: boolean) => val === true,
            then: (schema) => schema.min(0).max(0).optional(),
            otherwise: (schema) =>
              schema
                .min(1)
                .max(21_000_000 * 100_000_000)
                .required(),
          }),
      })
      .required(),
    destination: yup
      .object({
        fromJar: yup.number().optional(),
        value: yup.string().required(),
      })
      .required(),
  })
  .required()

const FieldPrefixSatSymbol = (
  <SatSymbol
    width={'18px'}
    height={'18px'}
    style={{
      margin: '5px -1px',
    }}
  />
)

interface SendFormProps {
  className?: string
  onSubmit: SubmitHandler<SendFormValues>
  minNumCollaborators?: number
  disabled?: boolean
  debug?: boolean
}

export function SendForm({
  className,
  onSubmit,
  disabled,
  minNumCollaborators = MIN_NUM_COLLABORATORS,
  debug,
}: SendFormProps) {
  const { t } = useTranslation()

  const schema = baseSchema.concat(
    yup.object({
      numCollaborators: yup
        .number()
        .default(FORM_INPUT_DEFAULT_VALUES.numCollaborators)
        .min(minNumCollaborators)
        .max(MAX_NUM_COLLABORATORS)
        .optional(),
    }),
  )

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
    //getValues,
    //setValue,
  } = useForm<SendFormValues, unknown, SendFormValues>({
    mode: 'all',
    defaultValues: FORM_INPUT_DEFAULT_VALUES,
    // force type (see https://github.com/react-hook-form/resolvers/issues/807)
    resolver: yupResolver(schema) as Resolver<SendFormValues, unknown, SendFormValues>,
  })

  const values = useWatch({ control })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn('flex flex-col gap-4', className)}>
      <div className="space-y-2">
        <Label htmlFor="send-destination" className="text-sm font-medium">
          {t('send.label_recipient')}
        </Label>

        <Input
          id="send-destination"
          {...register('destination.value', {
            required: true,
            disabled,
          })}
          type="text"
          className=""
          placeholder={t('send.placeholder_recipient')}
        />
        {errors.destination && (
          <>
            <div className="light:text-red-700 text-xs text-red-500">
              {t('send.feedback_invalid_destination_address')}
            </div>
            {/* TODO: feedback_invalid_source_jar */}
            {/* TODO: feedback_reused_address */}
          </>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="send-amount" className="text-sm font-medium">
          {t('send.label_amount_input')}
        </Label>
        <div className="relative">
          <div className="absolute top-1/2 left-3 -translate-y-1/2">{FieldPrefixSatSymbol}</div>

          <Input
            id="send-amount"
            {...register('amount.value', {
              required: true,
              disabled,
            })}
            type="number"
            className="pl-10"
            placeholder={t('send.placeholder_amount_input')}
          />
        </div>
        {errors.amount && (
          <div className="light:text-red-700 text-xs text-red-500">{t('send.feedback_invalid_amount')}</div>
        )}
      </div>

      <Button
        type="submit"
        variant={disabled ? 'outline' : undefined}
        disabled={disabled || !isValid || isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Spinner className="motion-reduce:hidden" />
            {t('send.text_sending')}
          </>
        ) : (
          <>{t('send.button_send')}</>
        )}
      </Button>

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
