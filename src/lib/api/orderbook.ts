import type { OfferType } from '@/constants/jm'
import type { AmountSats } from '@/types/global'

export interface OrderbookOffer {
  counterparty: string
  oid: number
  ordertype: OfferType
  minsize?: AmountSats | null
  maxsize?: AmountSats | null
  txfee?: number | null
  cjfee?: number | null
  fidelity_bond_value?: number | null
  fidelity_bond_verification_stale?: boolean | null
  directory_nodes?: string[] | null
  directly_reachable?: boolean | null
  // TODO: many more fields, e.g.:
  // fidelity_bond_value
  // fidelity_bond_verified
  // features	{ neutrino_compat: true, nick_auth: true, peerlist_features: true, … }
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

  const data: unknown = await response.json()

  if (!data || typeof data !== 'object' || !('offers' in data) || !Array.isArray(data.offers)) {
    console.warn('Unexpected orderbook response structure:', data)
    return { offers: [], fidelitybonds: [] }
  }

  return data as OrderbookResponse
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
