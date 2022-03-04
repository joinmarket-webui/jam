import React from 'react'
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import { act } from 'react-dom/test-utils'

import * as apiMock from '../libs/JmWalletApi'
import { AllTheProviders } from '../__util__/AllTheProviders'

import Wallets from './Wallets'

jest.mock('../libs/JmWalletApi')

jest.mock('react-i18next', () => ({
  ...jest.requireActual('react-i18next'),
  useTranslation: () => {
    return {
      t: (str: string) => str,
      i18n: {
        changeLanguage: () => new Promise(() => {}),
      },
    }
  },
}))

it('should render without errors', () => {
  apiMock.getWalletAll.mockResolvedValueOnce(new Promise((r) => setTimeout(r, 1_000)))

  act(() => {
    render(<Wallets />, {
      wrapper: AllTheProviders,
    })
  })

  expect(screen.getByText('wallets.title')).toBeInTheDocument()
  expect(screen.getByText('wallets.text_loading')).toBeInTheDocument()
  expect(screen.getByText('wallets.button_new_wallet')).toBeInTheDocument()
})

it('should display error message when loading wallets fails', async () => {
  apiMock.getWalletAll.mockResolvedValueOnce({
    ok: false,
  })

  act(() => {
    render(<Wallets />, {
      wrapper: AllTheProviders,
    })
  })

  expect(screen.getByText('wallets.title')).toBeInTheDocument()
  expect(screen.getByText('wallets.button_new_wallet')).toBeInTheDocument()

  await waitForElementToBeRemoved(screen.getByText('wallets.text_loading'))

  expect(screen.getByText('wallets.error_loading_failed')).toBeInTheDocument()
  expect(screen.getByText('wallets.button_new_wallet')).toBeInTheDocument()
})

it('should display big call-to-action button if no wallet has been created yet', async () => {
  apiMock.getWalletAll.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ wallets: [] }),
  })

  act(() => {
    render(<Wallets />, {
      wrapper: AllTheProviders,
    })
  })

  expect(screen.getByText('wallets.text_loading')).toBeInTheDocument()

  const callToActionButtonBefore = screen.getByText('wallets.button_new_wallet')
  expect(callToActionButtonBefore.classList.contains('btn')).toBe(true)
  expect(callToActionButtonBefore.classList.contains('btn-lg')).toBe(false)

  await waitForElementToBeRemoved(screen.getByText('wallets.text_loading'))

  expect(screen.getByText('wallets.subtitle_no_wallets')).toBeInTheDocument()

  const callToActionButtonAfter = screen.getByText('wallets.button_new_wallet')
  expect(callToActionButtonAfter.classList.contains('btn-lg')).toBe(true)
})

it('should display login for available wallets', async () => {
  apiMock.getWalletAll.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve({ wallets: ['wallet0.jmdat', 'wallet1.jmdat'] }),
  })

  act(() => {
    render(<Wallets />, {
      wrapper: AllTheProviders,
    })
  })

  expect(screen.getByText('wallets.text_loading')).toBeInTheDocument()
  await waitForElementToBeRemoved(screen.getByText('wallets.text_loading'))

  expect(screen.queryByText('wallets.alert_wallet_open')).not.toBeInTheDocument()

  expect(screen.getByText('wallet0')).toBeInTheDocument()
  expect(screen.getByText('wallet1')).toBeInTheDocument()

  const callToActionButton = screen.getByText('wallets.button_new_wallet')
  expect(callToActionButton.classList.contains('btn')).toBe(true)
  expect(callToActionButton.classList.contains('btn-lg')).toBe(false)
})
