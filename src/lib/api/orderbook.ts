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
