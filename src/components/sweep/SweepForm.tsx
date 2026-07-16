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
} from '@/components/sweep/SweepFormSchema'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { isDebugFeatureEnabled } from '@/constants/debugFeatures'
import type { AddressSummary } from '@/context/JamWalletInfoContext'
import { cn } from '@/lib/utils'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'
import { Slider } from '../ui/slider'
import { Spinner } from '../ui/spinner'

const DESTINATION_ADDRESS_COUNT_PROD = 3

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
  addressSummary: AddressSummary
  disabled?: boolean
  debug?: boolean
}

export const SweepForm = ({ className, onSubmit, addressSummary, disabled, debug }: SweepFormProps) => {
  const { t } = useTranslation()

  const showInsecureScheduleTestingToggle = debug && isDebugFeatureEnabled('insecureScheduleTesting')

  const schema = useMemo(() => sweepFormSchema(addressSummary, t), [addressSummary, t])
  const initialDestinations = useMemo(() => buildSweepDestinationValues(DESTINATION_ADDRESS_COUNT_PROD), [])
  const { formState, register, control, setValue, handleSubmit, trigger } = useForm<
    SweepFormValues,
    SweepResolverContext,
    SweepFormValues
  >({
    mode: 'onSubmit',
    defaultValues: {
      destinations: initialDestinations,
      includeMakerSessions: true,
      roundingChanceInPercent: 25,
    },
    resolver: yupResolver(schema),
  })

  const formWatch = useWatch({ control })
  const destinationsFieldArray = useFieldArray({ control, name: 'destinations' })

  const onInsecureTestingToggleChange = (checked: boolean) => {
    setValue('useInsecureTestingSettings', checked)

    if (checked) {
      destinationsFieldArray.replace([{ address: getNewTestingDestinationAddress(addressSummary) }])
      void trigger('destinations')
    } else {
      destinationsFieldArray.replace(buildSweepDestinationValues(DESTINATION_ADDRESS_COUNT_PROD))
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
        minNumberOfFields={formWatch.useInsecureTestingSettings ? 1 : DESTINATION_ADDRESS_COUNT_PROD}
        register={register}
        setValue={setValue}
        formState={formState}
        fields={destinationsFieldArray.fields}
        disabled={disabled}
        onClickAppend={() => {
          destinationsFieldArray.append([{ address: '' }], { shouldFocus: false })
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
            className={cn('flex flex-col gap-6', 'mx-1' /* add x-spacing for input component focus state*/)}
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
                <Label htmlFor="slider-rounding-chance-in-percent" className="flex flex-col items-start gap-0">
                  {/* TODO: i18n */}
                  <div className="flex items-center gap-2 font-medium">Round output amount probability</div>
                  <div className="text-muted-foreground text-sm">
                    Probability that an intermediate transaction output amount is rounded to mimic human behavior.
                  </div>
                </Label>
                <span className="text-foreground">{formWatch.roundingChanceInPercent}%</span>
              </div>
              <Slider
                id="slider-rounding-chance-in-percent"
                min={0}
                max={100}
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
            {t('scheduler.button_start')}
          </>
        ) : (
          t('scheduler.button_start')
        )}
      </Button>
    </form>
  )
}
