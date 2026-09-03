import { useMemo, useState } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import type { Network } from 'bitcoin-address-validation'
import { AlertTriangleIcon } from 'lucide-react'
import { useFieldArray, useForm, useWatch, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { DevBadge } from '@/components/dev/DevBadge'
import { SweepDestinationInputs } from '@/components/sweep/SweepDestinationInputs'
import {
  buildSweepDestinationValues,
  sweepFormSchema,
  type SweepResolverContext,
  type SweepFormValues,
  buildSweepFormValuesDefaultValues,
} from '@/components/sweep/SweepFormSchema'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { isDebugFeatureEnabled } from '@/constants/debugFeatures'
import {
  JAM_SWEEP_DESTINATION_ADDRESSES_DEFAULT_COUNT,
  JAM_SWEEP_DESTINATION_ADDRESSES_MIN_COUNT,
  JAM_SWEEP_MAKER_SESSION_IDLE_MIN_TIMEOUT_SECONDS,
  JAM_SWEEP_MAX_MAX_NUMBER_OF_COLLABORATORS,
  JAM_SWEEP_MAX_ROUNDING_CHANCE_PERCENT,
  JAM_SWEEP_MAX_TRANSACTIONS_PER_JAR,
  JAM_SWEEP_MIN_MAX_NUMBER_OF_COLLABORATORS,
  JAM_SWEEP_MIN_MIN_NUMBER_OF_COLLABORATORS,
  JAM_SWEEP_MIN_ROUNDING_CHANCE_PERCENT,
  JAM_SWEEP_MIN_TRANSACTIONS_PER_JAR,
} from '@/constants/jam'
import type { AddressSummary, Jar } from '@/context/JamWalletInfoContext'
import { cn } from '@/lib/utils'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { Card, CardContent, CardHeader } from '../ui/card'
import { Field, FieldDescription, FieldError, FieldLabel, FieldSet } from '../ui/field'
import { SliderWithInput } from '../ui/jam/SliderWithInput'
import { Slider } from '../ui/slider'
import { Spinner } from '../ui/spinner'

const getNewTestingDestinationAddress = (addressSummary: AddressSummary): string => {
  const newAddressFromDefaultJar =
    Object.values(addressSummary).find((addressMeta) => addressMeta.status === 'new' && addressMeta.jarIndex === 0)
      ?.address ?? ''
  if (newAddressFromDefaultJar !== '') {
    return newAddressFromDefaultJar
  }

  return Object.values(addressSummary).find((addressMeta) => addressMeta.status === 'new')?.address ?? ''
}

interface SweepFormProps {
  className?: string
  onSubmit: SubmitHandler<SweepFormValues>
  initialValues?: Partial<SweepFormValues>
  jars: Jar[]
  addressSummary: AddressSummary
  network: Network
  disabled?: boolean
  debug?: boolean
}

export const SweepForm = ({
  className,
  onSubmit,
  jars,
  addressSummary,
  network,
  initialValues,
  disabled,
  debug,
}: SweepFormProps) => {
  const { t } = useTranslation()

  const showInsecureScheduleTestingToggle = debug && isDebugFeatureEnabled('insecureScheduleTesting')

  const defaultValues = useMemo(() => buildSweepFormValuesDefaultValues(), [])

  const [minNumberOfDestinations] = useState(JAM_SWEEP_DESTINATION_ADDRESSES_MIN_COUNT)
  const [maxNumberOfDestinations] = useState(Math.max(minNumberOfDestinations, jars.length))

  const schema = useMemo(
    () =>
      sweepFormSchema(
        {
          minNumberOfDestinations,
          maxNumberOfDestinations,
          addressSummary,
          network,
        },
        t,
      ),
    [minNumberOfDestinations, maxNumberOfDestinations, addressSummary, network, t],
  )
  const { formState, reset, register, control, setValue, handleSubmit, trigger } = useForm<
    SweepFormValues,
    SweepResolverContext,
    SweepFormValues
  >({
    mode: 'onSubmit',
    defaultValues: {
      ...defaultValues,
      destinations:
        defaultValues?.destinations ?? buildSweepDestinationValues(JAM_SWEEP_DESTINATION_ADDRESSES_DEFAULT_COUNT),
    },
    values: {
      ...defaultValues,
      ...initialValues,
    },
    resolver: yupResolver(schema),
  })

  const formWatch = useWatch({ control })
  const destinationsFieldArray = useFieldArray({ control, name: 'destinations' })

  const onInsecureTestingToggleChange = (checked: boolean) => {
    setValue('useInsecureTestingSettings', checked)

    if (checked) {
      destinationsFieldArray.replace(
        buildSweepDestinationValues(JAM_SWEEP_DESTINATION_ADDRESSES_MIN_COUNT).map(() => ({
          address: getNewTestingDestinationAddress(addressSummary),
        })),
      )
      setValue('minNumberOfCollaborators', JAM_SWEEP_MIN_MIN_NUMBER_OF_COLLABORATORS)
      setValue('maxNumberOfCollaborators', JAM_SWEEP_MIN_MAX_NUMBER_OF_COLLABORATORS)
      setValue('minNumberOfTransactionsPerJar', JAM_SWEEP_MIN_TRANSACTIONS_PER_JAR)
      setValue('makerSessionIdleTimeoutSeconds', JAM_SWEEP_MAKER_SESSION_IDLE_MIN_TIMEOUT_SECONDS)
      void trigger()
    } else {
      reset()
    }
  }

  const doOnSubmit = handleSubmit(onSubmit)

  const collapsibleFormElementsValid = useMemo(
    () =>
      [formState.errors.includeMakerSessions, formState.errors.useInsecureTestingSettings].every(
        (it) => it === undefined,
      ),
    [formState.errors.includeMakerSessions, formState.errors.useInsecureTestingSettings],
  )

  return (
    <form onSubmit={(event) => void doOnSubmit(event)} className={cn('flex flex-col gap-4', className)} noValidate>
      {showInsecureScheduleTestingToggle && (
        <div className="flex items-center gap-2">
          <Switch
            id="switch-use-insecure-schedule-testing"
            checked={formWatch.useInsecureTestingSettings}
            onCheckedChange={onInsecureTestingToggleChange}
            disabled={disabled}
          />
          <Label htmlFor="switch-use-insecure-schedule-testing" className="flex flex-col items-start gap-0">
            <div className="flex items-center gap-2 font-medium">
              Use insecure testing settings
              <DevBadge />
            </div>
            <div className="text-muted-foreground text-sm">
              This is completely insecure but makes testing the schedule much faster.
            </div>
          </Label>
        </div>
      )}

      <SweepDestinationInputs
        minNumberOfFields={minNumberOfDestinations}
        maxNumberOfFields={maxNumberOfDestinations}
        register={register}
        setValue={setValue}
        formState={formState}
        fields={destinationsFieldArray.fields}
        disabled={disabled}
        onClickAppend={() => {
          destinationsFieldArray.append(buildSweepDestinationValues(1), { shouldFocus: false })
        }}
        onClickRemove={(index: number) => {
          destinationsFieldArray.remove(index)
        }}
      />

      <Accordion type="single" collapsible>
        <AccordionItem value="options">
          <AccordionTrigger
            className={cn({
              'text-destructive': !collapsibleFormElementsValid,
            })}
          >
            <div className="flex items-center gap-2">
              {!collapsibleFormElementsValid ? <AlertTriangleIcon /> : null}
              {t('scheduler.scheduler_options')}
            </div>
          </AccordionTrigger>

          <AccordionContent
            className={cn('flex flex-col gap-6 py-2', 'mx-1' /* add x-spacing for input component focus state*/)}
          >
            <FieldSet>
              <Field
                orientation="horizontal"
                className="gap-4"
                data-invalid={formState.errors.includeMakerSessions !== undefined}
              >
                <Switch
                  id="switch-include-maker-sessions"
                  checked={formWatch.includeMakerSessions}
                  onCheckedChange={(checked: boolean) => setValue('includeMakerSessions', checked)}
                  disabled={disabled}
                />
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col items-start gap-0">
                    <FieldLabel htmlFor="switch-include-maker-sessions">
                      {/* TODO: i18n */}Include maker sessions
                    </FieldLabel>
                    <FieldDescription className="text-xs">
                      {/* TODO: i18n */}Occasionally switch from taker to maker, which aids privacy.
                    </FieldDescription>
                  </div>
                </div>
                {formState.errors.includeMakerSessions?.message ? (
                  <FieldError>
                    {/* TODO: i18n, "between {{ min }} and {{ max }}*/}Please provide a valid value.
                  </FieldError>
                ) : null}
              </Field>

              <Field
                className="gap-4"
                data-invalid={
                  formState.errors.minNumberOfCollaborators !== undefined ||
                  formState.errors.maxNumberOfCollaborators !== undefined
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col items-start gap-0">
                    <FieldLabel htmlFor="slider-min-max-maker">{/* TODO: i18n */}Number of collaborators</FieldLabel>
                    <FieldDescription className="text-xs">
                      {/* TODO: i18n */}More collaborators are better for privacy, but also increase transaction fees.
                    </FieldDescription>
                  </div>
                  <span className="text-foreground">
                    {formWatch.minNumberOfCollaborators} - {formWatch.maxNumberOfCollaborators}
                  </span>
                </div>
                <Slider
                  id="slider-min-max-maker"
                  min={JAM_SWEEP_MIN_MIN_NUMBER_OF_COLLABORATORS}
                  max={JAM_SWEEP_MAX_MAX_NUMBER_OF_COLLABORATORS}
                  minStepsBetweenThumbs={1}
                  value={[
                    formWatch.minNumberOfCollaborators ??
                      defaultValues?.minNumberOfCollaborators ??
                      JAM_SWEEP_MIN_MIN_NUMBER_OF_COLLABORATORS,
                    formWatch.maxNumberOfCollaborators ??
                      defaultValues?.maxNumberOfCollaborators ??
                      JAM_SWEEP_MAX_MAX_NUMBER_OF_COLLABORATORS,
                  ]}
                  onValueChange={(values: number[]) => {
                    setValue('minNumberOfCollaborators', values[0])
                    setValue('maxNumberOfCollaborators', values[1])
                  }}
                  disabled={disabled}
                />
                {formState.errors.minNumberOfCollaborators?.message ? (
                  <FieldError>
                    {/* TODO: i18n, "between {{ min }} and {{ max }}*/}Please provide a valid minimum value.
                  </FieldError>
                ) : null}
                {formState.errors.maxNumberOfCollaborators?.message ? (
                  <FieldError>
                    {/* TODO: i18n, "between {{ min }} and {{ max }}*/}Please provide a valid maximum value.
                  </FieldError>
                ) : null}
              </Field>

              <Field className="gap-4" data-invalid={formState.errors.minNumberOfTransactionsPerJar !== undefined}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col items-start gap-0">
                    <FieldLabel htmlFor="slider-min-number-of-transactions-per-jar">
                      {/* TODO: i18n */}Transactions per Jar
                    </FieldLabel>
                    <FieldDescription className="text-xs">
                      {/* TODO: i18n */}Minimum number of collaborative transactions per Jar.
                    </FieldDescription>
                  </div>
                  <span className="text-foreground">{formWatch.minNumberOfTransactionsPerJar}</span>
                </div>
                <SliderWithInput
                  id="slider-min-number-of-transactions-per-jar"
                  min={JAM_SWEEP_MIN_TRANSACTIONS_PER_JAR}
                  max={JAM_SWEEP_MAX_TRANSACTIONS_PER_JAR}
                  value={
                    formWatch.minNumberOfTransactionsPerJar === undefined
                      ? undefined
                      : [formWatch.minNumberOfTransactionsPerJar]
                  }
                  onValueChange={(values: number[]) => setValue('minNumberOfTransactionsPerJar', values[0])}
                  disabled={disabled}
                />
                {formState.errors.minNumberOfTransactionsPerJar?.message ? (
                  <FieldError>
                    {/* TODO: i18n, "between {{ min }} and {{ max }}*/}Please provide a valid value.
                  </FieldError>
                ) : null}
              </Field>

              <Field className="gap-4" data-invalid={formState.errors.roundingChanceInPercent !== undefined}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col items-start gap-0">
                    <FieldLabel htmlFor="slider-rounding-chance-in-percent">
                      {/* TODO: i18n */}Round amount probability
                    </FieldLabel>
                    <FieldDescription className="text-xs">
                      {/* TODO: i18n */}Probability that an intermediate transaction output amount is rounded to mimic
                      human behavior.
                    </FieldDescription>
                  </div>
                  <span className="text-foreground">{formWatch.roundingChanceInPercent}%</span>
                </div>
                <SliderWithInput
                  id="slider-rounding-chance-in-percent"
                  min={JAM_SWEEP_MIN_ROUNDING_CHANCE_PERCENT}
                  max={JAM_SWEEP_MAX_ROUNDING_CHANCE_PERCENT}
                  value={
                    formWatch.roundingChanceInPercent === undefined ? undefined : [formWatch.roundingChanceInPercent]
                  }
                  onValueChange={(values: number[]) => setValue('roundingChanceInPercent', values[0])}
                  disabled={disabled}
                />
                {formState.errors.roundingChanceInPercent?.message ? (
                  <FieldError>
                    {/* TODO: i18n, "between {{ min }} and {{ max }}*/}Please provide a valid value.
                  </FieldError>
                ) : null}
              </Field>
            </FieldSet>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
      <p className="text-muted-foreground text-sm">{t('scheduler.description_fees')}</p>

      <Button type="submit" disabled={disabled || formState.isSubmitting} className="w-full" size="xxl">
        {formState.isSubmitting ? (
          <>
            <Spinner className="motion-reduce:hidden" />
            {t('scheduler.button_plan')}
          </>
        ) : (
          t('scheduler.button_plan')
        )}
      </Button>

      {debug && (
        <Card className="mt-8">
          <CardHeader className="grid">
            <DevBadge className="justify-self-end" />
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="overflow-scroll">
              <code className="text-destructive">errors:</code>
              <pre className="text-xs">
                {JSON.stringify(formState.errors.maxNumberOfCollaborators?.message, null, 2)}
              </pre>
              <pre className="text-xs">
                {JSON.stringify(formState.errors.minNumberOfCollaborators?.message, null, 2)}
              </pre>

              <pre className="text-xs">{JSON.stringify(formState.errors.destinations?.message, null, 2)}</pre>
              <pre className="text-xs">
                {JSON.stringify(formState.errors.destinations?.[0]?.address?.message, null, 2)}
              </pre>
              <pre className="text-xs">
                {JSON.stringify(formState.errors.destinations?.[1]?.address?.message, null, 2)}
              </pre>
              <pre className="text-xs">
                {JSON.stringify(formState.errors.destinations?.[2]?.address?.message, null, 2)}
              </pre>

              <pre className="text-xs">
                {JSON.stringify(formState.errors.roundingChanceInPercent?.message, null, 2)}
              </pre>
              <pre className="text-xs">{JSON.stringify(formState.errors.includeMakerSessions?.message, null, 2)}</pre>
            </div>
          </CardContent>
        </Card>
      )}
    </form>
  )
}
