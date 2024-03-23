import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Table, Header, HeaderRow, HeaderCell, Body, Row, Cell } from '@table-library/react-table-library/table'
import { usePagination } from '@table-library/react-table-library/pagination'
import { useSort, HeaderCellSort, SortToggleType } from '@table-library/react-table-library/sort'
import * as TableTypes from '@table-library/react-table-library/types/table'
import { useTheme } from '@table-library/react-table-library/theme'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import * as Api from '../libs/JmWalletApi'
import { useSettings } from '../context/SettingsContext'
import Balance from './Balance'
import Sprite from './Sprite'
import TablePagination from './TablePagination'
import styles from './EarnReport.module.css'
import { isDebugFeatureEnabled } from '../constants/debugFeatures'
import { pseudoRandomNumber } from './Send/helpers'

const SORT_KEYS = {
  timestamp: 'TIMESTAMP',
  cjTotalAmountInSats: 'CJ_TOTAL_AMOUNT_IN_SATS',
  inputCount: 'INPUT_COUNT',
  inputAmountInSats: 'INPUT_AMOUNT_IN_SATS',
  earnedAmountInSats: 'EARNED_AMOUNT_IN_SATS',
}

const TABLE_THEME = {
  Table: `
    --data-table-library_grid-template-columns: 2fr 2fr 2fr 1fr 2fr 2fr;
    font-size: 0.9rem;
  `,
  BaseCell: `
    &:nth-of-type(2) div div {
      justify-content: end;
    }
    &:nth-of-type(3) div div {
      justify-content: end;
    }
    &:nth-of-type(4) div div {
      justify-content: end;
    }
    &:nth-of-type(5) div div {
      justify-content: end;
    }
  `,
  Cell: `
    &:nth-of-type(2) {
      text-align: right;
    }
    &:nth-of-type(3) {
      text-align: right;
    }
    &:nth-of-type(4) {
      text-align: right;
    }
    &:nth-of-type(5) {
      text-align: right;
    }
  `,
}

type Minutes = number

interface EarnReportEntry {
  timestamp: Date
  cjTotalAmount: Api.AmountSats | null
  inputCount: number | null
  inputAmount: Api.AmountSats | null
  fee: Api.AmountSats | null
  earnedAmount: Api.AmountSats | null
  confirmationDuration: Minutes | null
  notes: string | null
}

interface EarnReportTableRow extends EarnReportEntry, TableTypes.TableNode {}

// in the form of yyyy/MM/dd HH:mm:ss - e.g 2009/01/03 02:54:42
type RawYielgenTimestamp = string

const parseYieldgenTimestamp = (val: RawYielgenTimestamp) => {
  // adding the timezone manually so that the date displays with the users timezone
  return new Date(Date.parse(`${val} GMT`))
}

const yieldgenReportLineToEarnReportEntry = (line: string): EarnReportEntry | null => {
  if (!line.includes(',')) return null

  const values = line.split(',')

  // be defensive here - we cannot handle lines with unexpected values
  if (values.length < 8) return null

  return {
    timestamp: parseYieldgenTimestamp(values[0]),
    cjTotalAmount: values[1] !== '' ? parseInt(values[1], 10) : null,
    inputCount: values[2] !== '' ? parseInt(values[2], 10) : null,
    inputAmount: values[3] !== '' ? parseInt(values[3], 10) : null,
    fee: values[4] !== '' ? parseInt(values[4], 10) : null,
    earnedAmount: values[5] !== '' ? parseInt(values[5], 10) : null,
    confirmationDuration: values[6] !== '' ? parseFloat(values[6]) : null,
    notes: values[7] !== '' ? values[7] : null,
  }
}

type YieldgenReportLinesWithHeader = string[]

// exported for tests only
export const yieldgenReportToEarnReportEntries = (lines: YieldgenReportLinesWithHeader) => {
  const empty = lines.length <= 1 // report is "empty" if it just contains the header line
  const linesWithoutHeader = empty ? [] : lines.slice(1, lines.length)

  return linesWithoutHeader
    .map((line) => yieldgenReportLineToEarnReportEntry(line))
    .filter((entry) => entry !== null)
    .map((entry) => entry!)
}

interface EarnReportTableProps {
  data: TableTypes.Data<EarnReportTableRow>
}

