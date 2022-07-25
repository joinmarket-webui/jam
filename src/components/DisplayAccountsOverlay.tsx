import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { Table, Header, HeaderRow, HeaderCell, Body, Row, Cell } from '@table-library/react-table-library/table'
import { useTheme } from '@table-library/react-table-library/theme'
import { useRowSelect, HeaderCellSelect, CellSelect, SelectClickTypes } from '@table-library/react-table-library/select'
import { useSort, HeaderCellSort } from '@table-library/react-table-library/sort'
import * as rb from 'react-bootstrap'
import classnamesBind from 'classnames/bind'
import { useTranslation } from 'react-i18next'
import { DisplayBranchHeader, DisplayBranchBody } from './DisplayBranch'
// @ts-ignore
import styles from './DisplayAccountsOverlay.module.css'
import { useReloadCurrentWalletInfo } from '../context/WalletContext'
import Sprite from './Sprite'
import SegmentedTabs from './SegmentedTabs'
import { Account } from '../context/WalletContext'
import { Utxo, AddressStatus, WalletInfo } from '../context/WalletContext'
import Alert from './Alert'
import Balance from './Balance'
import { useSettings } from '../context/SettingsContext'
import * as fb from './fb/utils'
import * as Api from '../libs/JmWalletApi'

const cx = classnamesBind.bind(styles)

interface DisplayAccountsProps extends rb.OffcanvasProps {
  accounts: Account[]
  selectedAccountIndex?: number
}

type Alert = { message: string; variant: string; dismissible: boolean }

const UtxoDetailModal = ({
  utxo,
  status,
  isShown,
  onClose,
}: {
  utxo: Utxo | null
  status: string | null
  isShown: boolean
  onClose: () => void
}) => {
  if (!utxo) {
    onClose()
    return <></>
  }

  return (
    <rb.Modal
      show={isShown}
      keyboard={true}
      onEscapeKeyDown={onClose}
      onHide={onClose}
      centered={true}
      animation={true}
      className={styles.utxoDetailModal}
      backdropClassName={styles.utxoDetailModalBackdrop}
    >
      <rb.Modal.Body>
        <div className="d-flex flex-column gap-3">
          <div>
            <strong>UTXO Id</strong>: {utxo.utxo}
          </div>
          <div>
            <strong>Address</strong>: {utxo.address}
          </div>
          <div>
            <strong>Path</strong>: {utxo.path}
          </div>
          <div>
            <strong>Label</strong>: {utxo.label}
          </div>
          <div>
            <strong>Value</strong>: {utxo.value}
          </div>
          <div>
            <strong>Tries</strong>: {utxo.tries}
          </div>
          <div>
            <strong>Tries rstrongaining</strong>: {utxo.tries_remaining}
          </div>
          <div>
            <strong>External</strong>: {utxo.external}
          </div>
          <div>
            <strong>Mixdepth</strong>: {utxo.mixdepth}
          </div>
          <div>
            <strong>Confirmations</strong>: {utxo.confirmations}
          </div>
          <div>
            <strong>Frozen</strong>: {utxo.frozen}
          </div>
          <div>
            <strong>Utxo</strong>: {utxo.utxo}
          </div>
          <div>
            <strong>Locktime</strong>: {utxo.locktime}
          </div>
          <div>
            <strong>Address Status</strong>: {status}
          </div>
        </div>
      </rb.Modal.Body>
      <rb.Modal.Footer className="d-flex justify-content-center">
        <rb.Button variant="light" onClick={onClose} className="w-25 d-flex justify-content-center align-items-center">
          Close
        </rb.Button>
      </rb.Modal.Footer>
    </rb.Modal>
  )
}

