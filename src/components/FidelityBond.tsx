import React from 'react'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import * as rb from 'react-bootstrap'

// @ts-ignore
import PageTitle from './PageTitle'
import { isFeatureEnabled } from '../constants/features'

import { routes } from '../constants/routes'
import styles from './FidelityBond.module.css'
import { FidelityBondSimple } from './FidelityBondSimple'

export default function FidelityBond() {
  const featureEnabled = isFeatureEnabled('fidelityBonds')
  const featureAdvancedEnabled = isFeatureEnabled('fidelityBondsDevOnly')

  const { t } = useTranslation()

  if (!featureEnabled) {
    return (
      <div>
        <h2>Feature not enabled</h2>
      </div>
    )
  }

  return (
    <div className={styles['fidelity-bond']}>
      <PageTitle title={t('fidelity_bond.title')} subtitle={t('fidelity_bond.subtitle')} />

      <rb.Row>
        <rb.Col>
          {featureAdvancedEnabled && (
            <div className="mb-4">
              <Link className="unstyled" to={routes.fidelityBondsDevOnly}>
                Switch to developer view.
              </Link>
            </div>
          )}

          <div className="mb-4">
            <Trans i18nKey="fidelity_bond.description">
              <a
                href="https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/fidelity-bonds.md"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary"
              >
                See the documentation about Fidelity Bonds
              </a>{' '}
              for more information.
            </Trans>
          </div>

          <FidelityBondSimple />
        </rb.Col>
      </rb.Row>
    </div>
  )
}
