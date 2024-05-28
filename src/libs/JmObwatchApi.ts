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

export interface FidelityBond {
  counterparty: string // example: "J5Bv3JSxPFWm2Yjb"
  bond_value: number // example: 82681607.26848702,
  locktime: number // example: 1725148800
  amount: AmountSats // example: 312497098
  script: string // example: 002059e6f4a2afbb87c9967530955d091d7954f9364cd829b6012bdbcb38fab5e383
  utxo_confirmations: number // example: 10
  utxo_confirmation_timestamp: number // example: 1716876653
  utxo_pub: string // example: 02d46a9001a5430c0aa1e3ad0c004b409a932d3ae99b19617f0ab013b12076c082
  cert_expiry: number // example: 1
}

export interface OrderbookJson {
  offers?: Offer[]
  fidelitybonds?: FidelityBond[]
}

const orderbookJson = async ({ signal }: { signal: AbortSignal }) => {
  return await fetch(`${basePath()}/orderbook.json`, {
    signal,
  })
}

const fetchOrderbook = async (options: { signal: AbortSignal }): Promise<OrderbookJson> => {
  return orderbookJson(options).then((res) => (res.ok ? res.json() : ApiHelper.throwError(res)))
}

const refreshOrderbook = async ({ signal, redirect }: { signal: AbortSignal; redirect: RequestRedirect }) => {
  return await fetch(`${basePath()}/refreshorderbook`, {
    method: 'POST',
    redirect,
    signal,
  })
}

export { fetchOrderbook, refreshOrderbook }
