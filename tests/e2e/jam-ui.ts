import { expect, type Locator, type Page } from '@playwright/test'
import {
  checkNgBackendSession,
  fetchNgBackendSession,
  fundAddressViaBitcoinCore,
  initializeFundingWallet,
  mineBlocksViaBitcoinCore,
} from './regtest-client'

/**
 * UI steps shared by the e2e suites (smoke and regression).
 */

/**
 * Auto-dismiss splashscreen, post-login tour, and cheatsheet popup.
 */
export async function dismissOverlays(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem('jam:v2:onboarding:dismissed', '1')
      window.localStorage.setItem('jam:v2:post-login-tour:dismissed', '1')
      window.localStorage.setItem(
        'jam-settings-store',
        JSON.stringify({
          // Zustand persists the store's `state` property inside its own `state` envelope.
          state: {
            state: {
              developerMode: false,
              privateMode: false,
              addressChunking: false,
              currencyUnit: 'sats',
              cheatsheetForceOpenAt: Date.now() + 1000 * 60 * 60 * 24 * 365,
            },
          },
          version: 0,
        }),
      )
    } catch {
      // ignore
    }
  })
}

/**
 * Wait for the backend to be reachable via the Jam proxy and open Jam.
 */
export async function waitForBackendAndOpenJam(page: Page): Promise<void> {
  let isReady = false
  const maxRetries = 30
  for (let i = 0; i < maxRetries; i++) {
    isReady = await checkNgBackendSession('http://localhost:3000')
    if (isReady) break
    await page.waitForTimeout(2000)
  }

  expect(isReady, 'JoinMarket NG backend session endpoint must be reachable via Jam proxy').toBe(true)
  await initializeFundingWallet()

  await page.goto('/')
  await expect(page).toHaveTitle(/Jam/i)
}

/**
 * Create a disposable wallet and complete the onboarding flow (incl. seed verification).
 */
export async function createWalletViaUi(page: Page, walletName: string, walletPassword: string): Promise<void> {
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
    const wordButton = page.getByRole('button', { name: word, exact: true }).first()
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
}

/**
 * Lock the active wallet via the navbar (confirming the dialog if one appears).
 */
export async function lockWalletViaUi(page: Page): Promise<void> {
  // Dismiss Cheatsheet or any overlay if present
  const cheatsheetCloseButton = page.locator('div[class*="backdrop-blur-xs"] button[title="Close"]')
  if (await cheatsheetCloseButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await cheatsheetCloseButton.click()
  }

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
}

/**
 * Lock the active wallet and verify the logout in the UI as well as in the backend.
 */
export async function lockWalletAndVerifyLogout(page: Page): Promise<void> {
  await lockWalletViaUi(page)

  await expect(page.getByText(/locked successfully/i)).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('#login-password')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('button', { name: /lock wallet/i })).toBeHidden()

  await expect
    .poll(
      async () => {
        const session = await fetchNgBackendSession()
        return session.session
      },
      { message: 'Backend must not have an active wallet session after locking', timeout: 15_000 },
    )
    .toBe(false)
}

/**
 * Best effort cleanup after a failed test: lock a wallet left unlocked, so that subsequent runs can use the backend.
 */
export async function lockWalletIfActive(page: Page): Promise<void> {
  const session = await fetchNgBackendSession().catch(() => undefined)
  if (session?.session !== true) return
  try {
    await lockWalletViaUi(page)
  } catch (error: unknown) {
    console.warn(`Could not lock wallet '${session.wallet_name}' after failed test`, error)
  }
}

/**
 * Fund the first jar via a revealed receive address and wait for the confirmed balance.
 */
export async function fundWalletViaUi(
  page: Page,
  walletName: string,
  amountBtc: string,
  amountSats: number,
): Promise<{ address: string; txid: string }> {
  await page.goto('/receive')
  await expect(page.getByRole('heading', { name: 'Receive', exact: true })).toBeVisible({ timeout: 20_000 })

  // Click "Reveal address"
  const revealAddressButton = page.getByRole('button', { name: /reveal address/i })
  await expect(revealAddressButton).toBeVisible()
  await revealAddressButton.click()

  // Wait for address to render in the DOM
  const addressElement = page.getByRole('main').getByText(/^bcrt1[0-9a-z]{38,59}$/i)
  await expect(addressElement).toBeVisible({ timeout: 30_000 })

  // Extract exact displayed address text without spaces
  const rawAddress = await addressElement.textContent()
  const displayedAddressText = (rawAddress ?? '').replaceAll(/\s+/g, '').trim()
  expect(displayedAddressText).toMatch(/^bcrt1[0-9a-z]{38,59}$/i)

  // Fund the exact displayed address from Bitcoin Core regtest wallet
  const fundingTxid = await fundAddressViaBitcoinCore(displayedAddressText, amountBtc)
  expect(fundingTxid).toHaveLength(64)

  // Mine confirmation block
  await mineBlocksViaBitcoinCore(1)

  // Navigate to main wallet view to verify updated jar balance
  await page.goto('/')
  await expect(page.getByText(walletName).first()).toBeVisible({ timeout: 20_000 })

  // Poll for the balance to reflect the funded amount in UI
  const fundedJar = page.locator('[data-tour-id="wallet-jars"]').getByRole('button', { name: /Apricot/ })
  await expect(fundedJar.getByTestId('sats-amount').first()).toHaveAttribute('data-raw-value', String(amountSats), {
    timeout: 60_000,
  })

  return { address: displayedAddressText, txid: fundingTxid }
}

/**
 * Fill and confirm a collaborative send from the first jar with the minimum number of collaborators.
 */
export async function submitCollaborativeSend(
  page: Page,
  { address, amountSats }: { address: string; amountSats: number },
): Promise<void> {
  await page.goto('/send')
  await expect(page.getByRole('heading', { name: 'Send', exact: true })).toBeVisible({ timeout: 20_000 })

  const sourceJar = page.getByRole('button', { name: /Apricot/ })
  await expect(sourceJar.getByRole('radio')).toBeEnabled({ timeout: 30_000 })
  await sourceJar.click()

  await page.locator('#send-destination').fill(address)
  await page.locator('#send-amount').fill(String(amountSats))

  await page.getByRole('button', { name: /sending options/i }).click()
  const collabSwitch = page.locator('#switch-is-collaborative-transaction')
  if ((await collabSwitch.getAttribute('aria-checked')) !== 'true') {
    await collabSwitch.click()
  }
  await expect(collabSwitch).toHaveAttribute('aria-checked', 'true')

  // use the minimum number of collaborators the backend allows
  const collaboratorsSlider = page.locator('#send-num-collaborators').getByRole('slider')
  await collaboratorsSlider.focus()
  await collaboratorsSlider.press('Home')

  await page.getByRole('radio', { name: /sats.*vbyte/i }).click()
  await page.locator('#txFeeInSatsPerVbyte').fill('2')

  await page.locator('button[type="submit"]').click()
  const confirmDialog = page.getByRole('dialog')
  await expect(confirmDialog).toBeVisible({ timeout: 15_000 })
  await confirmDialog.getByRole('button', { name: /^confirm$/i }).click()
}

export const takerStatusCard = (page: Page): Locator =>
  page.locator('[data-slot="card"]').filter({ hasText: 'Taker status' })
