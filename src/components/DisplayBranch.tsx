import React from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
// @ts-ignore
import Balance from './Balance'
// @ts-ignore
import { useSettings } from '../context/SettingsContext'
import { Branch, BranchEntry } from '../context/WalletContext'
import styles from './DisplayBranch.module.css'
import { CopyButton } from './CopyButton'
import Sprite from './Sprite'

const toHdPathIndex = (hdPath: string) => {
  const indexOfLastSeparator = hdPath.lastIndexOf('/')
  if (indexOfLastSeparator === -1 || indexOfLastSeparator === hdPath.length - 1) {
    return hdPath
  }

  return hdPath.substring(indexOfLastSeparator + 1, hdPath.length)
}

const toSimpleStatus = (value: string) => {
  const indexOfBracket = value.indexOf('[')
  if (indexOfBracket === -1) {
    return value
  }

  return value.substring(0, indexOfBracket).trim()
}

const toLabelNode = (simpleStatus: string): React.ReactNode => {
  if (simpleStatus === 'new') return <rb.Badge bg="success">{simpleStatus}</rb.Badge>
  if (simpleStatus === 'used') return <rb.Badge bg="secondary">{simpleStatus}</rb.Badge>

  return <rb.Badge bg="info">{simpleStatus}</rb.Badge>
}

interface DisplayBranchProps {
  branch: Branch
}

export function DisplayBranchHeader({ branch }: DisplayBranchProps) {
  const { t } = useTranslation()
  const settings = useSettings()

  const { balance, branch: detailsString } = branch
  const [type, derivation] = detailsString.split('\t')
  return (
    <rb.Container fluid>
      <rb.Row className="w-100">
        <rb.Col>
          <div className={styles['branch-title']}>
            {type === 'external addresses' && <>{t('current_wallet_advanced.account_heading_external_addresses')}</>}
            {type === 'internal addresses' && <>{t('current_wallet_advanced.account_heading_internal_addresses')}</>}
            {!['internal addresses', 'external addresses'].includes(type) && <>{type}</>}
          </div>
          <code className="text-secondary text-break">{derivation}</code>
        </rb.Col>
        <rb.Col className={styles['branch-balance']}>
          <Balance valueString={balance} convertToUnit={settings.unit} showBalance={settings.showBalance} />
        </rb.Col>
      </rb.Row>
    </rb.Container>
  )
}

export function DisplayBranchBody({ branch }: DisplayBranchProps) {
  const { branch: detailsString, entries } = branch
  const xpub: string | undefined = detailsString.split('\t')[2]
  return (
    <rb.Container fluid>
      <rb.Row>
        <rb.Col>
          {xpub && (
            <div className="p-3 mb-1">
              <div>Extended public key</div>
              <code className="text-secondary text-break">{xpub}</code>
            </div>
          )}
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
    </rb.Container>
  )
}

export default function DisplayBranch({ branch }: DisplayBranchProps) {
  return (
    <article>
      <DisplayBranchHeader branch={branch} />
      <DisplayBranchBody branch={branch} />
    </article>
  )
}

interface DisplayBranchEntryProps extends rb.CardProps {
  entry: BranchEntry
}

const DisplayBranchEntry = ({ entry, ...props }: DisplayBranchEntryProps) => {
  const settings = useSettings()

  const { address, amount, hd_path: hdPath, label, status: rawStatus } = entry

  const hdPathIndex = toHdPathIndex(hdPath)
  const status = toSimpleStatus(rawStatus)
  const statusNode = toLabelNode(status)

  return (
    <rb.Card {...props}>
      <rb.Card.Body>
        <rb.Row key={address}>
          <rb.Col xs={{ span: 6, order: 1 }} lg={{ span: 'auto' }}>
            <code className="text-break">
              <span className="text-secondary">…/</span>
              {hdPathIndex}
            </code>
          </rb.Col>
          <rb.Col xs={{ span: 12, order: 3 }} sm={{ span: 10 }} lg={{ span: true, order: 2 }}>
            <CopyButton
              className={`${styles['address-copy-button']}`}
              showSprites={false}
              text={
                <>
                  <code className="text-break">{address}</code>
                  <Sprite
                    className={`${styles['sprite']} ${styles['sprite-copy']}`}
                    symbol="copy"
                    width="24"
                    height="24"
                  />
                </>
              }
              successText={
                <>
                  <code className="text-break">{address}</code>
                  <Sprite className={styles['sprite']} color="green" symbol="checkmark" width="24" height="24" />
                </>
              }
              value={address}
            />
            {label && <span className="badge bg-info">{label}</span>}
          </rb.Col>
          <rb.Col
            xs={{ span: 12, order: 4 }}
            sm={{ span: 2 }}
            lg={{ span: 1, order: 'last' }}
            className="d-flex align-items-end justify-content-end"
          >
            <>{statusNode}</>
          </rb.Col>
          <rb.Col
            xs={{ span: 6, order: 2 }}
            lg={{ span: 'auto', order: 3 }}
            className="d-flex align-items-center justify-content-end"
          >
            <Balance valueString={amount} convertToUnit={settings.unit} showBalance={settings.showBalance} />
          </rb.Col>
        </rb.Row>
      </rb.Card.Body>
    </rb.Card>
  )
}
