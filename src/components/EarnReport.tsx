import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Table, Header, HeaderRow, HeaderCell, Body, Row, Cell } from '@table-library/react-table-library/table'
import { useSort, HeaderCellSort, SortToggleType } from '@table-library/react-table-library/sort'
import { usePagination, Pagination } from '@table-library/react-table-library/pagination'
import * as TableTypes from '@table-library/react-table-library/types/table'
import { useTheme } from '@table-library/react-table-library/theme'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import * as Api from '../libs/JmWalletApi'
// @ts-ignore
import { useSettings } from '../context/SettingsContext'
import Balance from './Balance'
import Sprite from './Sprite'
import styles from './EarnReport.module.css'

const SORT_KEYS = {
  timestamp: 'TIMESTAMP',
  cjTotalAmountInSats: 'CJ_TOTAL_AMOUNT_IN_SATS',
  inputCount: 'INPUT_COUNT',
  inputAmountInSats: 'INPUT_AMOUNT_IN_SATS',
  feeInSats: 'FEE_IN_SATS',
  earnedAmountInSats: 'EARNED_AMOUNT_IN_SATS',
}

const TABLE_THEME = {
  Table: `
    --data-table-library_grid-template-columns: 2fr 2fr 1fr 2fr 2fr 2fr 2fr;
    font-size: 0.9rem;
  `,
  BaseCell: `
    &:nth-of-type(2) button {
      display: flex;
      justify-content: end;
    }
    &:nth-of-type(3) button {
      display: flex;
      justify-content: center;
    }
    &:nth-of-type(4) button {
      display: flex;
      justify-content: end;
    }
    &:nth-of-type(5) button {
      display: flex;
      justify-content: end;
    }
    &:nth-of-type(6) button {
      display: flex;
      justify-content: end;
    }
  `,
  Cell: `
    &:nth-of-type(2) {
      text-align: right;
    }
    &:nth-of-type(3) {
      text-align: center;
    }
    &:nth-of-type(4) {
      text-align: right;
    }
    &:nth-of-type(5) {
      text-align: right;
    }
    &:nth-of-type(6) {
      text-align: right;
    }
  `,
}

const TABLE_PAGE_SIZES = [25, 50, 100]

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

// in the form of yyyy/MM/dd HH:mm:ss - e.g 2009/01/03 02:54:42
type RawYielgenTimestamp = string

