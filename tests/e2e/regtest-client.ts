import { execSync } from 'node:child_process'
import path from 'node:path'

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
const DOCKER_COMPOSE_PROJECT = process.env.SMOKE_COMPOSE_PROJECT || 'jam-smoke'
const COMPOSE_FILE_PATH = path.resolve(import.meta.dirname, './docker-compose.smoke.yml')

/**
 * Call Bitcoin Core RPC either through direct HTTP or falling back to docker-compose exec.
 */
export async function bitcoinRpcCall<T = unknown>(method: string, parameters: unknown[] = []): Promise<T> {
  const authHeader = `Basic ${Buffer.from(`${BITCOIN_RPC_USER}:${BITCOIN_RPC_PASSWORD}`).toString('base64')}`

  try {
    const response = await fetch(BITCOIN_RPC_URL, {
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
    })

    if (response.ok) {
      const data = (await response.json()) as { result: T; error?: { message: string } }
      if (data.error) {
        throw new Error(`Bitcoin RPC Error [${method}]: ${data.error.message}`)
      }
      return data.result
    }
  } catch (error: unknown) {
    // If HTTP fails (e.g. host port mapping delayed), fall back to docker exec
    const message = error instanceof Error ? error.message : String(error)
    if (!message.includes('ECONNREFUSED') && !message.includes('fetch failed')) {
      throw error
    }
  }

  // Fallback via docker compose exec
  return execBitcoinCli<T>(method, parameters)
}

/**
 * Execute bitcoin-cli command inside the isolated bitcoind container.
 */
export function execBitcoinCli<T = unknown>(method: string, parameters: unknown[] = []): T {
  const cliArguments = parameters.map((parameter) => {
    if (typeof parameter === 'string') return parameter
    if (typeof parameter === 'number' || typeof parameter === 'boolean') return String(parameter)
    return JSON.stringify(parameter)
  })

  const command = `docker compose -p "${DOCKER_COMPOSE_PROJECT}" -f "${COMPOSE_FILE_PATH}" exec -T bitcoind bitcoin-cli -datadir=/home/bitcoin/data -regtest -rpcport=43782 -rpcuser=${BITCOIN_RPC_USER} -rpcpassword=${BITCOIN_RPC_PASSWORD} ${method} ${cliArguments.join(' ')}`

  try {
    const stdout = execSync(command, { encoding: 'utf8', timeout: 30_000 }).trim()
    try {
      return JSON.parse(stdout) as T
    } catch {
      return stdout as unknown as T
    }
  } catch (error: unknown) {
    const errorDetails = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to execute bitcoin-cli ${method}: ${errorDetails}`)
  }
}

/**
 * Generate a fresh address in the bitcoind wallet.
 */
export async function getNewAddressFromBitcoinCore(): Promise<string> {
  return await bitcoinRpcCall<string>('getnewaddress')
}

/**
 * Fund a target address with the given amount in BTC.
 */
export async function fundAddressViaBitcoinCore(address: string, amountBtc: number | string): Promise<string> {
  const txid = await bitcoinRpcCall<string>('sendtoaddress', [address, amountBtc])
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
    })
    return response.ok
  } catch {
    return false
  }
}
