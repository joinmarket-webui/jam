import type { OfferType } from '@/constants/jm'
import type { AmountSats } from '@/types/global'

export interface OrderbookOffer {
  counterparty: string
  oid: number
  ordertype: OfferType
  minsize: AmountSats | null | undefined
  maxsize: AmountSats | null | undefined
  txfee: number | null | undefined
  cjfee: number | null | undefined
  fidelity_bond_value: number | null | undefined
}

export interface OrderbookFidelityBond {
  counterparty: string
  amount: number
  locktime: number
}

export interface OrderbookResponse {
  offers: OrderbookOffer[]
  fidelitybonds: OrderbookFidelityBond[]
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

export const refreshOrderbook = async (): Promise<Response> => {
  const response = await fetch('/obwatch/refreshorderbook', {
    method: 'POST',
    // endpoint adds a redirect ('Location' header) that we do not want to follow as it is likely
    // to be a local address (localhost, 127.0.0.1) that might not be reachable without proxy
    redirect: 'manual',
  })

  if (!response.ok && response.type !== 'opaqueredirect') {
    throw new Error(`Failed to refresh orderbook: ${response.status}`)
  }
  return response
}
