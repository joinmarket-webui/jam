import { useMemo, PropsWithChildren } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import classNames from 'classnames'
import Balance from '../Balance'
import * as rb from 'react-bootstrap'
import { useSettings } from '../../context/SettingsContext'
import { Link } from 'react-router-dom'
import { routes } from '../../constants/routes'
import { SATS, formatSats } from '../../utils'
import { FeeValues } from '../../hooks/Fees'

interface FeeBreakdownProps {
  feeConfigValues?: FeeValues
  numCollaborators: number | null
  amount: number | null
  onClick?: () => void
}

type FeeCardProps = {
  amount: number | null
  highlight: boolean
  subtitle?: React.ReactNode
  onClick: () => void
}
const FeeCard = ({ amount, highlight, subtitle, onClick }: FeeCardProps) => {
  const settings = useSettings()
  const { t } = useTranslation()

  return (
    <rb.Card onClick={onClick} border={highlight ? (settings.theme === 'dark' ? 'light' : 'dark') : undefined}>
      <rb.Card.Body
        className={classNames('text-center py-2', {
          'text-muted': !highlight,
        })}
      >
        <div className="fs-5">
          {amount ? (
            <>
              &le;
              <Balance convertToUnit={SATS} valueString={amount.toString()} showBalance={true} />
            </>
          ) : (
            t('send.fee_breakdown.too_low')
          )}
        </div>
        <div className="text-secondary text-small">{subtitle}</div>
      </rb.Card.Body>
    </rb.Card>
  )
}

const FeeBreakdown = ({
  feeConfigValues,
  numCollaborators,
  amount,
  onClick = () => {},
}: PropsWithChildren<FeeBreakdownProps>) => {
  const { t } = useTranslation()

  /** eg: "0.03%" */
  const maxSettingsRelativeFee = useMemo(
    () =>
      feeConfigValues?.max_cj_fee_rel ? `${feeConfigValues.max_cj_fee_rel * 100}%` : t('send.fee_breakdown.not_set'),
    [feeConfigValues, t]
  )

  /** eg: 44658 (expressed in sats) */
  const maxEstimatedRelativeFee = useMemo(
    () =>
      feeConfigValues?.max_cj_fee_rel && numCollaborators && amount
        ? amount * feeConfigValues.max_cj_fee_rel * numCollaborators >= 1
          ? Math.ceil(amount * feeConfigValues.max_cj_fee_rel) * numCollaborators
          : null
        : null,
    [feeConfigValues, amount, numCollaborators]
  )

  /** eg: "8,636 sats" */
  const maxSettingsAbsoluteFee = useMemo(
    () =>
      feeConfigValues?.max_cj_fee_abs
        ? `${formatSats(feeConfigValues.max_cj_fee_abs)} sats`
        : t('send.fee_breakdown.not_set'),
    [feeConfigValues, t]
  )

  /** eg: 77724 (expressed in sats) */
  const maxEstimatedAbsoluteFee = useMemo(
    () =>
      feeConfigValues?.max_cj_fee_abs && numCollaborators ? feeConfigValues.max_cj_fee_abs * numCollaborators : null,
    [feeConfigValues, numCollaborators]
  )

  const isAbsoluteFeeHighlighted = useMemo(
    () =>
      maxEstimatedAbsoluteFee && maxEstimatedRelativeFee ? maxEstimatedAbsoluteFee > maxEstimatedRelativeFee : false,
    [maxEstimatedAbsoluteFee, maxEstimatedRelativeFee]
  )

  const isRelativeFeeHighlighted = useMemo(
    () =>
      maxEstimatedAbsoluteFee && maxEstimatedRelativeFee ? maxEstimatedRelativeFee > maxEstimatedAbsoluteFee : false,
    [maxEstimatedAbsoluteFee, maxEstimatedRelativeFee]
  )

  return (
    <rb.Row className="mb-2">
      <rb.Col>
        <rb.Form.Label
          className={classNames('mb-1', 'text-small', {
            'text-muted': !isAbsoluteFeeHighlighted,
          })}
        >
          {t('send.fee_breakdown.absolute_limit')}
        </rb.Form.Label>
        <FeeCard
          highlight={isAbsoluteFeeHighlighted}
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
          onClick={onClick}
        />
      </rb.Col>
      <rb.Col>
        <rb.Form.Label
          className={classNames('mb-1', 'text-small', {
            'text-muted': !isRelativeFeeHighlighted,
          })}
        >
          {t('send.fee_breakdown.relative_limit')}
        </rb.Form.Label>
        <FeeCard
          highlight={isRelativeFeeHighlighted}
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
          onClick={onClick}
        />
      </rb.Col>
    </rb.Row>
  )
}

export default FeeBreakdown
