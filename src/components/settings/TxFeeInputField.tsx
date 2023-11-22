import { useState } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { FieldProps } from 'formik'
import { TxFeeValueUnit, toTxFeeValueUnit, TxFee } from '../../hooks/Fees'
import { isValidNumber } from '../../utils'
import Sprite from '../Sprite'
import SegmentedTabs from '../SegmentedTabs'

type SatsPerKiloVByte = number

const TX_FEES_BLOCKS_MIN = 1
const TX_FEES_BLOCKS_MAX = 1_000

/**
 * When the fee target is low, JM sometimes constructs transactions, which are
 * declined from being relayed. In order to mitigate such situations, the
 * minimum fee target (when provided in sats/vbyte) must be higher than
 * 1 sats/vbyte, till the problem is addressed. Once resolved, this
 * can be lowered to 1 sats/vbyte again.
 * See https://github.com/JoinMarket-Org/joinmarket-clientserver/issues/1360#issuecomment-1262295463
 * Last checked on 2022-10-06.
 */
const TX_FEES_SATSPERKILOVBYTE_MIN: SatsPerKiloVByte = 1_000 // 1 sat/vbyte
// 350 sats/vbyte - no enforcement by JM - this should be a "sane" max value (taken default value of "absurd_fee_per_kb")
const TX_FEES_SATSPERKILOVBYTE_MAX: SatsPerKiloVByte = 350_000

type TxFeeInputFieldProps = FieldProps<TxFee> & {
  label: string
}

const TxFeeInputField = ({ field, form, label }: TxFeeInputFieldProps) => {
  const { t } = useTranslation()
  const [txFeesUnit, setTxFeesUnit] = useState<TxFeeValueUnit>(toTxFeeValueUnit(field.value.value) || 'blocks')

  return (
    <>
      <rb.Form.Label>{label}</rb.Form.Label>
      {txFeesUnit && (
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
              setTxFeesUnit(unit)

              if (field.value) {
                if (unit === 'sats/kilo-vbyte') {
                  form.setFieldValue(
                    field.name,
                    {
                      value: Math.round(field.value.value * 1_000),
                      unit,
                    },
                    false,
                  )
                } else {
                  form.setFieldValue(
                    field.name,
                    {
                      value: Math.round(field.value.value / 1_000),
                      unit,
                    },
                    false,
                  )
                }
              }
              setTimeout(() => form.validateForm(), 4)
            }}
            initialValue={txFeesUnit}
            disabled={form.isSubmitting}
          />
        </rb.Form.Group>
      )}
      <rb.Form.Text className="d-block mb-2">
        {t(
          txFeesUnit === 'sats/kilo-vbyte'
            ? 'settings.fees.description_tx_fees_satspervbyte'
            : 'settings.fees.description_tx_fees_blocks',
        )}
      </rb.Form.Text>
      <rb.Form.Group controlId="tx_fees" className="mb-4">
        <rb.InputGroup hasValidation>
          <rb.InputGroup.Text id="txFees-addon1">
            {txFeesUnit === 'sats/kilo-vbyte' ? (
              <>
                <Sprite symbol="sats" width="24" height="24" />/ vB
              </>
            ) : (
              <Sprite symbol="block" width="24" height="24" name="Block" />
            )}
          </rb.InputGroup.Text>

          {txFeesUnit === 'sats/kilo-vbyte' ? (
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
                  {
                    value: Math.round(value * 1_000),
                    unit: 'sats/kilo-vbyte',
                  },
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
              aria-label={t('settings.fees.label_tx_fees')}
              className={`slashed-zeroes`}
              name={field.name}
              type="number"
              placeholder="1"
              value={isValidNumber(field.value.value) ? field.value.value : ''}
              disabled={form.isSubmitting}
              onBlur={field.onBlur}
              onChange={(e) => {
                const value = parseInt(e.target.value, 10)
                form.setFieldValue(
                  field.name,
                  {
                    value,
                    unit: 'blocks',
                  },
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

export default TxFeeInputField