const parseYieldgenTimestamp = (val: RawYielgenTimestamp) => {
  // adding the timezone manually will display the date in the users timezone correctly
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

const yieldgenReportToEarnReportEntries = (lines: YieldgenReportLinesWithHeader) => {
  const empty = lines.length < 2 // report is "empty" if it just contains the header line
  const linesWithoutHeader = empty ? [] : lines.slice(1, lines.length)

  return linesWithoutHeader
    .map((line) => yieldgenReportLineToEarnReportEntry(line))
    .filter((entry) => entry !== null)
    .map((entry) => entry!)
}

// `TableNode` is known to have same properties as `EarnReportEntry`, hence prefer casting over object destructuring
const toEarnReportEntry = (tableNode: TableTypes.TableNode) => tableNode as unknown as EarnReportEntry

interface TablePaginationProps {
  tableData: TableTypes.Data
  pagination: Pagination
  pageSizes: number[]
  allowShowAll?: boolean
}

const TablePagination = ({ tableData, pagination, pageSizes, allowShowAll = true }: TablePaginationProps) => {
  const { t } = useTranslation()

  return (
    <div className="mt-4 mb-4 mb-md-0 d-flex justify-content-between flex-column flex-md-row">
      <div className="mt-3 mt-md-0 ms-3 ms-md-0 d-flex justify-content-center align-items-center order-2 order-md-1">
        {t('earn.report.pagination.items_per_page.label')}
        <rb.Form.Select
          aria-label={t('earn.report.pagination.items_per_page.label')}
          className="ms-2 d-inline-block w-auto"
          defaultValue={pageSizes[0]}
          onChange={(e) => {
            const value = parseInt(e.target.value, 10)
            const pageSize = value > 0 ? value : tableData.nodes.length
            pagination.fns.onSetSize(pageSize)
          }}
        >
          {pageSizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
          {allowShowAll && (
            <option value={-1}>{t('earn.report.pagination.items_per_page.text_option_show_all')}</option>
          )}
        </rb.Form.Select>
      </div>

      <div className="mt-3 mt-md-0 ms-3 ms-md-0 d-flex justify-content-center align-items-center order-1 order-md-2">
        <rb.Button
          variant={'outline-dark'}
          className="ms-1"
          disabled={pagination.state.page === 0}
          onClick={() => pagination.fns.onSetPage(0)}
        >
          {t('earn.report.pagination.page_selector.label_first')}
        </rb.Button>
        <rb.Button
          variant="outline-dark"
          className="ms-1"
          disabled={pagination.state.page === 0}
          onClick={() => pagination.fns.onSetPage(pagination.state.page - 1)}
        >
          {t('earn.report.pagination.page_selector.label_previous')}
        </rb.Button>
        <rb.Form.Select
          aria-label={t('earn.report.pagination.page_selector.label')}
          className="ms-1 d-inline-block w-auto h-auto"
          value={pagination.state.page}
          onChange={(e) => {
            const value = parseInt(e.target.value, 10)
            const page = value > 0 ? value : 0
            pagination.fns.onSetPage(page)
          }}
        >
          {pagination.state.getPages(tableData.nodes).map((_: any, index: number) => (
            <option key={index} value={index}>
              {index + 1}
            </option>
          ))}
        </rb.Form.Select>
        <rb.Button
          variant="outline-dark"
          className="ms-1"
          disabled={pagination.state.page + 1 === pagination.state.getTotalPages(tableData.nodes)}
          onClick={() => pagination.fns.onSetPage(pagination.state.page + 1)}
        >
          {t('earn.report.pagination.page_selector.label_next')}
        </rb.Button>
        <rb.Button
          variant="outline-dark"
          className="ms-1"
          disabled={pagination.state.page + 1 === pagination.state.getTotalPages(tableData.nodes)}
          onClick={() => pagination.fns.onSetPage(pagination.state.getTotalPages(tableData.nodes) - 1)}
        >
          {t('earn.report.pagination.page_selector.label_last')}
        </rb.Button>
      </div>
    </div>
  )
}

interface EarnReportTableProps {
  tableData: TableTypes.Data
}

const EarnReportTable = ({ tableData }: EarnReportTableProps) => {
  const { t } = useTranslation()
  const settings = useSettings()

  const tableTheme = useTheme(TABLE_THEME)

  const tableSort = useSort(
    tableData,
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
        [SORT_KEYS.cjTotalAmountInSats]: (array) => array.sort((a, b) => +a.cjTotalAmount - +b.cjTotalAmount),
        [SORT_KEYS.inputCount]: (array) => array.sort((a, b) => +a.inputCount - +b.inputCount),
        [SORT_KEYS.inputAmountInSats]: (array) => array.sort((a, b) => +a.inputAmount - +b.inputAmount),
        [SORT_KEYS.feeInSats]: (array) => array.sort((a, b) => +a.fee - +b.fee),
        [SORT_KEYS.earnedAmountInSats]: (array) => array.sort((a, b) => +a.earnedAmount - +b.earnedAmount),
      },
    }
  )

  const pagination = usePagination(tableData, {
    state: {
      page: 0,
      size: TABLE_PAGE_SIZES[0],
    },
  })

  return (
    <>
      <Table
        data={tableData}
        theme={tableTheme}
        pagination={pagination}
        sort={tableSort}
        layout={{ custom: true, horizontalScroll: true }}
      >
        {(tableList) => (
          <>
            <Header>
              <HeaderRow>
                <HeaderCellSort sortKey={SORT_KEYS.timestamp}>{t('earn.report.heading_timestamp')}</HeaderCellSort>
                <HeaderCellSort sortKey={SORT_KEYS.cjTotalAmountInSats}>
                  {t('earn.report.heading_cj_amount')}
                </HeaderCellSort>
                <HeaderCellSort sortKey={SORT_KEYS.inputCount}>{t('earn.report.heading_input_count')}</HeaderCellSort>
                <HeaderCellSort sortKey={SORT_KEYS.inputAmountInSats}>
                  {t('earn.report.heading_input_value')}
                </HeaderCellSort>
                <HeaderCellSort sortKey={SORT_KEYS.feeInSats}>{t('earn.report.heading_cj_fee')}</HeaderCellSort>
                <HeaderCellSort sortKey={SORT_KEYS.earnedAmountInSats}>
                  {t('earn.report.heading_earned')}
                </HeaderCellSort>
                <HeaderCell>{t('earn.report.heading_notes')}</HeaderCell>
              </HeaderRow>
            </Header>
            <Body>
              {tableList.map((item) => {
                const entry = toEarnReportEntry(item)
                return (
                  <Row key={item.id} item={item}>
                    <Cell>{entry.timestamp.toLocaleString()}</Cell>
                    <Cell>
                      <Balance
                        valueString={entry.cjTotalAmount?.toString() || ''}
                        convertToUnit={settings.unit}
                        showBalance={true}
                      />
                    </Cell>
                    <Cell>{entry.inputCount}</Cell>
                    <Cell>
                      <Balance
                        valueString={entry.inputAmount?.toString() || ''}
                        convertToUnit={settings.unit}
                        showBalance={true}
                      />
                    </Cell>
                    <Cell>
                      <Balance
                        valueString={entry.fee?.toString() || ''}
                        convertToUnit={settings.unit}
                        showBalance={true}
                      />
                    </Cell>
                    <Cell>
                      <Balance
                        valueString={entry.earnedAmount?.toString() || ''}
                        convertToUnit={settings.unit}
                        showBalance={true}
                      />
                    </Cell>
                    <Cell>{entry.notes}</Cell>
                  </Row>
                )
              })}
            </Body>
          </>
        )}
      </Table>
      <TablePagination pagination={pagination} tableData={tableData} pageSizes={TABLE_PAGE_SIZES} />
    </>
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

  const tableData: TableTypes.Data = useMemo(() => {
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
              entry.fee?.toString().includes(searchVal) ||
              entry.earnedAmount?.toString().includes(searchVal) ||
              entry.inputCount?.toString().includes(searchVal) ||
              entry.confirmationDuration?.toString().includes(searchVal) ||
              entry.notes?.toLowerCase().includes(searchVal)
            )
          })
    const nodes = filteredEntries.map((entry, index) => ({
      ...entry,
      id: `${index}`,
    }))

    return { nodes }
  }, [entries, search])

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
      <div className="px-md-3 pb-2">
        {entries.length === 0 ? (
          <rb.Alert variant="info">{t('earn.alert_empty_report')}</rb.Alert>
        ) : (
          <EarnReportTable tableData={tableData} />
        )}
      </div>
    </div>
  )
}

export function EarnReportOverlay({ show, onHide }: rb.OffcanvasProps) {
  const { t } = useTranslation()
  const [alert, setAlert] = useState<(rb.AlertProps & { message: string }) | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [entries, setEntries] = useState<EarnReportEntry[] | null>(null)

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
          setAlert(null)
          setEntries(earnReportEntries)
        })
        .catch((e) => {
          if (signal.aborted) return
          const message = t('earn.error_loading_report_failed', {
            reason: e.message || 'Unknown reason',
          })
          setAlert({ variant: 'danger', message })
        })
    },
    [t]
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
        <rb.Container>
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
        <rb.Container fluid="md" className="py-4 py-sm-5">
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
              {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
              {entries && (
                <rb.Row>
                  <rb.Col>
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
