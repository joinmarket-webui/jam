import React, { useEffect, useState } from 'react'
import * as rb from 'react-bootstrap'
import { useTranslation } from 'react-i18next'
import * as ObwatchApi from '../libs/JmObwatchApi'
// @ts-ignore
import { useSettings } from '../context/SettingsContext'
import Balance from './Balance'
import styles from './Orderbook.module.css'

interface OrderbookTableProps {
  orders: ObwatchApi.Order[]
  maxAmountOfRows?: number
}

type OrderPropName = keyof ObwatchApi.Order

const OrderbookTable = ({ orders }: OrderbookTableProps) => {
  const { t } = useTranslation()
  const settings = useSettings()

  const headingMap: { [name in OrderPropName]: { heading: string; format?: string } } = {
    type: {
      heading: t('orderbook.table.heading_type'),
      // example: "Native SW Absolute Fee"
    },
    counterparty: {
      heading: t('orderbook.table.heading_counterparty'),
      // example: "J5Bv3JSxPFWm2Yjb"
    },
    orderId: {
      heading: t('orderbook.table.heading_order_id'),
      // example: "0"
    },
    fee: {
      heading: t('orderbook.table.heading_fee'),
      format: 'balance',
      // example: "0.00000250"
    },
    minerFeeContribution: {
      heading: t('orderbook.table.heading_miner_fee_contribution'),
      format: 'balance',
      // example: "0.00000000"
    },
    minimumSize: {
      heading: t('orderbook.table.heading_minimum_size'),
      format: 'balance',
      // example: "0.00027300"
    },
    maximumSize: {
      heading: t('orderbook.table.heading_maximum_size'),
      format: 'balance',
      // example: "2374.99972700"
    },
    bondValue: {
      heading: t('orderbook.table.heading_bond_value'),
      // example: "0"
    },
  }

  const columns: OrderPropName[] = Object.keys(headingMap) as OrderPropName[]
  const counterpartyCount = new Set(orders.map((it) => it.counterparty)).size

  return (
    <>
      {orders.length === 0 ? (
        <rb.Alert variant="info">{t('orderbook.alert_empty_orderbook')}</rb.Alert>
      ) : (
        <div>
          <div className="mb-2 d-flex justify-content-start">
            <small>
              {t('orderbook.text_orderbook_summary', {
                counterpartyCount,
                orderCount: orders.length,
              })}
            </small>
          </div>
          <rb.Table striped bordered hover variant={settings.theme} responsive>
            <thead>
              <tr>
                {Object.values(headingMap).map((header, index) => (
                  <th key={`header_${index}`}>{header.heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.orderId}>
                  {columns.map((propName) => (
                    <td key={propName}>
                      {headingMap[propName] && headingMap[propName]?.format === 'balance' ? (
                        <Balance valueString={order[propName]} convertToUnit={settings.unit} showBalance={true} />
                      ) : (
                        order[propName]
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </rb.Table>
        </div>
      )}
    </>
  )
}

export function Orderbook() {
  const { t } = useTranslation()
  const [alert, setAlert] = useState<(rb.AlertProps & { message: string }) | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [orders, setOrders] = useState<ObwatchApi.Order[] | null>(null)

  useEffect(() => {
    setIsLoading(true)

    const abortCtrl = new AbortController()

    ObwatchApi.fetchOrderbook({ signal: abortCtrl.signal })
      .then((orders) => {
        if (abortCtrl.signal.aborted) return
        setOrders(orders)
      })
      .catch((e) => {
        if (abortCtrl.signal.aborted) return
        const message = e.message || t('orderbook.error_loading_orderbook_failed')
        setAlert({ variant: 'danger', message })
      })
      .finally(() => {
        if (abortCtrl.signal.aborted) return
        setIsLoading(false)
        setIsInitialized(true)
      })

    return () => {
      abortCtrl.abort()
    }
  }, [t])

  return (
    <div>
      {!isInitialized && isLoading ? (
        Array(5)
          .fill('')
          .map((_, index) => {
            return (
              <rb.Placeholder key={index} as="div" animation="wave">
                <rb.Placeholder xs={12} className={styles['orderbook-line-placeholder']} />
              </rb.Placeholder>
            )
          })
      ) : (
        <>
          {alert && <rb.Alert variant={alert.variant}>{alert.message}</rb.Alert>}
          {orders && (
            <rb.Row>
              <rb.Col className="mb-3">
                <OrderbookTable orders={orders} />
              </rb.Col>
            </rb.Row>
          )}
        </>
      )}
    </div>
  )
}

export function OrderbookOverlay({ show, onHide }: rb.OffcanvasProps) {
  const { t } = useTranslation()

  return (
    <rb.Offcanvas className={styles['orderbook-overlay']} show={show} onHide={onHide} placement="bottom">
      <rb.Offcanvas.Header closeButton>
        <rb.Offcanvas.Title>{t('orderbook.title')}</rb.Offcanvas.Title>
      </rb.Offcanvas.Header>
      <rb.Offcanvas.Body>
        <Orderbook />
      </rb.Offcanvas.Body>
    </rb.Offcanvas>
  )
}
