import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  checkNgBackendSession,
  fundAddressViaBitcoinCore,
  getNewAddressFromBitcoinCore,
  getRawTransactionDetails,
  mineBlocksViaBitcoinCore,
} from './regtest-client'

const EVIDENCE_DIR = path.resolve(import.meta.dirname, '../../test-evidence')

test.describe('JoinMarket NG Regtest Live Wallet Smoke Suite', () => {
  // Shared state across the serial journey
  let walletName: string
  let walletPassword: string
  let receiveAddress: string
  let destinationAddress: string
  let transactionId: string
  let actualMinerFeeSats = 0

  const FUNDING_AMOUNT_BTC = '0.001'
  const FUNDING_AMOUNT_SATS = 100_000
  const SEND_AMOUNT_SATS = 25_000

  test.beforeAll(async () => {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true })
    const uniqueSuffix = Date.now().toString(36)
    walletName = `smoke_${uniqueSuffix}`
    walletPassword = `SmokePass_${uniqueSuffix}_!99`
  })

  test('Execute complete live NG wallet journey (A-F)', async ({ page }) => {
    // 0. Auto-dismiss splashscreen / onboarding tutorial
    await page.addInitScript(() => {
      try {
        window.localStorage.setItem('jam:v2:onboarding:dismissed', '1')
      } catch {
        // ignore
      }
    })

    // A. Startup and backend readiness verification
    await test.step('A. Startup and backend readiness verification', async () => {
      let isReady = false
      const maxRetries = 30
      for (let i = 0; i < maxRetries; i++) {
        isReady = await checkNgBackendSession('http://localhost:3000')
        if (isReady) break
        await page.waitForTimeout(2000)
      }

      expect(isReady, 'JoinMarket NG backend session endpoint must be reachable via Jam proxy').toBe(true)

      await page.goto('/')
      await expect(page).toHaveTitle(/Jam/i)
    })

    // B. Create disposable wallet and complete onboarding flow
    await test.step('B. Create disposable wallet and complete onboarding flow', async () => {
      await page.goto('/create-wallet')

      const skipIntroButton = page.getByRole('button', { name: /skip intro/i })
      if (await skipIntroButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await skipIntroButton.click()
      }

      // Fill wallet creation details
      const walletNameInput = page.locator('#create-wallet-name')
      await expect(walletNameInput).toBeVisible({ timeout: 15_000 })
      await walletNameInput.fill(walletName)

      const passwordInput = page.locator('input[name="password"]')
      await passwordInput.fill(walletPassword)

      const confirmPasswordInput = page.locator('input[name="confirmPassword"]')
      await confirmPasswordInput.fill(walletPassword)

      // Submit creation form
      const createButton = page.getByRole('button', { name: /^create$/i })
      await expect(createButton).toBeEnabled()
      await createButton.click()

      // Step 2: Confirmation screen with seed phrase
      // Passwords and seed phrases are excluded from logs and screenshots
      const revealSwitch = page.locator('#switch-reveal-seed')
      await expect(revealSwitch).toBeVisible({ timeout: 45_000 })
      await revealSwitch.click()

      // Read generated mnemonic words in order to complete verification
      const wordElements = page.locator('.grid.grid-cols-2 .truncate')
      const wordCount = await wordElements.count()
      expect(wordCount, 'Mnemonic phrase must contain at least 12 words').toBeGreaterThanOrEqual(12)

      const mnemonicWords: string[] = []
      for (let i = 0; i < wordCount; i++) {
        const rawWord = await wordElements.nth(i).textContent()
        mnemonicWords.push((rawWord ?? '').trim())
      }

      const confirmBackupSwitch = page.locator('#switch-confirm-backup')
      await expect(confirmBackupSwitch).toBeEnabled()
      await confirmBackupSwitch.click()

      // Click Next
      const nextButton = page.getByRole('button', { name: /^next$/i })
      await expect(nextButton).toBeEnabled()
      await nextButton.click()

      // Step 3: Verify Mnemonic phrase by clicking shuffled words
      await expect(page.getByText(/verify recovery seed|verify mnemonic/i)).toBeVisible({ timeout: 15_000 })

      for (const word of mnemonicWords) {
        const wordButton = page.getByRole('button', { name: word, exact: true })
        await expect(wordButton).toBeVisible()
        await wordButton.click()
      }

      // Complete wallet setup and fund wallet button
      const finishButton = page.getByRole('button', { name: /fund wallet|confirm/i })
      await expect(finishButton).toBeEnabled()
      await finishButton.click()

      // Ensure we reach the main wallet view
      await expect(page.getByText(walletName).first()).toBeVisible({ timeout: 45_000 })
      await expect(page.locator('[data-tour-id="wallet-jars"]')).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText('Apricot')).toBeVisible()
    })

    // C. Lock wallet and unlock through UI
    await test.step('C. Lock wallet and unlock through UI', async () => {
      // Find and click the lock button in navbar
      const lockButton = page.getByRole('button', { name: /lock wallet/i })
      await expect(lockButton).toBeVisible({ timeout: 15_000 })
      await lockButton.click()

      // Confirm lock if modal appears
      const confirmLockModal = page.getByRole('dialog')
      if (await confirmLockModal.isVisible({ timeout: 2000 }).catch(() => false)) {
        const confirmLockButton = confirmLockModal.getByRole('button', { name: /lock|confirm/i })
        await confirmLockButton.click()
      }

      // Verify reached locked / login screen
      await expect(page).toHaveURL(/.*login/, { timeout: 20_000 })

      // Unlock wallet
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
      await page.goto('/receive')
      await expect(page.getByRole('heading', { name: /receive/i })).toBeVisible({ timeout: 20_000 })

      // Click "Reveal address"
      const revealAddressButton = page.getByRole('button', { name: /reveal address/i })
      await expect(revealAddressButton).toBeVisible()
      await revealAddressButton.click()

      // Wait for address to render in the DOM
      const addressElement = page.locator('span[class*="bitcoinAddress"]')
      await expect(addressElement).toBeVisible({ timeout: 30_000 })

      // Extract exact displayed address text without spaces
      const rawAddress = await addressElement.textContent()
      const displayedAddressText = (rawAddress ?? '').replaceAll(/\s+/g, '').trim()
      expect(displayedAddressText).toMatch(/^bcrt1[0-9a-z]{38,59}$/i)
      receiveAddress = displayedAddressText

      // Fund the exact displayed address from Bitcoin Core regtest wallet
      const fundingTxid = await fundAddressViaBitcoinCore(receiveAddress, FUNDING_AMOUNT_BTC)
      expect(fundingTxid).toHaveLength(64)

      // Mine confirmation block
      await mineBlocksViaBitcoinCore(1)

      // Navigate to main wallet view to verify updated jar balance
      await page.goto('/')
      await expect(page.getByText(walletName).first()).toBeVisible({ timeout: 20_000 })

      // Poll for the balance to reflect the 100,000 sats in UI
      const expectedBalanceRegex = /100[,. ]?000/
      await expect(page.getByText(expectedBalanceRegex).first()).toBeVisible({ timeout: 60_000 })

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
      await expect(page.getByRole('heading', { name: /send/i })).toBeVisible({ timeout: 20_000 })

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

      // Submit send form to open review dialog
      const reviewButton = page.locator('button[type="submit"]')
      await expect(reviewButton).toBeEnabled()
      await reviewButton.click()

      // Confirm dialog must appear with exact details
      const confirmDialog = page.getByRole('dialog')
      await expect(confirmDialog).toBeVisible({ timeout: 15_000 })
      await expect(confirmDialog.getByText(destinationAddress)).toBeVisible()

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
      // Reload browser page
      await page.reload()

      // Verify wallet session persists without re-prompting credentials
      await expect(page.getByText(walletName).first()).toBeVisible({ timeout: 30_000 })
      await expect(page.locator('[data-tour-id="wallet-jars"]')).toBeVisible({ timeout: 30_000 })
      await expect(page.getByText('Apricot')).toBeVisible()

      // Assert that wallet balance is strictly less than 75,000 sats (accounting for miner fee)
      const expectedRemainingMax = FUNDING_AMOUNT_SATS - SEND_AMOUNT_SATS
      expect(actualMinerFeeSats).toBeGreaterThan(0)
      const expectedRemainingExact = expectedRemainingMax - actualMinerFeeSats

      // Capture Evidence 04: Consistent wallet state after reload
      await page.screenshot({
        path: path.join(EVIDENCE_DIR, '04-wallet-after-reload.png'),
        fullPage: false,
      })

      // Verify Jar 0 reflects the correct post-send balance
      const formattedBalanceApprox = expectedRemainingExact.toLocaleString('en-US')
      const balanceDigits = expectedRemainingExact.toString()
      await expect(page.getByText(new RegExp(`${balanceDigits}|${formattedBalanceApprox}`)).first()).toBeVisible({
        timeout: 30_000,
      })
    })
  })
})
