export interface OrderbookOffer {
  counterparty: string
  oid: number
  ordertype: string
  minsize: number | null | undefined
  maxsize: number | null | undefined
  txfee: number | null | undefined
  cjfee: number | null | undefined
  fidelity_bond_value: number | null | undefined
}

export interface FidelityBond {
  counterparty: string
  amount: number
  locktime: number
}

export interface OrderbookResponse {
  offers: OrderbookOffer[]
  fidelitybonds: FidelityBond[]
}

export const fetchOrderbook = async (): Promise<OrderbookResponse> => {
  const response = await fetch('/obwatch/orderbook.json')

  if (!response.ok) {
    throw new Error(`Failed to fetch orderbook: ${response.status}`)
  }

  const data = await response.json()

  if (!data || !Array.isArray(data.offers)) {
    console.warn('Unexpected orderbook response structure:', data)
    return { offers: [], fidelitybonds: [] }
  }

  return data
}
