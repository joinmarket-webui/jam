/**
 * Simple collection of all api requests to jmwalletd.
 *
 * It is not tried to be feature-complete, but to represent only what is really used.
 *
 * See OpenAPI spec: https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/api/wallet-rpc.yaml
 */

const Authorization = (token) => {
  return { Authorization: `Bearer ${token}` }
}

const session = async ({ signal }) => {
  return await fetch(`/api/v1/session`, { signal })
}

const walletAddressNew = async ({ walletname, token, accountNr, signal }) => {
  return await fetch(`/api/v1/wallet/${walletname}/address/new/${accountNr}`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

const walletAll = async ({ signal }) => {
  return await fetch(`/api/v1/wallet/all`, {
    signal,
  })
}

const walletCreate = async ({ walletname, password }) => {
  const wallettype = 'sw-fb'

  return await fetch(`/api/v1/wallet/create`, {
    method: 'POST',
    body: JSON.stringify({
      password,
      walletname,
      wallettype,
    }),
  })
}

const walletDisplay = async ({ walletname, token, signal }) => {
  return await fetch(`/api/v1/wallet/${walletname}/display`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

const walletLock = async ({ walletname, token }) => {
  return await fetch(`/api/v1/wallet/${walletname}/lock`, {
    headers: { ...Authorization(token) },
  })
}

const walletUnlock = async ({ walletname }, { password }) => {
  return await fetch(`/api/v1/wallet/${walletname}/unlock`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

const walletUtxos = async ({ walletname, token, signal }) => {
  return await fetch(`/api/v1/wallet/${walletname}/utxos`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

const makerStart = async ({ walletname, token, signal }, { cjfee_a, cjfee_r, ordertype, minsize }) => {
  return await fetch(`/api/v1/wallet/${walletname}/maker/start`, {
    method: 'POST',
    headers: { ...Authorization(token) },
    signal,
    body: JSON.stringify({
      txfee: 0,
      cjfee_a,
      cjfee_r,
      ordertype,
      minsize,
    }),
  })
}

const makerStop = async ({ walletname, token }) => {
  return await fetch(`/api/v1/wallet/${walletname}/maker/stop`, {
    headers: { ...Authorization(token) },
  })
}

const takerDirectSend = async ({ walletname, token }, { account, destination, amount_sats }) => {
  return await fetch(`/api/v1/wallet/${walletname}/taker/direct-send`, {
    method: 'POST',
    headers: { ...Authorization(token) },
    body: JSON.stringify({
      mixdepth: String(account),
      destination,
      amount_sats,
    }),
  })
}

const takerCoinjoin = async ({ walletname, token }, { account, destination, amount_sats, counterparties }) => {
  return await fetch(`/api/v1/wallet/${walletname}/taker/coinjoin`, {
    method: 'POST',
    headers: { ...Authorization(token) },
    body: JSON.stringify({
      mixdepth: String(account),
      destination,
      amount_sats,
      counterparties,
    }),
  })
}

export {
  makerStart,
  makerStop,
  session,
  takerDirectSend,
  takerCoinjoin,
  walletAddressNew,
  walletAll,
  walletCreate,
  walletDisplay,
  walletLock,
  walletUnlock,
  walletUtxos,
}
