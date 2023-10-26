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
  fidelity_bond_value: number // example: 0 (no fb) or 0.0000052877962973
}

const orderbookJson = async ({ signal }: { signal: AbortSignal }) => {
  return await fetch(`${basePath()}/orderbook.json`, {
    signal,
  })
}

const fetchOffers = async (options: { signal: AbortSignal }) => {
  return orderbookJson(options)
    .then((res) => (res.ok ? res.json() : ApiHelper.throwError(res)))
    .then((res) => (res.offers || []) as Offer[])
}

const refreshOffers = async ({ signal }: { signal: AbortSignal }) => {
  return await fetch(`${basePath()}/refreshorderbook`, {
    method: 'POST',
    signal,
  })
}

export { fetchOffers, refreshOffers }
