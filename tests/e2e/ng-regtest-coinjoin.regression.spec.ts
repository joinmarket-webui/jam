import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  createWalletViaUi,
  dismissOverlays,
  fundWalletViaUi,
  lockWalletAndVerifyLogout,
  lockWalletIfActive,
  submitCollaborativeSend,
  takerStatusCard,
  waitForBackendAndOpenJam,
} from './jam-ui'
import {
  countOrderbookOffers,
  getNewAddressFromBitcoinCore,
  getRawTransactionDetails,
  mineBlocksViaBitcoinCore,
} from './regtest-client'

const EVIDENCE_DIR = path.resolve(import.meta.dirname, '../../test-evidence')

/**
 * Long running regression suite: needs makers, e.g. the isolated smoke environment started with makers
 * (`npm run e2e:regression:up`) or the full regtest environment (`npm run regtest:up`).
 */
test.describe('JoinMarket NG Regtest CoinJoin Regression Suite', () => {
  let walletName: string
  let walletPassword: string

  const FUNDING_AMOUNT_BTC = '0.001'
  const FUNDING_AMOUNT_SATS = 100_000
  const COINJOIN_AMOUNT_SATS = 30_000

  test.beforeAll(async () => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
    const uniqueSuffix = Date.now().toString(36)
    walletName = `regression_${uniqueSuffix}`
    walletPassword = `RegressionPass_${uniqueSuffix}_!99`
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await lockWalletIfActive(page)
    }
  })

  test('Collaborative send completes and reports the taker status until acknowledged', async ({ page }) => {
    // the taker waits for offers of makers, which takes a while
    test.setTimeout(420_000)

    await dismissOverlays(page)

    await test.step('A. Startup, backend and maker readiness verification', async () => {
      await waitForBackendAndOpenJam(page)

      const offerCount = await countOrderbookOffers()
      expect(
        offerCount,
        'Orderbook must contain offers - this suite needs makers (e.g. full regtest environment: `npm run regtest:up`)',
      ).toBeGreaterThan(0)
    })

    await test.step('B. Create and fund disposable wallet', async () => {
      await createWalletViaUi(page, walletName, walletPassword)
      await fundWalletViaUi(page, walletName, FUNDING_AMOUNT_BTC, FUNDING_AMOUNT_SATS)

      // the taker only spends coins with enough confirmations (`taker_utxo_age`)
      await mineBlocksViaBitcoinCore(5)
    })

    await test.step('C. Collaborative send completes and reports the taker status', async () => {
      const destinationAddress = await getNewAddressFromBitcoinCore()
      await submitCollaborativeSend(page, { address: destinationAddress, amountSats: COINJOIN_AMOUNT_SATS })

      // the status card reports the progress while the taker is running ...
      const statusCard = takerStatusCard(page)
      await expect(statusCard).toBeVisible({ timeout: 30_000 })
      await expect(statusCard.getByTestId('taker-status-text')).toHaveText('Evaluating offers...', { timeout: 30_000 })
      await expect(statusCard.getByRole('button', { name: /^abort$/i })).toBeVisible()

      // ... and stays visible with the final outcome once the taker stopped
      const doneButton = statusCard.getByRole('button', { name: /^done$/i })
      await expect(doneButton).toBeVisible({ timeout: 300_000 })
      await expect(statusCard.getByRole('button', { name: /^abort$/i })).toBeHidden()
      await expect(statusCard.getByTestId('taker-status-text')).toHaveText(/^Completed( \(unverified\))?$/)

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, 'regression-01-collaborative-send-completed.png'),
        fullPage: false,
      })

      // the reported transaction pays the destination
      const rawCardContent = (await statusCard.textContent()) ?? ''
      const txidMatch = rawCardContent.match(/[0-9a-f]{64}/)
      expect(txidMatch, 'Completed taker status must contain the transaction ID').not.toBeNull()
      const rawTx = await getRawTransactionDetails(txidMatch![0])
      const destinationOutput = rawTx.vout.find((out) => out.scriptPubKey?.address === destinationAddress)
      expect(Math.round((destinationOutput?.value || 0) * 100_000_000)).toBe(COINJOIN_AMOUNT_SATS)
      await mineBlocksViaBitcoinCore(1)

      // acknowledging the outcome hides the card and resets the form
      await doneButton.click()
      await expect(statusCard).toBeHidden()
      await expect(page.locator('#send-destination')).toHaveValue('')
    })

    await test.step('D. Lock wallet and verify logout', async () => {
      await lockWalletAndVerifyLogout(page)

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, 'regression-02-wallet-locked.png'),
        fullPage: false,
      })
    })
  })
})