const EarnReportTable = ({ data }: EarnReportTableProps) => {
  const { t } = useTranslation()
  const settings = useSettings()

  const tableTheme = useTheme(TABLE_THEME)
  const pagination = usePagination(data, {
    state: {
      page: 0,
      size: 25,
    },
  })

  const tableSort = useSort(
    data,
    {
      state: {
        sortKey: SORT_KEYS.timestamp,
        reverse: true,
      },
    },
    {
      sortIcon: {
        margin: '4px',
        iconDefault: <Sprite symbol="caret-right" width="20" height="20" />,
        iconUp: <Sprite symbol="caret-up" width="20" height="20" />,
        iconDown: <Sprite symbol="caret-down" width="20" height="20" />,
      },
      sortToggleType: SortToggleType.AlternateWithReset,
      sortFns: {
        [SORT_KEYS.timestamp]: (array) => array.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()),
        [SORT_KEYS.earnedAmountInSats]: (array) => array.sort((a, b) => +a.earnedAmount - +b.earnedAmount),
        [SORT_KEYS.cjTotalAmountInSats]: (array) => array.sort((a, b) => +a.cjTotalAmount - +b.cjTotalAmount),
        [SORT_KEYS.inputCount]: (array) => array.sort((a, b) => +a.inputCount - +b.inputCount),
        [SORT_KEYS.inputAmountInSats]: (array) => array.sort((a, b) => +a.inputAmount - +b.inputAmount),
      },
    },
  )

  return (
    <>
      <Table
        data={data}
        theme={tableTheme}
        pagination={pagination}
        sort={tableSort}
        layout={{ custom: true, horizontalScroll: true }}
        className="table striped"
      >
        {(tableList: TableTypes.TableProps<EarnReportTableRow>) => (
          <>
            <Header>
              <HeaderRow>
                <HeaderCellSort sortKey={SORT_KEYS.timestamp}>{t('earn.report.heading_timestamp')}</HeaderCellSort>
                <HeaderCellSort sortKey={SORT_KEYS.earnedAmountInSats}>
                  {t('earn.report.heading_earned')}
                </HeaderCellSort>
                <HeaderCellSort sortKey={SORT_KEYS.cjTotalAmountInSats}>
                  {t('earn.report.heading_cj_amount')}
                </HeaderCellSort>
                <HeaderCellSort sortKey={SORT_KEYS.inputCount}>{t('earn.report.heading_input_count')}</HeaderCellSort>
                <HeaderCellSort sortKey={SORT_KEYS.inputAmountInSats}>
                  {t('earn.report.heading_input_value')}
                </HeaderCellSort>
                <HeaderCell>{t('earn.report.heading_notes')}</HeaderCell>
              </HeaderRow>
            </Header>
            <Body>
              {tableList.map((item: EarnReportTableRow) => {
                return (
                  <Row key={item.id} item={item}>
                    <Cell>{item.timestamp.toLocaleString()}</Cell>
                    <Cell>
                      <Balance
                        valueString={item.earnedAmount?.toString() || ''}
                        convertToUnit={settings.unit}
                        showBalance={true}
                      />
                    </Cell>
                    <Cell>
                      <Balance
                        valueString={item.cjTotalAmount?.toString() || ''}
                        convertToUnit={settings.unit}
                        showBalance={true}
                      />
                    </Cell>
                    <Cell>{item.inputCount}</Cell>
                    <Cell>
                      <Balance
                        valueString={item.inputAmount?.toString() || ''}
                        convertToUnit={settings.unit}
                        showBalance={true}
                      />
                    </Cell>
                    <Cell>{item.notes}</Cell>
                  </Row>
                )
              })}
            </Body>
          </>
        )}
      </Table>
      <div className="mt-4 mb-4 mb-lg-0">
        <TablePagination data={data} pagination={pagination} />
      </div>
    </>
  )
}

interface StatsBoxProps {
  title: string
  value: React.ReactNode
  description?: string
}

function StatsBox({ title, value, description }: StatsBoxProps) {
  return (
    <div className="d-flex flex-1 flex-column border rounded p-3 p-md-4">
      <div className="fs-6 text-center">{title}</div>
      <div className="fs-4 text-center">{value}</div>
      {description ? <div>{description}</div> : null}
    </div>
  )
}

interface EarnReportProps {
  entries: EarnReportEntry[]
  refresh: (signal: AbortSignal) => Promise<void>
}

