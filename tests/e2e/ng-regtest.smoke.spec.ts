import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  createWalletViaUi,
  dismissOverlays,
  fundWalletViaUi,
  lockWalletAndVerifyLogout,
  lockWalletIfActive,
  lockWalletViaUi,
  submitCollaborativeSend,
  takerStatusCard,
  waitForBackendAndOpenJam,
} from './jam-ui'
import { getNewAddressFromBitcoinCore, getRawTransactionDetails, mineBlocksViaBitcoinCore } from './regtest-client'

const EVIDENCE_DIR = path.resolve(import.meta.dirname, '../../test-evidence')

test.describe('JoinMarket NG Regtest Live Wallet Smoke Suite', () => {
  // Shared state across the serial journey
  let walletName: string
  let walletPassword: string
  let fundingTxid: string
  let destinationAddress: string
  let transactionId: string
  let actualMinerFeeSats = 0

  const FUNDING_AMOUNT_BTC = '0.001'
  const FUNDING_AMOUNT_SATS = 100_000
  const SEND_AMOUNT_SATS = 25_000
  const COINJOIN_AMOUNT_SATS = 30_000

  test.beforeAll(async () => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
    const uniqueSuffix = Date.now().toString(36)
    walletName = `smoke_${uniqueSuffix}`
    walletPassword = `SmokePass_${uniqueSuffix}_!99`
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (testInfo.status !== testInfo.expectedStatus) {
      await lockWalletIfActive(page)
    }
  })

  test('Execute complete live NG wallet journey (A-H)', async ({ page }) => {
    // 0. Auto-dismiss splashscreen, post-login tour, and cheatsheet popup
    await dismissOverlays(page)

    // A. Startup and backend readiness verification
    await test.step('A. Startup and backend readiness verification', async () => {
      await waitForBackendAndOpenJam(page)
    })

    // B. Create disposable wallet and complete onboarding flow
    await test.step('B. Create disposable wallet and complete onboarding flow', async () => {
      await createWalletViaUi(page, walletName, walletPassword)
    })

    // C. Lock wallet and unlock through UI
    await test.step('C. Lock wallet and unlock through UI', async () => {
      await lockWalletViaUi(page)

      // Unlock wallet (it is only preselected if it is the only wallet of the backend)
      const walletSelect = page.getByRole('combobox')
      await expect(walletSelect).toBeVisible({ timeout: 15_000 })
      if (!((await walletSelect.textContent()) ?? '').includes(walletName)) {
        await walletSelect.click()
        await page.getByRole('option', { name: walletName, exact: true }).click()
      }
      await expect(walletSelect).toContainText(walletName)

      const passwordInput = page.locator('#login-password')
      await expect(passwordInput).toBeVisible({ timeout: 15_000 })
      await passwordInput.fill(walletPassword)

      const unlockButton = page.getByRole('button', { name: /^unlock$/i })
      await expect(unlockButton).toBeEnabled()
      await unlockButton.click()

      // Verify back on main wallet view
      await expect(page.getByText(walletName).first()).toBeVisible({ timeout: 30_000 })
      await expect(page.locator('[data-tour-id="wallet-jars"]')).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText('Apricot')).toBeVisible()
    })

    // D. Receive confirmed regtest funds and assert exact balance
    await test.step('D. Receive confirmed regtest funds and assert exact balance', async () => {
      const funding = await fundWalletViaUi(page, walletName, FUNDING_AMOUNT_BTC, FUNDING_AMOUNT_SATS)
      fundingTxid = funding.txid

      // Capture Evidence 01: Confirmed funded wallet
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, '01-wallet-funded.png'),
        fullPage: false,
      })
    })

    // E. Direct send, mempool/chain verification, and fee calculation
    await test.step('E. Direct send, mempool/chain verification, and fee calculation', async () => {
      // Generate a fresh destination address in Bitcoin Core regtest
      destinationAddress = await getNewAddressFromBitcoinCore()
      expect(destinationAddress).toMatch(/^bcrt1/i)

      await page.goto('/send')
      await expect(page.getByRole('heading', { name: 'Send', exact: true })).toBeVisible({ timeout: 20_000 })

      // Send does not select a source jar by default.
      const sourceJar = page.getByRole('button', { name: /Apricot/ })
      await expect(sourceJar.getByRole('radio')).toBeEnabled()
      await sourceJar.click()
      await expect(sourceJar.getByRole('radio')).toBeChecked()

      // Fill destination address
      const recipientInput = page.locator('#send-destination')
      await expect(recipientInput).toBeVisible()
      await recipientInput.fill(destinationAddress)

      // Fill amount in satoshis
      const amountInput = page.locator('#send-amount')
      await expect(amountInput).toBeVisible()
      await amountInput.fill(String(SEND_AMOUNT_SATS))

      // Select non-collaborative / direct send mode
      const optionsAccordion = page.getByRole('button', { name: /sending options/i })
      await optionsAccordion.click()

      // Switch off collaborative toggle
      const collabSwitch = page.locator('#switch-is-collaborative-transaction')
      await expect(collabSwitch).toBeVisible()
      const isChecked =
        (await collabSwitch.getAttribute('aria-checked')) === 'true' ||
        (await collabSwitch.getAttribute('data-state')) === 'checked'
      if (isChecked) {
        await collabSwitch.click()
      }
      await expect(collabSwitch).toHaveAttribute('aria-checked', 'false')

      // A fresh regtest chain cannot provide a useful fee estimate in blocks.
      await page.getByRole('radio', { name: /sats.*vbyte/i }).click()
      await page.locator('#txFeeInSatsPerVbyte').fill('2')

      // Submit send form to open review dialog
      const reviewButton = page.locator('button[type="submit"]')
      await expect(reviewButton).toBeEnabled()
      await reviewButton.click()

      // Confirm dialog must appear with exact details
      const confirmDialog = page.getByRole('dialog')
      await expect(confirmDialog).toBeVisible({ timeout: 15_000 })
      await expect(confirmDialog.getByText(destinationAddress)).toBeVisible()
      await expect(confirmDialog.getByTestId('sats-amount')).toHaveAttribute('data-raw-value', String(SEND_AMOUNT_SATS))

      // Capture Evidence 02: Transaction review dialog
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, '02-direct-send-review.png'),
        fullPage: false,
      })

      // Confirm transaction execution in UI
      const confirmSendButton = confirmDialog.getByRole('button', { name: /^confirm$/i })
      await expect(confirmSendButton).toBeEnabled()
      await confirmSendButton.click()

      // Wait for success alert in Send page
      const successAlert = page.locator('div[role="alert"]:has-text("Payment")')
      await expect(successAlert).toBeVisible({ timeout: 60_000 })

      // Capture Evidence 03: Actual completion state
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, '03-send-complete.png'),
        fullPage: false,
      })

      // Extract txid from alert description
      const rawAlertContent = await successAlert.textContent()
      const alertContent = rawAlertContent ?? ''
      const txidMatch = alertContent.match(/[0-9a-fA-F]{64}/)
      expect(txidMatch, 'Direct send success alert must contain transaction ID').not.toBeNull()
      transactionId = txidMatch![0]

      // Verify transaction through Bitcoin Core RPC
      const rawTx = await getRawTransactionDetails(transactionId)
      expect(rawTx.txid).toBe(transactionId)
      expect(rawTx.vin).toHaveLength(1)
      expect(rawTx.vin[0].txid).toBe(fundingTxid)

      // Verify destination output amount in Bitcoin Core
      const destinationOutput = rawTx.vout.find((out) => out.scriptPubKey?.address === destinationAddress)
      expect(destinationOutput, 'Output paying destination address must exist in raw transaction').toBeDefined()
      const destinationAmountSats = Math.round((destinationOutput?.value || 0) * 100_000_000)
      expect(destinationAmountSats).toBe(SEND_AMOUNT_SATS)

      // Calculate actual miner fee from transaction fee or outputs
      if (typeof rawTx.fee === 'number') {
        actualMinerFeeSats = Math.round(Math.abs(rawTx.fee) * 100_000_000)
      } else {
        const totalOutputsSats = rawTx.vout.reduce((sum, out) => sum + Math.round(out.value * 100_000_000), 0)
        actualMinerFeeSats = FUNDING_AMOUNT_SATS - totalOutputsSats
      }
      expect(actualMinerFeeSats).toBeGreaterThan(0)
      expect(actualMinerFeeSats).toBeLessThan(10_000)

      // Mine confirmation block
      await mineBlocksViaBitcoinCore(1)
    })

    // F. Reload persistence and post-send state consistency
    await test.step('F. Reload persistence and post-send state consistency', async () => {
      // Reload the wallet view, rather than expecting wallet jars on the Send page.
      await page.goto('/')
      await page.reload()

      // Verify wallet session persists without re-prompting credentials
      await expect(page.getByText(walletName).first()).toBeVisible({ timeout: 30_000 })
      await expect(page.locator('[data-tour-id="wallet-jars"]')).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText('Apricot')).toBeVisible()

      // Assert that wallet balance is strictly less than 75,000 sats (accounting for miner fee)
      const expectedRemainingMax = FUNDING_AMOUNT_SATS - SEND_AMOUNT_SATS
      expect(actualMinerFeeSats).toBeGreaterThan(0)
      const expectedRemainingExact = expectedRemainingMax - actualMinerFeeSats

      // Verify Jar 0 reflects the correct post-send balance
      const fundedJar = page.locator('[data-tour-id="wallet-jars"]').getByRole('button', { name: /Apricot/ })
      await expect(fundedJar.getByTestId('sats-amount').first()).toHaveAttribute(
        'data-raw-value',
        String(expectedRemainingExact),
        { timeout: 60_000 },
      )

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, '04-wallet-after-reload.png'),
        fullPage: false,
      })
    })

    // G. Collaborative send reports the taker status until acknowledged
    await test.step('G. Collaborative send reports the taker status until acknowledged', async () => {
      // The wallet's coins are not yet old enough for the taker (`taker_utxo_age`), so the
      // attempt fails right away with a reason - the successful path is covered by the
      // (long running) regression suite, which needs makers.
      const coinjoinDestinationAddress = await getNewAddressFromBitcoinCore()
      await submitCollaborativeSend(page, {
        address: coinjoinDestinationAddress,
        amountSats: COINJOIN_AMOUNT_SATS,
      })

      // the status card stays visible with the final outcome once the taker stopped
      const statusCard = takerStatusCard(page)
      await expect(statusCard).toBeVisible({ timeout: 30_000 })
      const doneButton = statusCard.getByRole('button', { name: /^done$/i })
      await expect(doneButton).toBeVisible({ timeout: 60_000 })
      await expect(statusCard.getByRole('button', { name: /^abort$/i })).toBeHidden()

      await expect(statusCard.getByTestId('taker-status-text')).toHaveText('Failed')
      await expect(statusCard.getByText('Error', { exact: true })).toBeVisible()
      await expect(statusCard).toContainText(/utxo/i)

      await page.screenshot({
        path: path.join(EVIDENCE_DIR, '05-collaborative-send-failed.png'),
        fullPage: false,
      })

      // acknowledging the outcome hides the card and keeps the form values for a retry
      await doneButton.click()
      await expect(statusCard).toBeHidden()
      await expect(page.locator('#send-destination')).toHaveValue(coinjoinDestinationAddress)
      await expect(page.locator('#send-amount')).toHaveValue(String(COINJOIN_AMOUNT_SATS))
    })

    // H. Lock wallet and verify logout, so that subsequent suites can use the backend
    await test.step('H. Lock wallet and verify logout', async () => {
      await lockWalletAndVerifyLogout(page)

      // Capture Evidence 06: Locked wallet and logged out
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, '06-wallet-locked.png'),
        fullPage: false,
      })
    })
  })
})
