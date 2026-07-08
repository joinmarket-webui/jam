import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { POST_LOGIN_TOUR_DISMISSED_STORAGE_KEY, POST_LOGIN_TOUR_EVENT } from '@/constants/onboarding'
import { PostLoginOnboardingTour } from './PostLoginOnboardingTour'

const renderTargets = () => (
  <>
    <div data-tour-id="wallet-preview">wallet-preview</div>
    <div data-tour-id="wallet-actions">wallet-actions</div>
    <div data-tour-id="wallet-jars">wallet-jars</div>
    <div data-tour-id="footer-tools">footer-tools</div>
    <div data-tour-id="settings-button">settings-button</div>
    <PostLoginOnboardingTour />
  </>
)

describe('PostLoginOnboardingTour', () => {
  beforeEach(() => {
    window.localStorage.clear()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getBoundingClientRect(
      this: HTMLElement,
    ) {
      // eslint-disable-next-line unicorn/no-this-outside-of-class -- acceptable for mocks
      const id = this.dataset.tourId
      const top = id === 'settings-button' ? 520 : 80

      return {
        bottom: top + 48,
        height: 48,
        left: 120,
        right: 280,
        top,
        width: 160,
        x: 120,
        y: top,
        toJSON: () => undefined,
      }
    })
  })

  it('walks through the tour and persists dismissal', () => {
    render(renderTargets())

    expect(screen.getByText('Wallet Snapshot')).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Next'))
    expect(screen.getByText('Primary Actions')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Back'))
    expect(screen.getByText('Wallet Snapshot')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Skip tour'))
    expect(screen.queryByText('Wallet Snapshot')).not.toBeInTheDocument()
    expect(window.localStorage.getItem(POST_LOGIN_TOUR_DISMISSED_STORAGE_KEY)).toBe('1')
  })

  it('can be reopened by event and finished on the last step', () => {
    window.localStorage.setItem(POST_LOGIN_TOUR_DISMISSED_STORAGE_KEY, '1')

    render(renderTargets())

    expect(screen.queryByText('Wallet Snapshot')).not.toBeInTheDocument()

    fireEvent(window, new Event(POST_LOGIN_TOUR_EVENT))
    expect(screen.getByText('Wallet Snapshot')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Next'))
    fireEvent.click(screen.getByText('Next'))

    expect(screen.getByText('Settings & Safety')).toBeInTheDocument()

    fireEvent.click(screen.getByText('Finish'))
    expect(screen.queryByText('Settings & Safety')).not.toBeInTheDocument()
    expect(window.localStorage.getItem(POST_LOGIN_TOUR_DISMISSED_STORAGE_KEY)).toBe('1')
  })

  it('does not render when disabled', () => {
    render(<PostLoginOnboardingTour enabled={false} />)

    expect(screen.queryByText('Wallet Snapshot')).not.toBeInTheDocument()
  })
})
