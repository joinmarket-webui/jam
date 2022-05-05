import React from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import Balance from './Balance'
import { useSettings } from '../context/SettingsContext'

const BranchEntry = ({ entry, ...props }) => {
  const settings = useSettings()

  const { address, amount, hd_path: hdPath, labels, status } = entry

  return (
    <rb.Card {...props}>
      <rb.Card.Body>
        <rb.Row key={address}>
          <rb.Col xs={'auto'}>
            <code className="text-break">{hdPath}</code>
          </rb.Col>
          <rb.Col lg={{ order: 'last' }} className="d-flex align-items-center justify-content-end">
            <Balance valueString={amount} convertToUnit={settings.unit} showBalance={settings.showBalance} />
          </rb.Col>
          <rb.Col xs={'auto'}>
            <code className="text-break">{address}</code> {labels && <span className="badge bg-info">{labels}</span>}
            {status && <span className="badge bg-info">{status}</span>}
          </rb.Col>
        </rb.Row>
      </rb.Card.Body>
    </rb.Card>
  )
}

export default function DisplayBranch({ branch }) {
  const { t } = useTranslation()
  const settings = useSettings()

  const { balance, branch: detailsString, entries } = branch
  const [type, derivation, xpub] = detailsString.split('\t')
  return (
    <article>
      <rb.Row className="mt-4 pe-3">
        <rb.Col>
          {type === 'external addresses' && <h6>{t('current_wallet_advanced.account_heading_external_addresses')}</h6>}
          {type === 'internal addresses' && <h6>{t('current_wallet_advanced.account_heading_internal_addresses')}</h6>}
          {!['internal addresses', 'external addresses'].includes(type) && <h6>{type}</h6>}
        </rb.Col>
        <rb.Col className="d-flex align-items-center justify-content-end">
          <Balance valueString={balance} convertToUnit={settings.unit} showBalance={settings.showBalance} />
        </rb.Col>
      </rb.Row>
      <rb.Row className="p-3">
        <rb.Col xs="auto">
          <code className="text-break">{derivation}</code>
        </rb.Col>
        <rb.Col xs="auto">
          <code className="text-break">{xpub}</code>
        </rb.Col>
      </rb.Row>
      {entries.map((entry, index) => (
        <BranchEntry
          key={entry.address}
          entry={entry}
          className={`bg-transparent rounded-0 border-start-0 border-end-0 ${
            index === 0 ? 'border-top-1 mt-2' : 'border-top-0'
          }`}
        />
      ))}
    </article>
  )
}
