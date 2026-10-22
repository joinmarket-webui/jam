export interface RawTransactionOutput {
  value: number
  n: number
  scriptPubKey: {
    address?: string
    type?: string
  }
}

export interface RawTransactionInput {
  txid: string
  vout: number
}

export interface RawTransactionDetails {
  txid: string
  hash: string
  size: number
  vsize: number
  weight: number
  version: number
  locktime: number
  vin: RawTransactionInput[]
  vout: RawTransactionOutput[]
  blockhash?: string
  confirmations?: number
  fee?: number
}

const BITCOIN_RPC_URL = process.env.BITCOIN_RPC_URL || 'http://127.0.0.1:17782'
const BITCOIN_RPC_USER = process.env.BITCOIN_RPC_USER || 'regtest'
const BITCOIN_RPC_PASSWORD = process.env.BITCOIN_RPC_PASSWORD || 'regtest'
const FUNDING_WALLET = 'jam_smoke_funder'

/**
 * Call the published Bitcoin Core RPC endpoint, scoping wallet methods explicitly.
 */
export async function bitcoinRpcCall<T = unknown>(
  method: string,
  parameters: unknown[] = [],
  wallet?: string,
): Promise<T> {
  const authHeader = `Basic ${Buffer.from(`${BITCOIN_RPC_USER}:${BITCOIN_RPC_PASSWORD}`).toString('base64')}`
  const url = wallet ? `${BITCOIN_RPC_URL}/wallet/${encodeURIComponent(wallet)}` : BITCOIN_RPC_URL
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
    },
    body: JSON.stringify({
      jsonrpc: '1.0',
      id: `smoke_${Date.now()}`,
      method,
      params: parameters,
    }),
    signal: AbortSignal.timeout(30_000),
  })
  // Core returns JSON-RPC errors with HTTP 500. Preserve them instead of hiding
  // missing-wallet/authentication errors behind a second transport.
  const data = (await response.json()) as { result: T; error?: { message: string } }
  if (data.error) {
    throw new Error(`Bitcoin RPC Error [${method}]: ${data.error.message}`)
  }
  if (!response.ok) throw new Error(`Bitcoin RPC ${method}: HTTP ${response.status}`)
  return data.result
}

/**
 * The existing initializer mines to a fixed address, not a spendable Core wallet.
 * Create a separate descriptor wallet and mature its coinbase funds for funding Jam.
 */
export async function initializeFundingWallet(): Promise<void> {
  const chain = await bitcoinRpcCall<{ chain: string }>('getblockchaininfo')
  if (chain.chain !== 'regtest') throw new Error('The smoke funding client requires Bitcoin regtest')
  const loaded = await bitcoinRpcCall<string[]>('listwallets')
  if (!loaded.includes(FUNDING_WALLET)) {
    const existing = await bitcoinRpcCall<{ wallets: { name: string }[] }>('listwalletdir')
    if (existing.wallets.some(({ name }) => name === FUNDING_WALLET)) {
      await bitcoinRpcCall('loadwallet', [FUNDING_WALLET])
    } else {
      await bitcoinRpcCall('createwallet', [FUNDING_WALLET])
    }
  }
  await mineBlocksViaBitcoinCore(101)
}

/**
 * Generate a fresh address in the bitcoind wallet.
 */
export async function getNewAddressFromBitcoinCore(): Promise<string> {
  return await bitcoinRpcCall<string>('getnewaddress', [], FUNDING_WALLET)
}

/**
 * Fund a target address with the given amount in BTC.
 */
export async function fundAddressViaBitcoinCore(address: string, amountBtc: number | string): Promise<string> {
  const txid = await bitcoinRpcCall<string>('sendtoaddress', [address, amountBtc], FUNDING_WALLET)
  return txid
}

/**
 * Mine n blocks to an optional address.
 */
export async function mineBlocksViaBitcoinCore(blocks: number = 1, address?: string): Promise<string[]> {
  const targetAddress = address || (await getNewAddressFromBitcoinCore())
  return await bitcoinRpcCall<string[]>('generatetoaddress', [blocks, targetAddress])
}

/**
 * Get verbose raw transaction details from bitcoind.
 */
export async function getRawTransactionDetails(txid: string): Promise<RawTransactionDetails> {
  return await bitcoinRpcCall<RawTransactionDetails>('getrawtransaction', [txid, true])
}

/**
 * Check whether JoinMarket NG session endpoint is ready.
 */
export async function checkNgBackendSession(baseUrl: string = 'http://localhost:3000'): Promise<boolean> {
  try {
    const response = await fetch(`${baseUrl}/api/v1/session`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(5_000),
    })
    return response.ok
  } catch {
    return false
  }
}
