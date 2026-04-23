import { useId } from 'react'
import { BlocksIcon } from 'lucide-react'
import { useFormContext, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { txFeeUnit, type TxFeeUnit } from '@/constants/jm'
import { cn } from '@/lib/utils'
import { Field, FieldDescription, FieldLabel } from '../ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group'
import { CurrencySymbol } from '../ui/jam/CurrencySymbol'
import { Label } from '../ui/label'
import { RadioGroup, RadioGroupItem } from '../ui/radio-group'
import { Tabs, TabsContent } from '../ui/tabs'
import {
  MAX_TX_FEE_IN_BLOCKS,
  MAX_TX_FEE_IN_SATS_PER_VBYTE,
  MIN_TX_FEE_IN_BLOCKS,
  MIN_TX_FEE_IN_SATS_PER_VBYTE,
  type TxFeeFormValues,
} from './TxFeeForm.schema'

const TxFeeUnitInput = (props: React.ComponentProps<typeof RadioGroup>) => {
  const { t } = useTranslation()
  const id = useId()

  return (
    <RadioGroup className="flex items-center justify-center" {...props}>
      <div className="border-input has-data-[state=checked]:border-primary/50 has-data-[state=checked]:border-primary/50 has-data-[state=checked]:ring-primary/20 relative flex w-full max-w-50 cursor-pointer flex-col items-center gap-3 rounded-md border p-4 shadow-xs outline-none has-data-[state=checked]:ring-[2px]">
        <RadioGroupItem
          value={txFeeUnit.BLOCKS}
          id={`${id}-blocks`}
          className="order-1 size-5 cursor-pointer after:absolute after:inset-0 [&_svg]:size-3"
        />
        <div className="grid grow justify-items-center gap-2">
          <BlocksIcon />
          <Label htmlFor={`${id}-blocks`} className="justify-center">
            {t('settings.fees.radio_tx_fees_blocks')}
          </Label>
        </div>
      </div>
      <div className="border-input has-data-[state=checked]:border-primary/50 has-data-[state=checked]:ring-primary/20 relative flex w-full max-w-50 flex-col items-center gap-3 rounded-md border p-4 shadow-xs outline-none has-data-[state=checked]:ring-[2px]">
        <RadioGroupItem
          value={txFeeUnit.SATS_PER_KILO_VBYTE}
          id={`${id}-satsperkvb`}
          className="order-1 size-5 cursor-pointer after:absolute after:inset-0 [&_svg]:size-3"
        />
        <div className="grid grow justify-items-center gap-2">
          <CurrencySymbol currency="sats" className="size-[1.75em]" />
          <Label htmlFor={`${id}-satsperkvb`} className="justify-center">
            {t('settings.fees.radio_tx_fees_satspervbyte')}
          </Label>
        </div>
      </div>
    </RadioGroup>
  )
}

interface TxFeeFormProps {
  className?: string
}

export function TxFeeForm({ className }: TxFeeFormProps) {
  const { t } = useTranslation()

  const {
    register,
    control,
    setValue,
    formState: { errors, disabled, defaultValues },
  } = useFormContext<TxFeeFormValues>()

  const txFeeUnitWatch = useWatch({ control, name: 'txFee.txFeeUnit' })

  return (
    <>
      <div className={cn('flex flex-col gap-4', className)}>
        <Tabs value={txFeeUnitWatch}>
          <TabsContent value={txFeeUnit.BLOCKS}>
            <div className="space-y-2">
              <Field data-invalid={errors.txFee?.txFeeInBlocks !== undefined}>
                <FieldLabel htmlFor="txFeeInBlocks">{t('send.label_tx_fees')}</FieldLabel>
                <FieldDescription>{t('settings.fees.description_tx_fees_blocks')}</FieldDescription>
                <InputGroup>
                  <InputGroupInput
                    id="txFeeInBlocks"
                    {...register('txFee.txFeeInBlocks', {
                      disabled,
                      valueAsNumber: true,
                    })}
                    type="number"
                    min={MIN_TX_FEE_IN_BLOCKS}
                    max={MAX_TX_FEE_IN_BLOCKS}
                    step={1}
                  />
                  <InputGroupAddon align="inline-start">
                    <BlocksIcon />
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              {errors.txFee?.txFeeInBlocks?.message && (
                <div className="text-destructive text-xs">{errors.txFee.txFeeInBlocks.message}</div>
              )}
            </div>
          </TabsContent>
          <TabsContent value={txFeeUnit.SATS_PER_KILO_VBYTE}>
            <div className="space-y-2">
              <Field data-invalid={errors.txFee?.txFeeInSatsPerVbyte !== undefined}>
                <FieldLabel htmlFor="txFeeInSatsPerVbyte">{t('send.label_tx_fees')}</FieldLabel>
                <FieldDescription>{t('settings.fees.description_tx_fees_satspervbyte')}</FieldDescription>
                <InputGroup>
                  <InputGroupInput
                    id="txFeeInSatsPerVbyte"
                    {...register('txFee.txFeeInSatsPerVbyte', {
                      disabled,
                      valueAsNumber: true,
                    })}
                    type="number"
                    min={MIN_TX_FEE_IN_SATS_PER_VBYTE}
                    max={MAX_TX_FEE_IN_SATS_PER_VBYTE}
                    step={1}
                  />
                  <InputGroupAddon align="inline-start" className="mr-1 gap-0.5">
                    <CurrencySymbol currency="sats" />
                    <span className="text-xs text-nowrap">/&nbsp;vB</span>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
              {errors.txFee?.txFeeInSatsPerVbyte?.message && (
                <div className="text-destructive text-xs">{errors.txFee.txFeeInSatsPerVbyte.message}</div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="space-y-2">
          <Field data-invalid={errors.txFee?.txFeeUnit !== undefined}>
            <TxFeeUnitInput
              {...register('txFee.txFeeUnit', {
                disabled,
              })}
              defaultValue={defaultValues?.txFee?.txFeeUnit}
              onValueChange={(value) => {
                setValue('txFee.txFeeUnit', value as TxFeeUnit, {
                  shouldValidate: true, // trigger validation
                  shouldTouch: true, // update touched fields form state
                  shouldDirty: true, // update dirty and dirty fields form state
                })
              }}
            />
          </Field>
          {errors.txFee?.txFeeUnit?.message && (
            <div className="text-destructive text-xs">{errors.txFee.txFeeUnit.message}</div>
          )}
        </div>
      </div>
    </>
  )
}
