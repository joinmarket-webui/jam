const basePath = () => `${window.JM.PUBLIC_PATH}/obwatch`

interface Order {
  type: string
  counterparty: string
  orderId: string
  fee: string
  minerFeeContribution: string
  minimumSize: string
  maximumSize: string
  bondValue: string
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

const parseOrderbook = (response: Response): Promise<Order[]> => {
  return response.text().then((html) => {
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
