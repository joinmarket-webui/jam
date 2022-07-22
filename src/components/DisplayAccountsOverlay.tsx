import React, { useEffect, useMemo, useState, useCallback } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import { DisplayBranchHeader, DisplayBranchBody } from './DisplayBranch'
// @ts-ignore
import styles from './DisplayAccountsOverlay.module.css'
import Sprite from './Sprite'
import SegmentedTabs from './SegmentedTabs'
import { Account } from '../context/WalletContext'
import { Utxo } from '../context/WalletContext'

interface DisplayAccountsProps extends rb.OffcanvasProps {
  accounts: Account[]
  selectedAccountIndex?: number
}

export function DisplayAccountsOverlay({
  accounts,
  utxosByAccount,
  selectedAccountIndex = 0,
  show,
  onHide,
}: DisplayAccountsProps) {
  const { t } = useTranslation()

  const [accountIndex, setAccountIndex] = useState<number>(selectedAccountIndex)
  const account = useMemo(() => accounts[accountIndex], [accounts, accountIndex])

  const [selectedTab, setSelectedTab] = useState('utxos')

  useEffect(() => {
    setAccountIndex(selectedAccountIndex)
  }, [selectedAccountIndex])

  const nextAccount = useCallback(
    () => setAccountIndex((current) => (current + 1 >= accounts.length ? 0 : current + 1)),
    [accounts]
  )
  const previousAccount = useCallback(
    () => setAccountIndex((current) => (current - 1 < 0 ? accounts.length - 1 : current - 1)),
    [accounts]
  )

  const onKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.code === 'ArrowLeft') previousAccount()
      else if (e.code === 'ArrowRight') nextAccount()
    },
    [previousAccount, nextAccount]
  )

  useEffect(() => {
    if (!show) return

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [show, onKeyDown])

  if (!account) {
    return <></>
  }

  return (
    <rb.Offcanvas className={styles.overlayContainer} show={show} onHide={onHide} placement="bottom" tabIndex={-1}>
      <rb.Offcanvas.Header className={styles.overlayHeader}>
        <rb.Container>
          <div className="w-100 d-flex gap-3">
            <div className="d-flex flex-1">
              <rb.Button variant="link" className="unstyled ps-0 me-auto" onClick={() => onHide()}>
                <span>{t('global.close')}</span>
              </rb.Button>
            </div>
            <div className="flex-1">
              <SegmentedTabs
                name="offertype"
                tabs={[
                  {
                    label: 'UTXOs',
                    value: 'utxos',
                  },
                  {
                    label: 'Account Details',
                    value: 'accountDetails',
                  },
                ]}
                onChange={(tab, checked) => {
                  checked && setSelectedTab(tab.value)
                }}
                initialValue={'utxos'}
                disabled={false}
              />
            </div>
            <div className="d-flex flex-1">
              <div className="d-flex align-items-center ms-auto">
                <rb.Button variant="link" className={styles.accountStepperButton} onClick={() => previousAccount()}>
                  <Sprite symbol="caret-left" width="20" height="20" />
                </rb.Button>
                <div className={styles.accountStepperTitle}>
                  <Sprite symbol="jar-open-fill-50" width="20" height="20" />
                  <span className="slashed-zeroes">#{account.account}</span>
                </div>
                <rb.Button variant="link" className={styles.accountStepperButton} onClick={() => nextAccount()}>
                  <Sprite symbol="caret-right" width="20" height="20" />
                </rb.Button>
              </div>
            </div>
          </div>
        </rb.Container>
      </rb.Offcanvas.Header>
      <rb.Offcanvas.Body className={styles.overlayBody}>
        <rb.Container className="py-4 py-sm-5">
          <rb.Row className="justify-content-center">
            <rb.Col md={12} lg={10} xl={8}>
              {selectedTab === 'accountDetails' ? (
                <div>
                  <rb.Accordion flush>
                    {account.branches.map((branch, index) => (
                      <rb.Accordion.Item className={styles.accountItem} key={branch.branch} eventKey={`${index}`}>
                        <rb.Accordion.Header>
                          <DisplayBranchHeader branch={branch} />
                        </rb.Accordion.Header>
                        <rb.Accordion.Body>
                          <DisplayBranchBody branch={branch} />
                        </rb.Accordion.Body>
                      </rb.Accordion.Item>
                    ))}
                  </rb.Accordion>
                </div>
              ) : (
                <div className={styles.utxoListContainer}>
                  <div>UTXOs of Jar {accountIndex}</div>
                  <div>
                    {(utxosByAccount[accountIndex] || []).map((utxo: Utxo, index: number) => {
                      return <div key={index}>{utxo.value}</div>
                    })}
                  </div>
                </div>
              )}
            </rb.Col>
          </rb.Row>
        </rb.Container>
      </rb.Offcanvas.Body>
    </rb.Offcanvas>
  )
}