export function EarnReport({ entries, refresh }: EarnReportProps) {
  const { t } = useTranslation()
  const settings = useSettings()
  const [search, setSearch] = useState('')
  const [isLoadingRefresh, setIsLoadingRefresh] = useState(false)

  const tableData: TableTypes.Data<EarnReportTableRow> = useMemo(() => {
    const searchVal = search.replace('.', '').toLowerCase()
    const filteredEntries =
      searchVal === ''
        ? entries
        : entries.filter((entry) => {
            return (
              entry.timestamp.toLocaleString().toLowerCase().includes(searchVal) ||
              entry.cjTotalAmount?.toString().includes(searchVal) ||
              entry.inputCount?.toString().includes(searchVal) ||
              entry.inputAmount?.toString().includes(searchVal) ||
              entry.earnedAmount?.toString().includes(searchVal) ||
              entry.inputCount?.toString().includes(searchVal) ||
              entry.notes?.toLowerCase().includes(searchVal)
            )
          })
    const nodes = filteredEntries.map((entry, index) => ({
      ...entry,
      id: `${index}`,
    }))

    return { nodes }
  }, [entries, search])

  const earnedTotal: Api.AmountSats = useMemo(() => {
    return entries.map((entry) => entry.earnedAmount ?? 0).reduce((previous, current) => previous + current, 0)
  }, [entries])

  const earned90Days: Api.AmountSats = useMemo(() => {
    return entries
      .filter((it) => it.timestamp.getTime() > Date.now() - 90 * 24 * 60 * 60 * 1_000)
      .map((it) => it.earnedAmount ?? 0)
      .reduce((previous, current) => previous + current, 0)
  }, [entries])

  const earned30Days: Api.AmountSats = useMemo(() => {
    return entries
      .filter((it) => it.timestamp.getTime() > Date.now() - 30 * 24 * 60 * 60 * 1_000)
      .map((it) => it.earnedAmount ?? 0)
      .reduce((previous, current) => previous + current, 0)
  }, [entries])

  const earned24Hours: Api.AmountSats = useMemo(() => {
    return entries
      .filter((it) => it.timestamp.getTime() > Date.now() - 1 * 24 * 60 * 60 * 1_000)
      .map((it) => it.earnedAmount ?? 0)
      .reduce((previous, current) => previous + current, 0)
  }, [entries])

  return (
    <div className={styles.earnReportContainer}>
      <div className={styles.titleBar}>
        <div className="d-flex justify-content-center align-items-center gap-2">
          <rb.Button
            className={styles.refreshButton}
            variant={settings.theme}
            onClick={() => {
              if (isLoadingRefresh) return

              setIsLoadingRefresh(true)

              const abortCtrl = new AbortController()
              refresh(abortCtrl.signal).finally(() => {
                // as refreshing is fast most of the time, add a short delay to avoid flickering
                setTimeout(() => setIsLoadingRefresh(false), 250)
              })
            }}
          >
            {isLoadingRefresh ? (
              <rb.Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
            ) : (
              <Sprite symbol="refresh" width="24" height="24" />
            )}
          </rb.Button>
          <div className="small">
            {search === '' ? (
              <>
                {t('earn.report.text_report_summary', {
                  count: entries.length,
                })}
              </>
            ) : (
              <>
                {t('earn.report.text_report_summary_filtered', {
                  count: tableData.nodes.length,
                })}
              </>
            )}
          </div>
        </div>
        <div>
          <rb.Form.Group controlId="search">
            <rb.Form.Label className="m-0 pe-2 d-none">{t('earn.report.label_search')}</rb.Form.Label>
            <rb.Form.Control
              name="search"
              placeholder={t('earn.report.placeholder_search')}
              value={search}
              disabled={isLoadingRefresh}
              onChange={(e) => setSearch(e.target.value)}
            />
          </rb.Form.Group>
        </div>
      </div>
      <div className="px-3 py-3 pt-lg-0">
        <div className="d-flex flex-wrap justify-content-around align-items-center gap-2">
          <StatsBox
            title={t('earn.report.stats.earned_total')}
            value={
              <Balance valueString={earnedTotal.toString() || ''} convertToUnit={settings.unit} showBalance={true} />
            }
          />
          <StatsBox
            title={t('earn.report.stats.earned_90days')}
            value={
              <Balance valueString={earned90Days.toString() || ''} convertToUnit={settings.unit} showBalance={true} />
            }
          />
          <StatsBox
            title={t('earn.report.stats.earned_30days')}
            value={
              <Balance valueString={earned30Days.toString() || ''} convertToUnit={settings.unit} showBalance={true} />
            }
          />
          <StatsBox
            title={t('earn.report.stats.earned_24hours')}
            value={
              <Balance valueString={earned24Hours.toString() || ''} convertToUnit={settings.unit} showBalance={true} />
            }
          />
        </div>
      </div>
      {entries.length === 0 ? (
        <div className="px-2">
          <rb.Alert variant="info">{t('earn.alert_empty_report')}</rb.Alert>
        </div>
      ) : (
        <div className="px-md-2">
          <EarnReportTable data={tableData} />
        </div>
      )}
    </div>
  )
}

