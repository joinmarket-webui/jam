import { useMemo } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import * as rb from 'react-bootstrap'
import Sprite from './Sprite'
import Balance from './Balance'
import { useSettings } from '../context/SettingsContext'
import { estimateMaxCollaboratorFee, FeeValues, toTxFeeValueUnit } from '../hooks/Fees'

import { isValidNumber } from '../utils'
import { ConfirmModal, ConfirmModalProps } from './Modal'

import styles from './PaymentConfirmModal.module.css'
import { AmountSats } from '../libs/JmWalletApi'
import { jarInitial } from './jars/Jar'

interface PaymentDisplayInfo {
  sourceJarIndex?: JarIndex
  destination: String
  amount: AmountSats
  isSweep: boolean
  isCoinjoin: boolean
  numCollaborators?: number
  feeConfigValues?: FeeValues
}

interface PaymentConfirmModalProps extends ConfirmModalProps {
  data: PaymentDisplayInfo
}

export function PaymentConfirmModal({
  data: { sourceJarIndex, destination, amount, isSweep, isCoinjoin, numCollaborators, feeConfigValues },
  ...confirmModalProps
}: PaymentConfirmModalProps) {
  const { t } = useTranslation()
  const settings = useSettings()

  const estimatedMaxCollaboratorFee = useMemo(() => {
    if (!isCoinjoin || !feeConfigValues) return null
    if (!isValidNumber(amount) || !isValidNumber(numCollaborators)) return null
    if (!isValidNumber(feeConfigValues.max_cj_fee_abs) || !isValidNumber(feeConfigValues.max_cj_fee_rel)) return null
    return estimateMaxCollaboratorFee({
      amount,
      collaborators: numCollaborators!,
      maxFeeAbs: feeConfigValues.max_cj_fee_abs!,
      maxFeeRel: feeConfigValues.max_cj_fee_rel!,
    })
  }, [amount, isCoinjoin, numCollaborators, feeConfigValues])

  const miningFeeText = useMemo(() => {
    if (!feeConfigValues) return null
    if (!isValidNumber(feeConfigValues.tx_fees) || !isValidNumber(feeConfigValues.tx_fees_factor)) return null

    const unit = toTxFeeValueUnit(feeConfigValues.tx_fees)
    if (!unit) {
      return null
    } else if (unit === 'blocks') {
      return t('send.confirm_send_modal.text_miner_fee_in_targeted_blocks', { count: feeConfigValues.tx_fees })
    } else {
      const feeTargetInSatsPerVByte = feeConfigValues.tx_fees! / 1_000
      if (feeConfigValues.tx_fees_factor === 0) {
        return t('send.confirm_send_modal.text_miner_fee_in_satspervbyte_exact', {
          value: feeTargetInSatsPerVByte.toLocaleString(undefined, {
            maximumFractionDigits: Math.log10(1_000),
          }),
        })
      }

      const minFeeSatsPerVByte = Math.max(1, feeTargetInSatsPerVByte * (1 - feeConfigValues.tx_fees_factor!))
      const maxFeeSatsPerVByte = feeTargetInSatsPerVByte * (1 + feeConfigValues.tx_fees_factor!)

      return t('send.confirm_send_modal.text_miner_fee_in_satspervbyte_randomized', {
        min: minFeeSatsPerVByte.toLocaleString(undefined, {
          maximumFractionDigits: 1,
        }),
        max: maxFeeSatsPerVByte.toLocaleString(undefined, {
          maximumFractionDigits: 1,
        }),
      })
    }
  }, [t, feeConfigValues])

  return (
    <ConfirmModal {...confirmModalProps}>
      <rb.Container className="mt-2">
        <rb.Row className="mt-2 mb-3">
          <rb.Col xs={12} className="text-center">
            {isCoinjoin ? (
              <strong className="text-success">{t('send.confirm_send_modal.text_collaborative_tx_enabled')}</strong>
            ) : (
              <strong className="text-danger">{t('send.confirm_send_modal.text_collaborative_tx_disabled')}</strong>
            )}
          </rb.Col>
        </rb.Row>
        {sourceJarIndex !== undefined && (
          <rb.Row>
            <rb.Col xs={4} md={3} className="text-end">
              <strong>{t('send.confirm_send_modal.label_source_jar')}</strong>
            </rb.Col>
            <rb.Col xs={8} md={9} className="text-start">
              {t('send.confirm_send_modal.text_source_jar', { jarId: jarInitial(sourceJarIndex) })}
            </rb.Col>
          </rb.Row>
        )}
        <rb.Row>
          <rb.Col xs={4} md={3} className="text-end">
            <strong>{t('send.confirm_send_modal.label_recipient')}</strong>
          </rb.Col>
          <rb.Col xs={8} md={9} className="text-start text-break slashed-zeroes">
            {destination}
          </rb.Col>
        </rb.Row>
        <rb.Row>
          <rb.Col xs={4} md={3} className="text-end">
            <strong>{t('send.confirm_send_modal.label_amount')}</strong>
          </rb.Col>
          <rb.Col xs={8} md={9} className="text-start">
            {isSweep ? (
              <>
                <Trans i18nKey="send.confirm_send_modal.text_sweep_balance">
                  Sweep
                  <Balance valueString={String(amount)} convertToUnit={settings.unit} showBalance={true} />
                </Trans>
                <rb.OverlayTrigger
                  placement="right"
                  overlay={
                    <rb.Popover>
                      <rb.Popover.Body>{t('send.confirm_send_modal.text_sweep_info_popover')}</rb.Popover.Body>
                    </rb.Popover>
                  }
                >
                  <div className="d-inline-flex align-items-center">
                    <Sprite className={styles.infoIcon} symbol="info" width="13" height="13" />
                  </div>
                </rb.OverlayTrigger>
              </>
            ) : (
              <Balance valueString={String(amount)} convertToUnit={settings.unit} showBalance={true} />
            )}
          </rb.Col>
        </rb.Row>

        {miningFeeText && (
          <rb.Row>
            <rb.Col xs={4} md={3} className="text-end">
              <strong>{t('send.confirm_send_modal.label_miner_fee')}</strong>
            </rb.Col>
            <rb.Col xs={8} md={9} className="text-start">
              {miningFeeText}
            </rb.Col>
          </rb.Row>
        )}
        {isCoinjoin && (
          <rb.Row>
            <rb.Col xs={4} md={3} className="text-end">
              <strong>{t('send.confirm_send_modal.label_num_collaborators')}</strong>
            </rb.Col>
            <rb.Col xs={8} md={9} className="text-start">
              {numCollaborators}
            </rb.Col>
          </rb.Row>
        )}
        {estimatedMaxCollaboratorFee && (
          <rb.Row>
            <rb.Col xs={4} md={3} className="text-end">
              <strong>{t('send.confirm_send_modal.label_estimated_max_collaborator_fee')}</strong>
            </rb.Col>
            <rb.Col xs={8} md={9} className="d-inline-flex align-items-center text-start">
              <div>
                &le;
                <Balance
                  valueString={`${estimatedMaxCollaboratorFee}`}
                  convertToUnit={settings.unit}
                  showBalance={true}
                />
                <rb.OverlayTrigger
                  placement="right"
                  overlay={
                    <rb.Popover>
                      <rb.Popover.Body>
                        {t('send.confirm_send_modal.text_estimated_max_collaborator_fee_info_popover')}
                      </rb.Popover.Body>
                    </rb.Popover>
                  }
                >
                  <div className="d-inline-flex align-items-center">
                    <Sprite className={styles.infoIcon} symbol="info" width="13" height="13" />
                  </div>
                </rb.OverlayTrigger>
              </div>
            </rb.Col>
          </rb.Row>
        )}
      </rb.Container>
    </ConfirmModal>
  )
}
