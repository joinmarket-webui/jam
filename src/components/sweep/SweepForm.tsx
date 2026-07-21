import { useMemo } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
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
  MIN_MIN_NUMBER_OF_COLLABORATORS,
  MAX_MAX_NUMBER_OF_COLLABORATORS,
  MIN_ROUNDING_CHANCE_FACTOR,
  MAX_ROUNDING_CHANCE_FACTOR,
} from '@/components/sweep/SweepFormSchema'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { isDebugFeatureEnabled } from '@/constants/debugFeatures'
import {
  JAM_SWEEP_DESTINATION_ADDRESSES_DEFAULT_COUNT,
  JAM_SWEEP_DESTINATION_ADDRESSES_MIN_COUNT,
  JAM_SWEEP_MAKER_SESSION_IDLE_MIN_TIMEOUT_SECONDS,
} from '@/constants/jam'
import type { AddressSummary } from '@/context/JamWalletInfoContext'
import { cn, factorToPercentage } from '@/lib/utils'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { Card, CardContent, CardHeader } from '../ui/card'
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
  addressSummary: AddressSummary
  disabled?: boolean
  debug?: boolean
}

export const SweepForm = ({ className, onSubmit, addressSummary, initialValues, disabled, debug }: SweepFormProps) => {
  const { t } = useTranslation()

  const showInsecureScheduleTestingToggle = debug && isDebugFeatureEnabled('insecureScheduleTesting')

  const defaultValues = useMemo(() => buildSweepFormValuesDefaultValues(), [])

  const schema = useMemo(() => sweepFormSchema(addressSummary, t), [addressSummary, t])
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
      setValue('minNumberOfCollaborators', 1)
      setValue('maxNumberOfCollaborators', 1)
      setValue('minNumberOfTransactionsPerJar', 2)
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
        minNumberOfFields={
          formWatch.useInsecureTestingSettings
            ? JAM_SWEEP_DESTINATION_ADDRESSES_MIN_COUNT
            : JAM_SWEEP_DESTINATION_ADDRESSES_DEFAULT_COUNT
        }
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
            <div className="flex items-center gap-2">
              <Switch
                id="switch-include-maker-sessions"
                checked={formWatch.includeMakerSessions}
                onCheckedChange={(checked: boolean) => setValue('includeMakerSessions', checked)}
                disabled={disabled}
              />
              <Label htmlFor="switch-include-maker-sessions" className="flex flex-col items-start gap-0">
                {/* TODO: i18n */}
                <div className="flex items-center gap-2 font-medium">Include maker sessions</div>
                <div className="text-muted-foreground text-sm">
                  Occasionally switch from taker to maker, which aids privacy.
                </div>
              </Label>
            </div>
            <div className="flex flex-col justify-center gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="slider-min-max-maker" className="flex flex-col items-start gap-0">
                  {/* TODO: i18n */}
                  <div className="flex items-center gap-2 font-medium">Number of collaborators</div>
                  <div className="text-muted-foreground text-sm">
                    More collaborators are better for privacy, but also increase transaction fees.
                  </div>
                </Label>
                <span className="text-foreground">
                  {formWatch.minNumberOfCollaborators} - {formWatch.maxNumberOfCollaborators}
                </span>
              </div>
              <Slider
                id="slider-min-max-maker"
                min={MIN_MIN_NUMBER_OF_COLLABORATORS}
                max={MAX_MAX_NUMBER_OF_COLLABORATORS}
                minStepsBetweenThumbs={1}
                value={[
                  formWatch.minNumberOfCollaborators ??
                    defaultValues?.minNumberOfCollaborators ??
                    MIN_MIN_NUMBER_OF_COLLABORATORS,
                  formWatch.maxNumberOfCollaborators ??
                    defaultValues?.maxNumberOfCollaborators ??
                    MAX_MAX_NUMBER_OF_COLLABORATORS,
                ]}
                onValueChange={(values: number[]) => {
                  setValue('minNumberOfCollaborators', values[0])
                  setValue('maxNumberOfCollaborators', values[1])
                }}
                disabled={disabled}
              />
            </div>
            <div className="flex flex-col justify-center gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="slider-min-number-of-transactions-per-jar" className="flex flex-col items-start gap-0">
                  {/* TODO: i18n */}
                  <div className="flex items-center gap-2 font-medium">Transactions per Jar</div>
                  <div className="text-muted-foreground text-sm">
                    Minimum number of collaborative transactions per Jar.
                  </div>
                </Label>
                <span className="text-foreground">{formWatch.minNumberOfTransactionsPerJar}</span>
              </div>
              <Slider
                id="slider-min-number-of-transactions-per-jar"
                min={2}
                max={8}
                value={
                  formWatch.minNumberOfTransactionsPerJar === undefined
                    ? undefined
                    : [formWatch.minNumberOfTransactionsPerJar]
                }
                onValueChange={(values: number[]) => setValue('minNumberOfTransactionsPerJar', values[0])}
                disabled={disabled}
              />
            </div>
            <div className="flex flex-col justify-center gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="slider-rounding-chance-in-percent" className="flex flex-col items-start gap-0">
                  {/* TODO: i18n */}
                  <div className="flex items-center gap-2 font-medium">Round amount probability</div>
                  <div className="text-muted-foreground text-sm">
                    Probability that an intermediate transaction output amount is rounded to mimic human behavior.
                  </div>
                </Label>
                <span className="text-foreground">{formWatch.roundingChanceInPercent}%</span>
              </div>
              <Slider
                id="slider-rounding-chance-in-percent"
                min={factorToPercentage(MIN_ROUNDING_CHANCE_FACTOR)}
                max={factorToPercentage(MAX_ROUNDING_CHANCE_FACTOR)}
                value={
                  formWatch.roundingChanceInPercent === undefined ? undefined : [formWatch.roundingChanceInPercent]
                }
                onValueChange={(values: number[]) => setValue('roundingChanceInPercent', values[0])}
                disabled={disabled}
              />
            </div>
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
