import * as Api from '../libs/JmWalletApi'
import { computeQuickRescanStartHeight, extractChainTipHeight, startQuickWalletResync } from './walletResync'

jest.mock('../libs/JmWalletApi', () => ({
  ...jest.requireActual('../libs/JmWalletApi'),
  getGetinfo: jest.fn(),
  getRescanBlockchain: jest.fn(),
}))

describe('walletResync', () => {
  describe('extractChainTipHeight', () => {
    it('extracts numeric blockheight', () => {
      expect(extractChainTipHeight({ blockheight: 123 })).toBe(123)
    })

    it('extracts numeric blockheight from strings', () => {
      expect(extractChainTipHeight({ block_height: '456' })).toBe(456)
    })

    it('returns undefined for invalid candidates', () => {
      expect(extractChainTipHeight({ blockheight: -1 })).toBeUndefined()
      expect(extractChainTipHeight({ blockheight: 'nope' })).toBeUndefined()
      expect(extractChainTipHeight(null)).toBeUndefined()
    })
  })

  describe('computeQuickRescanStartHeight', () => {
    it('computes tip minus lookback', () => {
      expect(computeQuickRescanStartHeight({ chainTipHeight: 100, lookbackBlocks: 20 })).toBe(80)
    })

    it('clamps to 0', () => {
      expect(computeQuickRescanStartHeight({ chainTipHeight: 10, lookbackBlocks: 20 })).toBe(0)
    })
  })

  describe('startQuickWalletResync', () => {
    const wallet = { token: 't', walletFileName: 'Wallet.jmdat' as Api.WalletFileName }

    beforeEach(() => {
      jest.resetAllMocks()
    })

    it('rescans from a computed start height when chain tip is available', async () => {
      ;(Api.getGetinfo as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ blockheight: 5_000 }),
      })
      ;(Api.getRescanBlockchain as jest.Mock).mockResolvedValue({ ok: true })

      const abortCtrl = new AbortController()
      const res = await startQuickWalletResync({ wallet, signal: abortCtrl.signal, lookbackBlocks: 2_016 })

      expect(res.startHeight).toBe(2_984)
      expect(Api.getRescanBlockchain).toHaveBeenCalledWith(
        expect.objectContaining({
          token: wallet.token,
          walletFileName: wallet.walletFileName,
          blockheight: 2_984,
        }),
      )
    })

    it('falls back to start height 0 when chain tip is missing', async () => {
      ;(Api.getGetinfo as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ version: '0.0.0' }),
      })
      ;(Api.getRescanBlockchain as jest.Mock).mockResolvedValue({ ok: true })

      const abortCtrl = new AbortController()
      const res = await startQuickWalletResync({ wallet, signal: abortCtrl.signal, lookbackBlocks: 2_016 })

      expect(res.startHeight).toBe(0)
      expect(Api.getRescanBlockchain).toHaveBeenCalledWith(expect.objectContaining({ blockheight: 0 }))
    })

    it('falls back to start height 0 when getinfo fails', async () => {
      ;(Api.getGetinfo as jest.Mock).mockRejectedValue(new Error('boom'))
      ;(Api.getRescanBlockchain as jest.Mock).mockResolvedValue({ ok: true })

      const abortCtrl = new AbortController()
      const res = await startQuickWalletResync({ wallet, signal: abortCtrl.signal, lookbackBlocks: 2_016 })

      expect(res.startHeight).toBe(0)
      expect(Api.getRescanBlockchain).toHaveBeenCalledWith(expect.objectContaining({ blockheight: 0 }))
    })
  })
})
