import classNames from 'classnames'
import { PropsWithChildren } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { routes } from '../../constants/routes'
import Balance from '../Balance'

interface FeeBreakdownProps {
  numCollaborators: number | null
}

const FeeBreakdown = ({ numCollaborators }: PropsWithChildren<FeeBreakdownProps>) => {
  const rowClass = 'border-bottom pb-2'
  const valueClass = 'text-end'
  const { t } = useTranslation()

  return (
    <div className="mt-4" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', rowGap: 8 }}>
      <div className={rowClass} style={{ gridColumnStart: 'span 2' }}>
        <Trans i18nKey="send.fee_breakdown.counterparties_multiplied" components={{ b: <strong /> }} />
      </div>
      <div className={classNames(rowClass, valueClass)}>{numCollaborators}</div>

      <div className={rowClass} />
      <div className={rowClass}>{t('send.fee_breakdown.random_absolute_limit')}</div>
      <div className={classNames(rowClass, valueClass)}>
        <Balance convertToUnit="sats" valueString="123" showBalance={true} />
      </div>

      <div className={rowClass}>{t('send.fee_breakdown.or')}</div>
      <div className={rowClass}>
        <Trans
          i18nKey="send.fee_breakdown.personal_absolute_limit"
          components={{ b: <strong />, a: <Link to={routes.settings} className="text-body" /> }}
        />
      </div>
      <div className={classNames(rowClass, valueClass)}>
        <Balance convertToUnit="sats" valueString="123" showBalance={true} />
      </div>

      <div className={rowClass}>{t('send.fee_breakdown.or')}</div>
      <div className={rowClass}>{t('send.fee_breakdown.random_relative_limit')}</div>
      <div className={classNames(rowClass, valueClass)}>10%</div>

      <div className={rowClass}>{t('send.fee_breakdown.or')}</div>
      <div className={rowClass}>
        <Trans
          i18nKey="send.fee_breakdown.personal_relative_limit"
          components={{ b: <strong />, a: <Link to={routes.settings} className="text-body" /> }}
        />
      </div>
      <div className={classNames(rowClass, valueClass)}>10%</div>

      <div className="pb-2 border-bottom border-2 pe-2">{t('send.fee_breakdown.plus')}</div>
      <div className="pb-2 border-bottom border-2">
        <Trans
          i18nKey="send.fee_breakdown.miner_fee"
          components={{ a: <Link to={routes.settings} className="text-body" /> }}
          values={{ amount: '1.0' }}
        />
      </div>
      <div className={classNames('pb-2 border-bottom border-2', valueClass)}>
        <Balance convertToUnit="sats" valueString="123" showBalance={true} />
      </div>

      <div className="bold" style={{ gridColumnStart: 'span 2' }}>
        {t('send.fee_breakdown.total_estimate')}
      </div>
      <div>
        <Balance convertToUnit="sats" valueString="123" showBalance={true} />
      </div>
    </div>
  )
}

export default FeeBreakdown
