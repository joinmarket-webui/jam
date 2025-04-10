import { PropsWithChildren, useMemo, useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import * as rb from 'react-bootstrap'
import Sprite from './Sprite'
import Balance from './Balance'
import { Settings, useSettings } from '../context/SettingsContext'
import { FeeValues, TxFee, useEstimatedMaxCollaboratorFee } from '../hooks/Fees'
import { ConfirmModal, ConfirmModalProps } from './Modal'
import { AmountSats, BitcoinAddress } from '../libs/JmWalletApi'
import { jarInitial } from './jars/Jar'
import { isValidNumber } from '../utils'
import styles from './PaymentConfirmModal.module.css'
import { Utxos, WalletInfo } from '../context/WalletContext'
import { UtxoListDisplay } from './Send/ShowUtxos'
import Divider from './Divider'
import Accordion from './Accordion'
import { SelectJar } from './fb/FidelityBondSteps'

const feeRange: (txFee: TxFee, txFeeFactor: number) => [number, number] = (txFee, txFeeFactor) => {
  if (txFee.unit !== 'sats/kilo-vbyte') {
    throw new Error('This function can only be used with unit `sats/kilo-vbyte`')
  }
  const feeTargetInSatsPerVByte = txFee.value! / 1_000
  const minFeeSatsPerVByte = Math.max(1, feeTargetInSatsPerVByte)
  const maxFeeSatsPerVByte = feeTargetInSatsPerVByte * (1 + txFeeFactor)
  return [minFeeSatsPerVByte, maxFeeSatsPerVByte]
}

const useMiningFeeText = ({ tx_fees, tx_fees_factor }: Pick<FeeValues, 'tx_fees' | 'tx_fees_factor'>) => {
  const { t } = useTranslation()

  return useMemo(() => {
    if (!isValidNumber(tx_fees?.value) || !isValidNumber(tx_fees_factor)) return null

    if (!tx_fees?.unit) {
      return null
    } else if (tx_fees.unit === 'blocks') {
      return t('send.confirm_send_modal.text_miner_fee_in_targeted_blocks', { count: tx_fees.value })
    } else {
      const [minFeeSatsPerVByte, maxFeeSatsPerVByte] = feeRange(tx_fees, tx_fees_factor!)
      const fractionDigits = 2

      if (minFeeSatsPerVByte.toFixed(fractionDigits) === maxFeeSatsPerVByte.toFixed(fractionDigits)) {
        return t('send.confirm_send_modal.text_miner_fee_in_satspervbyte_exact', {
          value: minFeeSatsPerVByte.toLocaleString(undefined, {
            maximumFractionDigits: Math.log10(1_000),
          }),
        })
      }

      return t('send.confirm_send_modal.text_miner_fee_in_satspervbyte_randomized', {
        min: minFeeSatsPerVByte.toLocaleString(undefined, {
          maximumFractionDigits: fractionDigits,
        }),
        max: maxFeeSatsPerVByte.toLocaleString(undefined, {
          maximumFractionDigits: fractionDigits,
        }),
      })
    }
  }, [t, tx_fees, tx_fees_factor])
}

type ReviewUtxosProps = Required<Pick<PaymentDisplayInfo, 'isSweep' | 'availableUtxos'>> & {
  settings: Settings
}

const ReviewUtxos = ({ settings, availableUtxos, isSweep }: ReviewUtxosProps) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState<boolean>(availableUtxos.length === 1)

  const allUtxosAreUsed = isSweep || availableUtxos.length === 1
  return (
    <rb.Row className="mt-2">
      <rb.Col xs={4} md={3} className="d-flex align-items-center justify-content-end text-end">
        <strong>
          {allUtxosAreUsed
            ? t('send.confirm_send_modal.label_selected_utxos', { count: availableUtxos.length })
            : t('send.confirm_send_modal.label_eligible_utxos')}
        </strong>
      </rb.Col>
      <rb.Col xs={8} md={9}>
        <Divider toggled={isOpen} onToggle={() => setIsOpen((current) => !current)} />
      </rb.Col>
      <rb.Collapse in={isOpen}>
        <rb.Col xs={12}>
          <div className="my-2 text-start text-secondary">
            {allUtxosAreUsed
              ? t('send.confirm_send_modal.description_selected_utxos', { count: availableUtxos.length })
              : t('send.confirm_send_modal.description_eligible_utxos')}
          </div>
          <UtxoListDisplay
            utxos={availableUtxos.map((it) => ({ ...it, checked: false, selectable: false }))}
            settings={settings}
            onToggle={() => {
              // No-op since these UTXOs are only for review and are not selectable
            }}
          />
        </rb.Col>
      </rb.Collapse>
    </rb.Row>
  )
}

interface PaymentDisplayInfo {
  sourceJarIndex?: JarIndex
  destination: BitcoinAddress | string
  amount: AmountSats
  isSweep: boolean
  isCoinjoin: boolean
  numCollaborators?: number
  feeConfigValues?: FeeValues
  showPrivacyInfo?: boolean
  availableUtxos?: Utxos
  walletInfo?: WalletInfo
  selectedDestinationJarIndex?: JarIndex
  setSelectedDestinationJarIndex?: (jarIndex: JarIndex) => void
}

interface PaymentConfirmModalProps extends ConfirmModalProps {
  data: PaymentDisplayInfo
}

export function PaymentConfirmModal({
  data: {
    sourceJarIndex,
    destination,
    amount,
    isSweep,
    isCoinjoin,
    numCollaborators,
    feeConfigValues,
    showPrivacyInfo = true,
    availableUtxos = [],
    walletInfo,
    selectedDestinationJarIndex,
    setSelectedDestinationJarIndex,
  },
  children,
  ...confirmModalProps
}: PropsWithChildren<PaymentConfirmModalProps>) {
  const { t } = useTranslation()
  const settings = useSettings()

  const miningFeeText = useMiningFeeText({ ...feeConfigValues })
  const estimatedMaxCollaboratorFee = useEstimatedMaxCollaboratorFee({
    isCoinjoin,
    feeConfigValues,
    amount,
    numCollaborators: numCollaborators || null,
  })

  return (
    <ConfirmModal {...confirmModalProps}>
      <rb.Container className="mt-2" fluid>
        {showPrivacyInfo && (
          <rb.Row className="mt-2 mb-3">
            <rb.Col xs={12} className="text-center">
              {isCoinjoin ? (
                <strong className="text-success">{t('send.confirm_send_modal.text_collaborative_tx_enabled')}</strong>
              ) : (
                <strong className="text-danger">{t('send.confirm_send_modal.text_collaborative_tx_disabled')}</strong>
              )}
            </rb.Col>
          </rb.Row>
        )}
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
        {availableUtxos.length > 0 && (
          <ReviewUtxos settings={settings} availableUtxos={availableUtxos} isSweep={isSweep} />
        )}
        {children && (
          <rb.Row>
            <rb.Col xs={12}>{children}</rb.Col>
          </rb.Row>
        )}
        {walletInfo && (
          <div className="border-top mt-2">
            <Accordion title={t('earn.button_settings')}>
              <SelectJar
                description={t('earn.fidelity_bond.move.select_jar.description')}
                accountBalances={walletInfo!.balanceSummary.accountBalances}
                totalBalance={walletInfo!.balanceSummary.calculatedAvailableBalanceInSats}
                isJarSelectable={() => true}
                selectedJar={selectedDestinationJarIndex}
                onJarSelected={setSelectedDestinationJarIndex || (() => {})}
              />
            </Accordion>
          </div>
        )}
      </rb.Container>
    </ConfirmModal>
  )
}
