import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CopyButton } from './CopyButton'

const clipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
const execCommandDescriptor = Object.getOwnPropertyDescriptor(document, 'execCommand')

const setClipboard = (clipboard: Pick<Clipboard, 'writeText'> | undefined) => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: clipboard,
  })
}

const setExecCommand = (execCommand: Document['execCommand']) => {
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    value: execCommand,
  })
}

const restoreProperty = (target: object, property: PropertyKey, descriptor: PropertyDescriptor | undefined) => {
  if (descriptor) {
    Object.defineProperty(target, property, descriptor)
  } else {
    Reflect.deleteProperty(target, property)
  }
}

describe('<CopyButton />', () => {
  afterEach(() => {
    restoreProperty(navigator, 'clipboard', clipboardDescriptor)
    restoreProperty(document, 'execCommand', execCommandDescriptor)
    vi.restoreAllMocks()
  })

  it('should copy text with navigator clipboard and show confirmation text', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    const onSuccess = vi.fn()
    setClipboard({ writeText })

    render(
      <CopyButton
        value="wallet-address"
        text="Copy"
        successText="Copied"
        successTextTimeout={10}
        onSuccess={onSuccess}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Copy' }))

    expect(writeText).toHaveBeenCalledWith('wallet-address')
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument())
  })

  it('should fall back to document copy command when navigator clipboard is unavailable', async () => {
    const execCommand = vi.fn().mockReturnValue(true)
    const onSuccess = vi.fn()
    setClipboard(undefined)
    setExecCommand(execCommand)

    render(<CopyButton value="fallback-value" text="Copy" successText="Copied" onSuccess={onSuccess} />)

    await userEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))
    expect(execCommand).toHaveBeenCalledWith('copy')
  })

  it('should call onError when clipboard and fallback copy both fail', async () => {
    const onError = vi.fn()
    setClipboard({ writeText: vi.fn().mockRejectedValue(new Error('blocked')) })
    setExecCommand(vi.fn().mockReturnValue(false))

    render(<CopyButton value="private-value" text="Copy" onError={onError} />)

    await userEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.any(Error)))
  })
})
