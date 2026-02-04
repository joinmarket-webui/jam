import * as Api from '../libs/JmWalletApi'

type ChainTipHeight = number

const toFiniteSafeInt = (candidate: unknown): number | undefined => {
  if (typeof candidate === 'number' && Number.isFinite(candidate)) return Math.trunc(candidate)
  if (typeof candidate === 'string' && candidate.trim() !== '') {
    const parsed = Number(candidate)
    if (Number.isFinite(parsed)) return Math.trunc(parsed)
  }
  return undefined
}

export const extractChainTipHeight = (data: unknown): ChainTipHeight | undefined => {
  if (!data || typeof data !== 'object') return undefined

  const obj = data as { [key: string]: unknown }

  const candidate =
    obj.blockheight ??
    obj.block_height ??
    obj.blockHeight ??
    obj.chain_tip ??
    obj.chainTip ??
    obj.chain_height ??
    obj.chainHeight ??
    obj.tip_height ??
    obj.tipHeight ??
    obj.height

  const parsed = toFiniteSafeInt(candidate)
  if (parsed === undefined || parsed < 0) return undefined
  return parsed
}

export const computeQuickRescanStartHeight = ({
  chainTipHeight,
  lookbackBlocks,
}: {
  chainTipHeight: ChainTipHeight
  lookbackBlocks: number
}): number => {
  return Math.max(0, chainTipHeight - lookbackBlocks)
}

export const startQuickWalletResync = async ({
  wallet,
  signal,
  lookbackBlocks,
}: {
  wallet: Api.WalletRequestContext
  signal: AbortSignal
  lookbackBlocks: number
}): Promise<{ chainTipHeight?: ChainTipHeight; startHeight: number }> => {
  let chainTipHeight: ChainTipHeight | undefined

  try {
    const getInfoRes = await Api.getGetinfo({ signal })
    if (getInfoRes.ok) {
      const data = await getInfoRes.json()
      chainTipHeight = extractChainTipHeight(data)
    }
  } catch (_) {
    // Ignore: fall back to a safe rescan height below.
  }

  // If we cannot determine the chain tip height, fall back to scanning from height 0.
  // This is slower, but avoids starting beyond the current chain tip (which would error).
  const startHeight =
    chainTipHeight !== undefined ? computeQuickRescanStartHeight({ chainTipHeight, lookbackBlocks }) : 0

  const rescanRes = await Api.getRescanBlockchain({ ...wallet, signal, blockheight: startHeight })
  if (!rescanRes.ok) {
    await Api.Helper.throwError(rescanRes)
  }

  return { chainTipHeight, startHeight }
}
