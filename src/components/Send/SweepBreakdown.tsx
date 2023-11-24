import { Trans, useTranslation } from 'react-i18next'
import * as rb from 'react-bootstrap'
import { AccountBalanceSummary } from '../../context/BalanceSummary'
import Balance from '../Balance'
import { SATS } from '../../utils'

import styles from './SweepBreakdown.module.css'

type SweepAccordionToggleProps = {
  eventKey: string
}
function SweepAccordionToggle({ eventKey }: SweepAccordionToggleProps) {
  const { t } = useTranslation()
  return (
    <button type="button" className={styles.accordionButton} onClick={rb.useAccordionButton(eventKey)}>
      {t('send.button_sweep_amount_breakdown')}
    </button>
  )
}

type SweepBreakdownProps = {
  jarBalance: AccountBalanceSummary
}
export function SweepBreakdown({ jarBalance }: SweepBreakdownProps) {
  const { t } = useTranslation()

  return (
    <div className={`${styles.sweepBreakdown} mt-2`}>
      <rb.Accordion flush>
        <rb.Accordion.Item eventKey="0">
          <SweepAccordionToggle eventKey="0" />
          <rb.Accordion.Body className="my-4 p-0">
            <table className={`${styles.sweepBreakdownTable} table table-sm`}>
              <tbody>
                <tr>
                  <td>{t('send.sweep_amount_breakdown_total_balance')}</td>
                  <td className={styles.balanceCol}>
                    <Balance
                      valueString={jarBalance.calculatedTotalBalanceInSats.toString()}
                      convertToUnit={SATS}
                      showBalance={true}
                    />
                  </td>
                </tr>
                <tr>
                  <td>{t('send.sweep_amount_breakdown_frozen_balance')}</td>
                  <td className={styles.balanceCol}>
                    <Balance
                      valueString={jarBalance.calculatedFrozenOrLockedBalanceInSats.toString()}
                      convertToUnit={SATS}
                      showBalance={true}
                    />
                  </td>
                </tr>
                <tr>
                  <td>{t('send.sweep_amount_breakdown_estimated_amount')}</td>
                  <td className={styles.balanceCol}>
                    <Balance
                      valueString={jarBalance.calculatedAvailableBalanceInSats.toString()}
                      convertToUnit={SATS}
                      showBalance={true}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <p className={`${styles.sweepBreakdownParagraph} mb-0 mt-4`}>
              <Trans i18nKey="send.sweep_amount_breakdown_explanation">
                A sweep transaction will consume all UTXOs of a mixdepth leaving no coins behind except those that have
                been
                <a
                  href="https://github.com/JoinMarket-Org/joinmarket-clientserver#wallet-features"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.sweepBreakdownAnchor}
                >
                  frozen
                </a>
                or
                <a
                  href="https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/fidelity-bonds.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.sweepBreakdownAnchor}
                >
                  time-locked
                </a>
                . Mining fees and collaborator fees will be deducted from the amount so as to leave zero change. The
                exact transaction amount can only be calculated by JoinMarket at the point when the transaction is made.
                Therefore the estimated amount shown might deviate from the actually sent amount. Refer to the
                <a
                  href="https://github.com/JoinMarket-Org/JoinMarket-Docs/blob/master/High-level-design.md#joinmarket-transaction-types"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.sweepBreakdownAnchor}
                >
                  JoinMarket documentation
                </a>
                for more details.
              </Trans>
            </p>
          </rb.Accordion.Body>
        </rb.Accordion.Item>
      </rb.Accordion>
    </div>
  )
}