export function EarnReportOverlay({ show, onHide }: rb.OffcanvasProps) {
  const { t } = useTranslation()
  const [alert, setAlert] = useState<SimpleAlert>()
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [entries, setEntries] = useState<EarnReportEntry[] | null>(null)
  const [__dev_showGenerateDemoReportButton] = useState(isDebugFeatureEnabled('enableDemoEarnReport'))

  const __dev_generateDemoReportEntryButton = () => {
    const randomTimestamp = new Date(Date.now() - Date.now() * Math.random() * Math.pow(10, pseudoRandomNumber(-5, -1)))
    setEntries((it) => {
      const connectedNote = {
        timestamp: randomTimestamp,
        cjTotalAmount: null,
        inputCount: null,
        inputAmount: null,
        fee: null,
        earnedAmount: null,
        confirmationDuration: null,
        notes: 'Connected ',
      }
      if (!it || it.length === 0) {
        connectedNote.timestamp = new Date(Date.now() - Date.now() * 0.1)
        return [connectedNote]
      }
      if (it.length > 2 && Math.random() > 0.8) {
        return [...it, connectedNote]
      }
      const randomEntry = {
        timestamp: randomTimestamp,
        cjTotalAmount: Math.round(Math.random() * Math.pow(10, pseudoRandomNumber(7, 9))),
        inputCount: Math.max(1, pseudoRandomNumber(-1, 4)),
        inputAmount: Math.round(Math.random() * Math.pow(10, pseudoRandomNumber(3, 6))),
        fee: Math.round(Math.random() * 100 + 1),
        earnedAmount: Math.round(Math.random() * Math.pow(10, pseudoRandomNumber(1, 3)) + 1),
        confirmationDuration: Math.round(Math.random() * 100),
        notes: null,
      }

      return [...it, randomEntry]
    })
  }

  const refresh = useCallback(
    (signal: AbortSignal) => {
      return Api.getYieldgenReport({ signal })
        .then((res) => {
          if (res.ok) return res.json()
          // 404 is returned till the maker is started at least once
          if (res.status === 404) return { yigen_data: [] }
          return Api.Helper.throwError(res)
        })
        .then((data) => data.yigen_data as YieldgenReportLinesWithHeader)
        .then((linesWithHeader) => yieldgenReportToEarnReportEntries(linesWithHeader))
        .then((earnReportEntries) => {
          if (signal.aborted) return
          setAlert(undefined)
          setEntries(earnReportEntries)
        })
        .catch((e) => {
          if (signal.aborted) return
          const message = t('earn.error_loading_report_failed', {
            reason: e.message || t('global.errors.reason_unknown'),
          })
          setAlert({ variant: 'danger', message })
        })
    },
    [t],
  )

  useEffect(() => {
    if (!show) return

    const abortCtrl = new AbortController()

    setIsLoading(true)
    refresh(abortCtrl.signal).finally(() => {
      if (abortCtrl.signal.aborted) return
      setIsLoading(false)
      setIsInitialized(true)
    })

    return () => {
      abortCtrl.abort()
    }
  }, [show, refresh])

  return (
    <rb.Offcanvas
      className={`offcanvas-fullscreen ${styles.overlayContainer}`}
      show={show}
      onHide={onHide}
      placement="bottom"
    >
      <rb.Offcanvas.Header>
        <rb.Container fluid="lg">
          <div className="w-100 d-flex">
            <div className="d-flex align-items-center flex-1">
              <rb.Offcanvas.Title>{t('earn.report.title')}</rb.Offcanvas.Title>
            </div>
            <div>
              <rb.Button variant="link" className="unstyled pe-0" onClick={onHide}>
                <Sprite symbol="cancel" width="32" height="32" />
              </rb.Button>
            </div>
          </div>
        </rb.Container>
      </rb.Offcanvas.Header>
      <rb.Offcanvas.Body>
        <rb.Container fluid="lg" className="py-3">
          {!isInitialized && isLoading ? (
            Array(5)
              .fill('')
              .map((_, index) => {
                return (
                  <rb.Placeholder key={index} as="div" animation="wave">
                    <rb.Placeholder xs={12} className={styles['report-line-placeholder']} />
                  </rb.Placeholder>
                )
              })
          ) : (
            <>
              {__dev_showGenerateDemoReportButton && (
                <rb.Row>
                  <rb.Col className="px-0 mb-2">
                    <rb.Button
                      className="position-relative"
                      variant="outline-dark"
                      disabled={false}
                      onClick={() => __dev_generateDemoReportEntryButton()}
                    >
                      <div className="d-flex justify-content-center align-items-center">
                        {t('earn.report.text_button_generate_demo_report')}
                        <Sprite symbol="plus" width="20" height="20" className="ms-2" />
                      </div>
                      <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning">
                        dev
                      </span>
                    </rb.Button>
                  </rb.Col>
                </rb.Row>
              )}

              {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
              {entries && (
                <rb.Row>
                  <rb.Col className="px-0">
                    <EarnReport entries={entries} refresh={refresh} />
                  </rb.Col>
                </rb.Row>
              )}
            </>
          )}
        </rb.Container>
      </rb.Offcanvas.Body>
    </rb.Offcanvas>
  )
}
