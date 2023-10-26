import { AmountSats, Helper as ApiHelper } from '../libs/JmWalletApi'

const basePath = () => `${window.JM.PUBLIC_PATH}/obwatch`

export interface Offer {
  counterparty: string // example: "J5Bv3JSxPFWm2Yjb"
  oid: number // example: 0 (not unique!)
  ordertype: string // example: "sw0absoffer" or "sw0reloffer"
  minsize: AmountSats // example: 27300
  maxsize: AmountSats // example: 237499972700
  txfee: AmountSats // example: 0
  cjfee: AmountSats | string // example: 250 (abs offers) or "0.00017" (rel offers)
  fidelity_bond_value: number // example: 0 (no fb) or 114557102085.28133
}

export interface OrderbookJson {
  offers?: Offer[]
}

const orderbookJson = async ({ signal }: { signal: AbortSignal }) => {
  return await fetch(`${basePath()}/orderbook.json`, {
    signal,
  })
}

const fetchOrderbook = async (options: { signal: AbortSignal }): Promise<OrderbookJson> => {
  return orderbookJson(options).then((res) => (res.ok ? res.json() : ApiHelper.throwError(res)))
}

const refreshOrderbook = async ({ signal }: { signal: AbortSignal }) => {
  return await fetch(`${basePath()}/refreshorderbook`, {
    method: 'POST',
    signal,
  })
}

export { fetchOrderbook, refreshOrderbook }
