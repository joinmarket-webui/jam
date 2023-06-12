import { PropsWithChildren } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { useEstimatedMaxCollaboratorFee, useFeeConfigValues, useMiningFeeText } from '../../hooks/Fees'
import Balance from '../Balance'
import * as rb from 'react-bootstrap'
import Sprite from '../Sprite'
import { useSettings } from '../../context/SettingsContext'

interface FeeBreakdownProps {
  numCollaborators: number | null
  amount: number | null
  isCoinjoin: boolean
}

const FeeBreakdown = ({ numCollaborators, amount, isCoinjoin }: PropsWithChildren<FeeBreakdownProps>) => {
  const { t } = useTranslation()
  const feesConfig = useFeeConfigValues()
  const maxCjRelativeFee = feesConfig?.max_cj_fee_rel
    ? `${feesConfig.max_cj_fee_rel * 100}%`
    : t('send.fee_breakdown.not_set')

  const maxEstimatedRelativeFee =
    feesConfig?.max_cj_fee_rel && numCollaborators && amount
      ? amount * feesConfig.max_cj_fee_rel * numCollaborators >= 1
        ? Math.ceil(amount * feesConfig.max_cj_fee_rel) * numCollaborators
        : null
      : null

  const maxCjAbsoluteFee = feesConfig?.max_cj_fee_abs
    ? feesConfig?.max_cj_fee_abs.toString()
    : t('send.fee_breakdown.not_set')
  const maxEstimatedAbsoluteFee =
    feesConfig?.max_cj_fee_abs && numCollaborators ? feesConfig.max_cj_fee_abs * numCollaborators : null

  const miningFeeText = useMiningFeeText()
  const estimatedMaxCollaboratorFee = useEstimatedMaxCollaboratorFee({ amount, numCollaborators, isCoinjoin })
  const settings = useSettings()

  return (
    <div>
      {maxEstimatedAbsoluteFee && (
        <div className="d-flex justify-content-between text-secondary">
          <div>
            <Trans
              i18nKey="send.fee_breakdown.absolute_limit"
              components={{
                balance: <Balance convertToUnit="sats" valueString={maxCjAbsoluteFee} showBalance={true} />,
              }}
              values={{ num: numCollaborators }}
            />
          </div>
          <div>
            <Balance convertToUnit="sats" valueString={maxEstimatedAbsoluteFee.toString()} showBalance={true} />
          </div>
        </div>
      )}

      <div className="d-flex justify-content-between text-secondary mb-2">
        <div>
          <Trans
            i18nKey="send.fee_breakdown.or_relative_limit"
            values={{ num: numCollaborators, percentage: maxCjRelativeFee }}
          />
        </div>
        <div>
          {amount ? (
            maxEstimatedRelativeFee ? (
              <Balance convertToUnit="sats" valueString={maxEstimatedRelativeFee.toString()} showBalance={true} />
            ) : (
              t('send.fee_breakdown.too_low')
            )
          ) : (
            '-'
          )}
        </div>
      </div>

      <div className="d-flex justify-content-between" style={{ fontWeight: 600 }}>
        <div style={{ gridColumnStart: 'span 2' }}>{t('send.fee_breakdown.total_estimate')}</div>
        <div>
          {estimatedMaxCollaboratorFee ? (
            <Balance convertToUnit="sats" valueString={`${estimatedMaxCollaboratorFee ?? ''}`} showBalance={true} />
          ) : (
            '-'
          )}
        </div>
      </div>
      <div className="d-flex justify-content-between">
        <div>
          <span className="me-1">{t('send.fee_breakdown.plus_mining_fee')}</span>
          <rb.OverlayTrigger
            placement="right"
            overlay={
              <rb.Popover className={settings.theme === 'dark' ? 'border border-light' : 'border border-dark'}>
                <rb.Popover.Header className={settings.theme === 'dark' ? 'text-bg-secondary' : undefined}>
                  {t('send.fee_breakdown.why_cant_estimate_mining_fee')}
                </rb.Popover.Header>
                <rb.Popover.Body className={settings.theme === 'dark' ? 'text-bg-dark rounded-bottom' : undefined}>
                  <Trans i18nKey="send.fee_breakdown.cant_estimate_mining_fee_info" components={{ br: <br /> }} />
                </rb.Popover.Body>
              </rb.Popover>
            }
          >
            <div className="d-inline-flex align-items-center h-100">
              <Sprite
                className="rounded-circle border border-secondary text-body ms-1"
                symbol="info"
                width="13"
                height="13"
              />
            </div>
          </rb.OverlayTrigger>
        </div>
        <div>{miningFeeText}</div>
      </div>
    </div>
  )
}

export default FeeBreakdown
