import React from 'react'
import { useState } from 'react'
import * as rb from 'react-bootstrap'
import { displayDate } from '../utils'
import Balance from './Balance'
import Alert from './Alert'
import { useSettings } from '../context/SettingsContext'
import { useCurrentWallet } from '../context/WalletContext'
import * as Api from '../libs/JmWalletApi'

const Utxo = ({ utxo, ...props }) => {
  const settings = useSettings()
  const currentWallet = useCurrentWallet()

  const [alert, setAlert] = useState(null)
  const [isSending, setIsSending] = useState(false)

  const onClickFreeze = async (utxo) => {
    const { name: walletName, token } = currentWallet

    setAlert(null)
    setIsSending(true)
    try {
      const res = await Api.postFreeze({ walletName, token }, { utxo: utxo.utxo, freeze: !utxo.frozen })

      if (res.ok) {
        utxo.frozen = !utxo.frozen
      } else {
        const { message } = await res.json()
        setAlert({ variant: 'danger', message, dismissible: true })
      }
    } catch (e) {
      setAlert({ variant: 'danger', message: e.message, dismissible: true })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <rb.Card {...props}>
      <rb.Card.Body>
        {alert && (
          <rb.Row>
            <rb.Col>
              <Alert {...alert} />
            </rb.Col>
          </rb.Row>
        )}
        <rb.Row>
          <rb.Col>
            <code className="text-break">{utxo.address}</code>
          </rb.Col>
          <rb.Col className="d-flex align-items-center justify-content-end">
            <Balance value={utxo.value} unit={settings.unit} showBalance={settings.showBalance} />
          </rb.Col>
        </rb.Row>
        <rb.Row className="mt-1">
          <rb.Col>
            {utxo.locktime && <span className="me-2">Locked until {displayDate(utxo.locktime)}</span>}
            {utxo.label && <span className="me-2 badge bg-light">{utxo.label}</span>}
            {utxo.frozen && <span className="me-2 badge bg-info">frozen</span>}
            {utxo.confirmations === 0 && <span className="badge bg-secondary">unconfirmed</span>}
          </rb.Col>
          <rb.Col className="d-flex align-items-center justify-content-end">
            <small className="text-secondary">{utxo.confirmations} Confirmations</small>
          </rb.Col>
        </rb.Row>
        <rb.Row className="mt-1">
          <rb.Col className="d-flex align-items-center justify-content-end">
            <rb.Button
              size="sm"
              variant={utxo.frozen ? 'outline-warning' : 'outline-info'}
              disabled={isSending}
              onClick={() => onClickFreeze(utxo)}
            >
              {utxo.frozen ? 'unfreeze' : 'freeze'}
              {isSending && (
                <rb.Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="ms-2 me-1"
                />
              )}
            </rb.Button>
          </rb.Col>
        </rb.Row>
      </rb.Card.Body>
    </rb.Card>
  )
}

export default function DisplayUTXOs({ utxos, ...props }) {
  return (
    <div {...props}>
      {utxos.map((utxo, index) => (
        <Utxo
          key={utxo.utxo}
          utxo={utxo}
          className={`bg-transparent rounded-0 border-start-0 border-end-0 border-bottom-0 ${
            index === 0 ? 'border-top-0' : 'border-top-1'
          }`}
        />
      ))}
    </div>
  )
}
