import React from 'react'
import { Pagination } from '@table-library/react-table-library/pagination'
import * as TableTypes from '@table-library/react-table-library/types/table'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import Sprite from './Sprite'
import styles from './TablePagination.module.css'

const DEFAULT_PAGE_SIZES = [25, 50, 100]
const DEFAULT_ALLOW_SHOW_ALL = true

interface TablePaginationProps {
  data: TableTypes.Data<any>
  pagination: Pagination<any>
  pageSizes?: number[]
  allowShowAll?: boolean
}

export default function TablePagination({
  data,
  pagination,
  pageSizes = DEFAULT_PAGE_SIZES,
  allowShowAll = DEFAULT_ALLOW_SHOW_ALL,
}: TablePaginationProps) {
  const { t } = useTranslation()

  return (
    <div className="d-flex justify-content-between flex-column flex-sm-row">
      <div className="mt-3 mt-md-0 mx-3 mx-md-0 d-flex justify-content-center align-items-center order-2 order-md-1 gap-2">
        <div className="flex-shrink-0">{t('global.table.pagination.items_per_page.label')}</div>
        <rb.Form.Select
          aria-label={t('global.table.pagination.items_per_page.label')}
          className={styles.paginationSelect}
          defaultValue={pageSizes[0]}
          onChange={(e) => {
            const value = parseInt(e.target.value, 10)
            const pageSize = value > 0 ? value : data.nodes.length
            pagination.fns.onSetSize(pageSize)
          }}
        >
          {pageSizes.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
          {allowShowAll && (
            <option value={-1}>{t('global.table.pagination.items_per_page.text_option_show_all')}</option>
          )}
        </rb.Form.Select>
      </div>

      <div className="mt-3 mt-md-0 mx-3 mx-md-0 d-flex justify-content-center align-items-center order-1 order-md-2 gap-1">
        <rb.Button
          aria-label={t('global.table.pagination.page_selector.label_first')}
          variant={'outline-dark'}
          className={styles.paginationButton}
          disabled={pagination.state.page === 0}
          onClick={() => pagination.fns.onSetPage(0)}
        >
          <Sprite symbol="caret-left" width="18" height="18" />
          <Sprite symbol="caret-left" width="18" height="18" />
        </rb.Button>
        <rb.Button
          aria-label={t('global.table.pagination.page_selector.label_previous')}
          variant="outline-dark"
          className={styles.paginationButton}
          disabled={pagination.state.page === 0}
          onClick={() => pagination.fns.onSetPage(pagination.state.page - 1)}
        >
          <Sprite symbol="caret-left" width="18" height="18" />
        </rb.Button>
        <rb.Form.Select
          aria-label={t('global.table.pagination.page_selector.label_current')}
          className={styles.paginationSelect}
          value={pagination.state.page}
          onChange={(e) => {
            const value = parseInt(e.target.value, 10)
            const page = value > 0 ? value : 0
            pagination.fns.onSetPage(page)
          }}
        >
          {pagination.state.getPages(data.nodes).map((_: any, index: number) => (
            <option key={index} value={index}>
              {index + 1}
            </option>
          ))}
        </rb.Form.Select>
        <rb.Button
          aria-label={t('global.table.pagination.page_selector.label_next')}
          variant="outline-dark"
          className={styles.paginationButton}
          disabled={pagination.state.page + 1 === pagination.state.getTotalPages(data.nodes)}
          onClick={() => pagination.fns.onSetPage(pagination.state.page + 1)}
        >
          <Sprite symbol="caret-right" width="18" height="18" />
        </rb.Button>
        <rb.Button
          aria-label={t('global.table.pagination.page_selector.label_last')}
          variant="outline-dark"
          className={styles.paginationButton}
          disabled={pagination.state.page + 1 === pagination.state.getTotalPages(data.nodes)}
          onClick={() => pagination.fns.onSetPage(pagination.state.getTotalPages(data.nodes) - 1)}
        >
          <Sprite symbol="caret-right" width="18" height="18" />
          <Sprite symbol="caret-right" width="18" height="18" />
        </rb.Button>
      </div>
    </div>
  )
}