export function DisplayAccountsOverlay({
  accounts,
  utxosByAccount,
  walletInfo,
  wallet,
  selectedAccountIndex = 0,
  show,
  onHide,
}: DisplayAccountsProps) {
  const settings = useSettings()
  const { t } = useTranslation()
  const reloadCurrentWalletInfo = useReloadCurrentWalletInfo()

  const [accountIndex, setAccountIndex] = useState<number>(selectedAccountIndex)
  const account = useMemo(() => accounts[accountIndex], [accounts, accountIndex])

  const [selectedTab, setSelectedTab] = useState('utxos')
  const [alert, setAlert] = useState<Alert | null>(null)
  const [isLoadingFreeze, setIsLoadingFreeze] = useState(false)
  const [isLoadingUnfreeze, setIsLoadingUnfreeze] = useState(false)
  const [detailUtxo, setDetailUtxo] = useState<Utxo | null>(null)
  const [showDetailUtxoModal, setShowDetailUtxoModal] = useState(false)
  const [selectedUtxoIds, setSelectedUtxoIds] = useState<Array<string>>([])

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

  const changeUtxoFreeze = async (utxos: Array<Utxo>, freeze: boolean) => {
    freeze ? setIsLoadingFreeze(true) : setIsLoadingUnfreeze(true)

    const abortCtrl = new AbortController()

    const { name: walletName, token } = wallet

    const freezeCalls = utxos.map((utxo) =>
      Api.postFreeze({ walletName, token }, { utxo: utxo.utxo, freeze: freeze }).then((res) => {
        if (!res.ok) {
          return Api.Helper.throwError(res, freeze ? 'error_freezing_utxos' : 'error_unfreezing_utxos')
        }
      })
    )

    Promise.all(freezeCalls)
      .then((_) => reloadCurrentWalletInfo({ signal: abortCtrl.signal }))
      .catch((err) => {
        setAlert({ variant: 'danger', message: err.message, dismissible: true })
      })
      .finally(() => {
        freeze ? setIsLoadingFreeze(false) : setIsLoadingUnfreeze(false)
      })
  }

  const tableTheme = useTheme({
    Table: `
      --data-table-library_grid-template-columns: 2.375rem 2.5rem 1fr 4fr 1fr 3fr;
      border-color: #e9ecef;
    `,
    BaseCell: `
      &:nth-child(3) {
        text-align: right;
      }
      &:nth-child(5) {
        text-align: right;
      }
    `,
    Cell: `
      font-size: 0.8rem;
    `,
    HeaderRow: `
      &>th {
        &:nth-child(1) {
          padding-left: 1rem;
          box-shadow: 5px 0 0 transparent inset;
        }
      }
      &>th > div > button > span{
        margin-left: 0.2rem !important;
      }
    `,
    Row: `
      &>td {
        padding: 1rem 0.5rem;
        &:nth-child(1) {
          padding: 1rem 0.5rem 1rem 1rem;
          box-shadow: 5px 0 0 transparent inset;
        }
      }
      &.row-select-selected > td {
        background-color: #f8f9fa;
        &:nth-child(1) {
          padding: 1rem 0.5rem 1rem 1rem;
          box-shadow: 5px 0 0 #007aff inset;
        }
      }
      &.row-select-selected {
        font-weight: inherit;
      }
    `,
  })

  const utxoTags = (utxo: Utxo, walletInfo: WalletInfo) => {
    const label = utxo.label

    var rawStatus = walletInfo.addressSummary[utxo.address]?.status
    var status: string | null = null
    var locktime: string | null = null
    if (rawStatus) {
      const indexOfLockedTag = rawStatus.indexOf('[LOCKED]')
      if (indexOfLockedTag !== -1) {
        locktime = rawStatus.substring(0, indexOfLockedTag).trim()
      } else {
        const indexOfOtherTag = rawStatus.indexOf('[')
        if (indexOfOtherTag !== -1) {
          status = rawStatus.substring(0, indexOfOtherTag).trim()
        } else {
          status = rawStatus
        }
      }
    }

    let tags = []

    if (label) tags.push({ tag: label, type: 'addresslabel' })
    if (status) tags.push({ tag: status, type: 'addressstatus' })
    if (locktime) tags.push({ tag: `locked until ${locktime}`, type: 'locktime' })

    return tags
  }

  const tableData = {
    nodes: (utxosByAccount[accountIndex] || []).map((utxo: Utxo, index: number) => ({ ...utxo, id: utxo.utxo })),
  }

  const select = useRowSelect(
    tableData,
    {
      onChange: onSelectChange,
    },
    {
      clickType: SelectClickTypes.ButtonClick,
    }
  )

  const sort = useSort(
    tableData,
    {},
    {
      sortIcon: {
        margin: '0px',
        iconDefault: <Sprite symbol="caret-right" width="20" height="20" />,
        iconUp: <Sprite symbol="caret-up" width="20" height="20" />,
        iconDown: <Sprite symbol="caret-down" width="20" height="20" />,
      },
      sortFns: {
        FROZENLOCKED: (array) =>
          array.sort(
            (a, b) =>
              Number(a.frozen || fb.utxo.isLocked(Object.create(a))) -
              Number(b.frozen || fb.utxo.isLocked(Object.create(b)))
          ),
        VALUE: (array) => array.sort((a, b) => a.value - b.value),
        ADDRESS: (array) => array.sort((a, b) => a.address.localeCompare(b.address)),
        TAGS: (array) =>
          array.sort((a, b) =>
            utxoTags(Object.create(a), walletInfo)
              .join(' ')
              .localeCompare(utxoTags(Object.create(b), walletInfo).join(' '))
          ),
      },
    }
  )

  function onSelectChange(action: any, state: any) {
    console.log(action, state)
    setSelectedUtxoIds(state.ids)
  }

  const freezeSelectedUtxos = () => {
    if (selectedUtxoIds.length > 0) {
      const selectedUtxos = (utxosByAccount[accountIndex] || []).filter((utxo: Utxo) => {
        return selectedUtxoIds.includes(utxo.utxo)
      })

      changeUtxoFreeze(selectedUtxos, true)
    }
  }

  const unfreezeSelectedUtxos = () => {
    if (selectedUtxoIds.length > 0) {
      const selectedUtxos = (utxosByAccount[accountIndex] || []).filter((utxo: Utxo) => {
        return selectedUtxoIds.includes(utxo.utxo)
      })

      changeUtxoFreeze(selectedUtxos, false)
    }
  }

  if (!account) {
    return <></>
  }

  return (
    <rb.Offcanvas
      className={styles.overlayContainer}
      show={show}
      onHide={onHide}
      keyboard={false}
      placement="bottom"
      tabIndex={-1}
    >
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
            <rb.Col lg={12} xl={10}>
              <>
                <UtxoDetailModal
                  isShown={showDetailUtxoModal}
                  utxo={detailUtxo}
                  status={detailUtxo ? walletInfo.addressSummary[detailUtxo!.address]?.status : null}
                  onClose={() => {
                    setShowDetailUtxoModal(false)
                    setDetailUtxo(null)
                  }}
                />
                {alert && (
                  <rb.Col xs={12}>
                    <Alert {...alert} onDismissed={setAlert(null)} />
                  </rb.Col>
                )}
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
                    <div className={styles.utxoListTitle}>
                      <div className="d-flex justify-content-between align-items-start gap-3">
                        <div>UTXOs in Jar #{accountIndex}</div>
                        <div className="d-flex gap-2">
                          <rb.Button
                            disabled={isLoadingUnfreeze}
                            variant="dark"
                            onClick={() => freezeSelectedUtxos()}
                            className={styles.buttonFreezeUnfreeze}
                          >
                            {isLoadingFreeze ? (
                              <rb.Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-2"
                              />
                            ) : (
                              <div>Freeze selected</div>
                            )}
                          </rb.Button>
                          <rb.Button
                            disabled={isLoadingFreeze}
                            variant="dark"
                            onClick={() => unfreezeSelectedUtxos()}
                            className={styles.buttonFreezeUnfreeze}
                          >
                            {isLoadingUnfreeze ? (
                              <rb.Spinner
                                as="span"
                                animation="border"
                                size="sm"
                                role="status"
                                aria-hidden="true"
                                className="me-2"
                              />
                            ) : (
                              <div>Unfreeze selected</div>
                            )}
                          </rb.Button>
                        </div>
                      </div>
                    </div>
                    <div className={styles.utxoTableContainer}>
                      <Table data={tableData} theme={tableTheme} layout={{ custom: true }} select={select} sort={sort}>
                        {(tableList) => (
                          <>
                            <Header>
                              <HeaderRow>
                                <HeaderCellSelect />
                                <HeaderCellSort sortKey="FROZENLOCKED"></HeaderCellSort>
                                <HeaderCellSort sortKey="VALUE">Value</HeaderCellSort>
                                <HeaderCellSort sortKey="ADDRESS">Address</HeaderCellSort>
                                <HeaderCell>&nbsp;</HeaderCell>
                                <HeaderCellSort sortKey="TAGS">Tags</HeaderCellSort>
                              </HeaderRow>
                            </Header>
                            <Body>
                              {tableList.map((utxo, index) => (
                                <Row key={index} item={utxo}>
                                  <CellSelect item={utxo} />
                                  <Cell>
                                    {utxo.frozen && !fb.utxo.isLocked(Object.create(utxo)) && (
                                      <div className={styles.frozenTag}>
                                        <Sprite
                                          className={styles.iconFrozen}
                                          symbol="snowflake"
                                          width="20"
                                          height="20"
                                        />
                                      </div>
                                    )}
                                    {fb.utxo.isLocked(Object.create(utxo)) && (
                                      <div className={styles.lockedTag}>
                                        <Sprite className={styles.iconLocked} symbol="lock" width="20" height="20" />
                                      </div>
                                    )}
                                  </Cell>
                                  <Cell>
                                    <Balance
                                      valueString={utxo.value.toString()}
                                      convertToUnit={settings.unit}
                                      showBalance={true}
                                    />
                                  </Cell>
                                  <Cell>
                                    <code>{utxo.address}</code>
                                  </Cell>
                                  <Cell>
                                    <rb.Button
                                      className={styles.utxoListButtonDetails}
                                      variant="link"
                                      onClick={() => {
                                        setDetailUtxo(Object.create(utxo))
                                        setShowDetailUtxoModal(true)
                                      }}
                                    >
                                      Details
                                    </rb.Button>
                                  </Cell>
                                  <Cell>
                                    <div className="d-flex gap-2">
                                      {utxoTags(Object.create(utxo), walletInfo).map((tag, index) => {
                                        return (
                                          <div className={styles.utxoTag} key={index}>
                                            <div className={cx('utxoTagMarker', `utxoTagMarker-${tag.type}`)}></div>
                                            <div>{tag.tag}</div>
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </Cell>
                                </Row>
                              ))}
                            </Body>
                          </>
                        )}
                      </Table>
                    </div>
                  </div>
                )}
              </>
            </rb.Col>
          </rb.Row>
        </rb.Container>
      </rb.Offcanvas.Body>
    </rb.Offcanvas>
  )
}
