import React from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
// @ts-ignore
import Balance from './Balance'
// @ts-ignore
import { useSettings } from '../context/SettingsContext'
import { Branch, BranchEntry } from '../global/types'
import styles from './DisplayBranch.module.css'

interface DisplayBranchProps {
  branch: Branch
}

export default function DisplayBranch({ branch }: DisplayBranchProps) {
  const { t } = useTranslation()
  const settings = useSettings()

  const { balance, branch: detailsString, entries } = branch
  const [type, derivation, xpub] = detailsString.split('\t')
  return (
    <article>
      <rb.Row className="mt-4 pe-3">
        <rb.Col xs="auto">
          <h6 className={styles['branch-title']}>
            {type === 'external addresses' && <>{t('current_wallet_advanced.account_heading_external_addresses')}</>}
            {type === 'internal addresses' && <>{t('current_wallet_advanced.account_heading_internal_addresses')}</>}
            {!['internal addresses', 'external addresses'].includes(type) && <>{type}</>}
          </h6>
          <code className="text-secondary text-break">{derivation}</code>
        </rb.Col>
        <rb.Col className="d-flex align-items-center justify-content-end">
          <Balance valueString={balance} convertToUnit={settings.unit} showBalance={settings.showBalance} />
        </rb.Col>
      </rb.Row>
      <rb.Row className="p-3">
        <rb.Col xs="auto">
          <code className="text-secondary text-break">{xpub}</code>
        </rb.Col>
      </rb.Row>
      {entries.map((entry, index) => (
        <DisplayBranchEntry
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

interface DisplayBranchEntryProps extends rb.CardProps {
  entry: BranchEntry
}

const DisplayBranchEntry = ({ entry, ...props }: DisplayBranchEntryProps) => {
  const settings = useSettings()

  const { address, amount, hd_path: hdPath, label, status } = entry

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
          <rb.Col xs={{ span: 12 }} lg={{ span: 'auto' }}>
            <code className="text-break">{address}</code> {label && <span className="badge bg-info">{label}</span>}
            {status && <span className="badge bg-info">{status}</span>}
          </rb.Col>
        </rb.Row>
      </rb.Card.Body>
    </rb.Card>
  )
}
