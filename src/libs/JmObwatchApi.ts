import { Helper as ApiHelper } from '../libs/JmWalletApi'

const basePath = () => `${window.JM.PUBLIC_PATH}/obwatch`

export const ABSOLUTE_ORDER_TYPE_VAL = 'Native SW Absolute Fee'
export const RELATIVE_ORDER_TYPE_VAL = 'Native SW Relative Fee'

export interface Order {
  type: string // example: "Native SW Absolute Fee" or "Native SW Relative Fee"
  counterparty: string // example: "J5Bv3JSxPFWm2Yjb"
  orderId: string // example: "0" (not unique!)
  fee: string // example: "0.00000250" (abs offers) or "0.000100%" (rel offers)
  minerFeeContribution: string // example: "0.00000000"
  minimumSize: string // example: "0.00027300"
  maximumSize: string // example: "2374.99972700"
  bondValue: string // example: "0" (no fb) or "0.0000052877962973"
}

const ORDER_KEYS: (keyof Order)[] = [
  'type',
  'counterparty',
  'orderId',
  'fee',
  'minerFeeContribution',
  'minimumSize',
  'maximumSize',
  'bondValue',
]

const parseOrderbook = (res: Response): Promise<Order[]> => {
  if (!res.ok) {
    // e.g. error is raised if ob-watcher is not running
    return ApiHelper.throwError(res)
  }

  return res.text().then((html) => {
    var parser = new DOMParser()
    var doc = parser.parseFromString(html, 'text/html')

    const tables = doc.getElementsByTagName('table')
    if (tables.length !== 1) {
      throw new Error('Cannot find orderbook table')
    }
    const orderbookTable = tables[0]
    const tbodies = [...orderbookTable.children].filter((child) => child.tagName.toLowerCase() === 'tbody')
    if (tbodies.length !== 1) {
      throw new Error('Cannot find orderbook table body')
    }

    const tbody = tbodies[0]

    const orders: Order[] = [...tbody.children]
      .filter((row) => row.tagName.toLowerCase() === 'tr')
      .filter((row) => row.children.length > 0)
      .map((row) => [...row.children].filter((child) => child.tagName.toLowerCase() === 'td'))
      .filter((cols) => cols.length === ORDER_KEYS.length)
      .map((cols) => {
        const data: unknown = ORDER_KEYS.map((key, index) => ({ [key]: cols[index].innerHTML })).reduce(
          (acc, curr) => ({ ...acc, ...curr }),
          {}
        )
        return data as Order
      })

    return orders
  })
}

// TODO: why is "orderbook.json" always empty? -> Parse HTML in the meantime.. ¯\_(ツ)_/¯
const fetchOrderbook = async ({ signal }: { signal: AbortSignal }) => {
  return await fetch(`${basePath()}/`, {
    signal,
  }).then((res) => parseOrderbook(res))
}

export { fetchOrderbook }
