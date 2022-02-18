/**
 * Simple collection of api requests to jmwalletd.
 *
 * This is not aiming to be feature-complete.
 *
 * See OpenAPI spec: https://github.com/JoinMarket-Org/joinmarket-clientserver/blob/master/docs/api/wallet-rpc.yaml
 *
 * Because we forward all requests through a proxy, additional functionality
 * can be provided. One adaptation is to send the Authorization header as
 * 'x-jm-authorization' so that the reverse proxy can apply its own
 * authentication mechanism.
 */

/**
 * Construct a bearer authorization header object for the given token.
 *
 * The 'x-jm-authorization' header is forwarded as 'Authorization' header in
 * requests to jmwalletd by the reverse proxy.
 *
 * @param {string} token the bearer token
 * @returns an object containing the authorization header
 */
const Authorization = (token) => {
  return { 'x-jm-authorization': `Bearer ${token}` }
}

const getSession = async ({ signal }) => {
  return await fetch(`/api/v1/session`, { signal })
}

const getAddressNew = async ({ walletName, token, accountNr, signal }) => {
  return await fetch(`/api/v1/wallet/${walletName}/address/new/${accountNr}`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

const getWalletAll = async ({ signal }) => {
  return await fetch(`/api/v1/wallet/all`, {
    signal,
  })
}

const postWalletCreate = async ({ walletName: name, password }) => {
  const walletname = name.endsWith('.jmdat') ? name : `${name}.jmdat`

  return await fetch(`/api/v1/wallet/create`, {
    method: 'POST',
    body: JSON.stringify({
      wallettype: 'sw-fb',
      walletname,
      password,
    }),
  })
}

const getWalletDisplay = async ({ walletName, token, signal }) => {
  return await fetch(`/api/v1/wallet/${walletName}/display`, {
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
const getWalletLock = async ({ walletName, token }) => {
  return await fetch(`/api/v1/wallet/${walletName}/lock`, {
    headers: { ...Authorization(token) },
  })
}

const postWalletUnlock = async ({ walletName }, { password }) => {
  return await fetch(`/api/v1/wallet/${walletName}/unlock`, {
    method: 'POST',
    body: JSON.stringify({ password }),
  })
}

const getWalletUtxos = async ({ walletName, token, signal }) => {
  return await fetch(`/api/v1/wallet/${walletName}/utxos`, {
    headers: { ...Authorization(token) },
    signal,
  })
}

const postMakerStart = async ({ walletName, token, signal }, { cjfee_a, cjfee_r, ordertype, minsize }) => {
  return await fetch(`/api/v1/wallet/${walletName}/maker/start`, {
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
const getMakerStop = async ({ walletName, token }) => {
  return await fetch(`/api/v1/wallet/${walletName}/maker/stop`, {
    headers: { ...Authorization(token) },
  })
}

const postDirectSend = async ({ walletName, token }, { account, destination, amount_sats }) => {
  return await fetch(`/api/v1/wallet/${walletName}/taker/direct-send`, {
    method: 'POST',
    headers: { ...Authorization(token) },
    body: JSON.stringify({
      mixdepth: String(account),
      destination,
      amount_sats,
    }),
  })
}

const postCoinjoin = async ({ walletName, token }, { account, destination, amount_sats, counterparties }) => {
  return await fetch(`/api/v1/wallet/${walletName}/taker/coinjoin`, {
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

const getYieldgenReport = async ({ signal }) => {
  return await fetch(`/api/v1/wallet/yieldgen/report`, {
    signal,
  })
}

const postFreeze = async ({ walletName, token }, { utxo, freeze = true }) => {
  return await fetch(`/api/v1/wallet/${walletName}/freeze`, {
    method: 'POST',
    headers: { ...Authorization(token) },
    body: JSON.stringify({
      'utxo-string': utxo,
      freeze,
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
  getYieldgenReport,
  postFreeze,
}
