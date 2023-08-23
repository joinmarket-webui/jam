import { PropsWithChildren } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import classNames from 'classnames'
import { useFeeConfigValues } from '../../hooks/Fees'
import Balance from '../Balance'
import * as rb from 'react-bootstrap'
import { useSettings } from '../../context/SettingsContext'
import { Link } from 'react-router-dom'
import { routes } from '../../constants/routes'
import { SATS, formatSats } from '../../utils'

interface FeeBreakdownProps {
  numCollaborators: number | null
  amount: number | null
}

type FeeCardProps = {
  amount: number | null
  highlight: boolean
  subtitle?: React.ReactNode
}
const FeeCard = ({ amount, highlight, subtitle }: FeeCardProps) => {
  const settings = useSettings()
  const { t } = useTranslation()

  return (
    <rb.Card border={highlight ? (settings.theme === 'dark' ? 'light' : 'dark') : undefined}>
      <rb.Card.Body
        className={classNames('text-center py-2', {
          'text-muted': !highlight,
        })}
      >
        <div className="fs-5">
          {amount ? (
            <Balance convertToUnit={SATS} valueString={amount.toString()} showBalance={true} />
          ) : (
            t('send.fee_breakdown.too_low')
          )}
        </div>
        <div className="text-secondary text-small">{subtitle}</div>
      </rb.Card.Body>
    </rb.Card>
  )
}

const FeeBreakdown = ({ numCollaborators, amount }: PropsWithChildren<FeeBreakdownProps>) => {
  const { t } = useTranslation()
  const feesConfig = useFeeConfigValues()

  /** eg: "0.03%" */
  const maxSettingsRelativeFee = feesConfig?.max_cj_fee_rel
    ? `${feesConfig.max_cj_fee_rel * 100}%`
    : t('send.fee_breakdown.not_set')

  /** eg: 44658 (expressed in sats) */
  const maxEstimatedRelativeFee =
    feesConfig?.max_cj_fee_rel && numCollaborators && amount
      ? amount * feesConfig.max_cj_fee_rel * numCollaborators >= 1
        ? Math.ceil(amount * feesConfig.max_cj_fee_rel) * numCollaborators
        : null
      : null

  /** eg: "8,636 sats" */
  const maxSettingsAbsoluteFee = feesConfig?.max_cj_fee_abs
    ? `${formatSats(feesConfig.max_cj_fee_abs)} sats`
    : t('send.fee_breakdown.not_set')

  /** eg: 77724 (expressed in sats) */
  const maxEstimatedAbsoluteFee =
    feesConfig?.max_cj_fee_abs && numCollaborators ? feesConfig.max_cj_fee_abs * numCollaborators : null

  return (
    <rb.Row className="mb-2">
      <rb.Col>
        <rb.Form.Label className="text-small">{t('send.fee_breakdown.absolute_limit')}</rb.Form.Label>
        <FeeCard
          amount={maxEstimatedAbsoluteFee}
          subtitle={
            <Trans
              i18nKey="send.fee_breakdown.fee_card_subtitle"
              components={{
                a: <Link to={routes.settings} className="text-decoration-underline text-secondary" />,
              }}
              values={{
                numCollaborators,
                maxFee: maxSettingsAbsoluteFee,
              }}
            />
          }
          highlight={
            maxEstimatedAbsoluteFee && maxEstimatedRelativeFee
              ? maxEstimatedAbsoluteFee > maxEstimatedRelativeFee
              : false
          }
        />
      </rb.Col>
      <rb.Col>
        <rb.Form.Label className="text-small">{t('send.fee_breakdown.relative_limit')}</rb.Form.Label>
        <FeeCard
          amount={maxEstimatedRelativeFee}
          subtitle={
            <Trans
              i18nKey="send.fee_breakdown.fee_card_subtitle"
              components={{
                a: <Link to={routes.settings} className="text-decoration-underline text-secondary" />,
              }}
              values={{
                numCollaborators,
                maxFee: maxSettingsRelativeFee,
              }}
            />
          }
          highlight={
            maxEstimatedAbsoluteFee && maxEstimatedRelativeFee
              ? maxEstimatedRelativeFee > maxEstimatedAbsoluteFee
              : false
          }
        />
      </rb.Col>
    </rb.Row>
  )
}

export default FeeBreakdown
