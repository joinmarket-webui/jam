/**
 * Simple collection of api requests to jmwalletd.
 *
 * This is not aiming to be feature-complete.
 *
 * See OpenAPI spec: https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/api/wallet-rpc.yaml
 */

const Authorization = (token) => {
  return { Authorization: `Bearer ${token}` }
}

const getSession = async ({ signal }) => {
  return await fetch(`/api/v1/session`, { signal })
}

const getAddressNew = async ({ walletname, token, accountNr, signal }) => {
  return await fetch(`/api/v1/wallet/${walletname}/address/new/${accountNr}`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

const getWalletAll = async ({ signal }) => {
  return await fetch(`/api/v1/wallet/all`, {
    signal,
  })
}

const postWalletCreate = async ({ walletname, password }) => {
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

const getWalletDisplay = async ({ walletname, token, signal }) => {
  return await fetch(`/api/v1/wallet/${walletname}/display`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

/**
 * Block access to a currently decrypted wallet.
 * After this (authenticated) action, the wallet will not be readable or writeable.
 *
 * Note: Performs a non-idempotent GET request.
 */
const getWalletLock = async ({ walletname, token }) => {
  return await fetch(`/api/v1/wallet/${walletname}/lock`, {
    headers: { ...Authorization(token) },
  })
}

const postWalletUnlock = async ({ walletname }, { password }) => {
  return await fetch(`/api/v1/wallet/${walletname}/unlock`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

const getWalletUtxos = async ({ walletname, token, signal }) => {
  return await fetch(`/api/v1/wallet/${walletname}/utxos`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

const postMakerStart = async ({ walletname, token, signal }, { cjfee_a, cjfee_r, ordertype, minsize }) => {
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

/**
 * Stop the yield generator service.
 *
 * Note: Performs a non-idempotent GET request.
 */
const getMakerStop = async ({ walletname, token }) => {
  return await fetch(`/api/v1/wallet/${walletname}/maker/stop`, {
    headers: { ...Authorization(token) },
  })
}

const postDirectSend = async ({ walletname, token }, { account, destination, amount_sats }) => {
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

const postCoinjoin = async ({ walletname, token }, { account, destination, amount_sats, counterparties }) => {
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
  postMakerStart,
  getMakerStop,
  getSession,
  postDirectSend,
  postCoinjoin,
  getAddressNew,
  getWalletAll,
  postWalletCreate,
  getWalletDisplay,
  getWalletLock,
  postWalletUnlock,
  getWalletUtxos,
}
