import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { TFunction } from 'i18next'
import { FieldProps, FormikErrors } from 'formik'
import { TxFeeValueUnit, TxFee } from '../../hooks/Fees'
import { isValidNumber } from '../../utils'
import Sprite from '../Sprite'
import SegmentedTabs from '../SegmentedTabs'

type SatsPerKiloVByte = number

const TX_FEES_BLOCKS_MIN = 1
const TX_FEES_BLOCKS_MAX = 1_000

const TX_FEES_SATSPERKILOVBYTE_MIN: SatsPerKiloVByte = 1_001 // actual min of `tx_fees` if unit is sats/kilo-vbyte
// 350 sats/vbyte - no enforcement by JM - this should be a "sane" max value (taken default value of "absurd_fee_per_kb")
const TX_FEES_SATSPERKILOVBYTE_MAX: SatsPerKiloVByte = 350_000

const adjustTxFees = (val: TxFee) => {
  if (val.unit === 'sats/kilo-vbyte') {
    // There is one special case for value `tx_fees`:
    // Users are allowed to specify the value in "sats/vbyte", but this might
    // be interpreted by JM as "targeted blocks". This adaption makes sure
    // that it is in fact closer to what the user actually expects, albeit it
    // can be surprising that the value is slightly different as specified.
    return {
      ...val,
      value: Math.max(val.value, TX_FEES_SATSPERKILOVBYTE_MIN),
    }
  }
  return val
}

export const validateTxFee = (val: TxFee | undefined, t: TFunction): FormikErrors<TxFee> => {
  const errors = {} as FormikErrors<TxFee>

  if (val?.unit === 'sats/kilo-vbyte') {
    if (
      !isValidNumber(val.value) ||
      val.value < TX_FEES_SATSPERKILOVBYTE_MIN ||
      val.value > TX_FEES_SATSPERKILOVBYTE_MAX
    ) {
      errors.value = t('settings.fees.feedback_invalid_tx_fees_satspervbyte', {
        min: (TX_FEES_SATSPERKILOVBYTE_MIN / 1_000).toLocaleString(undefined, {
          maximumFractionDigits: Math.log10(1_000),
        }),
        max: (TX_FEES_SATSPERKILOVBYTE_MAX / 1_000).toLocaleString(undefined, {
          maximumFractionDigits: Math.log10(1_000),
        }),
      })
    }
  } else {
    if (!isValidNumber(val?.value) || val?.value! < TX_FEES_BLOCKS_MIN || val?.value! > TX_FEES_BLOCKS_MAX) {
      errors.value = t('settings.fees.feedback_invalid_tx_fees_blocks', {
        min: TX_FEES_BLOCKS_MIN.toLocaleString(),
        max: TX_FEES_BLOCKS_MAX.toLocaleString(),
      })
    }
  }

  return errors
}

type TxFeeInputFieldProps = FieldProps<TxFee | undefined> & {
  label: string
}

export const TxFeeInputField = ({ field, form, label }: TxFeeInputFieldProps) => {
  const { t } = useTranslation()

  return (
    <>
      <rb.Form.Label>{label}</rb.Form.Label>

      <rb.Form.Group className="my-2 d-flex justify-content-center" controlId="offertype">
        <SegmentedTabs
          name="txFeesUnit"
          tabs={[
            {
              label: t('settings.fees.radio_tx_fees_blocks'),
              value: 'blocks',
            },
            {
              label: t('settings.fees.radio_tx_fees_satspervbyte'),
              value: 'sats/kilo-vbyte',
            },
          ]}
          onChange={(tab) => {
            const unit = tab.value as TxFeeValueUnit

            if (field.value) {
              if (unit === 'sats/kilo-vbyte') {
                form.setFieldValue(
                  field.name,
                  adjustTxFees({
                    value: Math.round(field.value.value * 1_000),
                    unit,
                  }),
                  true,
                )
              } else {
                form.setFieldValue(
                  field.name,
                  adjustTxFees({
                    value: Math.round(field.value.value / 1_000),
                    unit,
                  }),
                  true,
                )
              }
            }
          }}
          initialValue={field.value?.unit || 'blocks'}
          disabled={form.isSubmitting}
        />
      </rb.Form.Group>
      <rb.Form.Text className="d-block mb-2">
        {t(
          field.value?.unit === 'sats/kilo-vbyte'
            ? 'settings.fees.description_tx_fees_satspervbyte'
            : 'settings.fees.description_tx_fees_blocks',
        )}
      </rb.Form.Text>
      <rb.Form.Group controlId="tx_fees" className="mb-4">
        <rb.InputGroup hasValidation>
          <rb.InputGroup.Text id="txFees-addon1">
            {field.value?.unit === 'sats/kilo-vbyte' ? (
              <>
                <Sprite symbol="sats" width="24" height="24" />/ vB
              </>
            ) : (
              <Sprite symbol="block" width="24" height="24" name="Block" />
            )}
          </rb.InputGroup.Text>

          {field.value?.unit === 'sats/kilo-vbyte' ? (
            <rb.Form.Control
              aria-label={label}
              className={`slashed-zeroes`}
              name={field.name}
              type="number"
              placeholder="1"
              value={isValidNumber(field.value.value) ? field.value.value! / 1_000 : ''}
              disabled={form.isSubmitting}
              onBlur={field.onBlur}
              onChange={(e) => {
                const value = parseFloat(e.target.value)
                form.setFieldValue(
                  field.name,
                  adjustTxFees({
                    value: Math.round(value * 1_000),
                    unit: 'sats/kilo-vbyte',
                  }),
                  true,
                )
              }}
              isValid={form.touched[field.name] && !form.errors[field.name]}
              isInvalid={form.touched[field.name] && !!form.errors[field.name]}
              min={TX_FEES_SATSPERKILOVBYTE_MIN / 1_000}
              max={TX_FEES_SATSPERKILOVBYTE_MAX / 1_000}
              step={0.001}
            />
          ) : (
            <rb.Form.Control
              aria-label={label}
              className={`slashed-zeroes`}
              name={field.name}
              type="number"
              placeholder="1"
              value={isValidNumber(field.value?.value) ? field.value?.value : ''}
              disabled={form.isSubmitting}
              onBlur={field.onBlur}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10)
                form.setFieldValue(
                  field.name,
                  adjustTxFees({
                    value,
                    unit: 'blocks',
                  }),
                  true,
                )
              }}
              isValid={form.touched[field.name] && !form.errors[field.name]}
              isInvalid={form.touched[field.name] && !!form.errors[field.name]}
              min={TX_FEES_BLOCKS_MIN}
              max={TX_FEES_BLOCKS_MAX}
              step={1}
            />
          )}
          <rb.Form.Control.Feedback type="invalid">{form.errors[field.name]}</rb.Form.Control.Feedback>
        </rb.InputGroup>
      </rb.Form.Group>
    </>
  )
}
