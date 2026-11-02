import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { routes } from '@/constants/routes'
import i18n from '@/i18n/testConfig'
import { Cheatsheet } from './Cheatsheet'

const CheatsheetHarness = ({ onOpenChange }: { onOpenChange: (open: boolean) => void }) => {
  const [open, setOpen] = useState(true)
  return (
    <MemoryRouter initialEntries={['/']}>
      <Cheatsheet
        open={open}
        onOpenChange={(value) => {
          setOpen(value)
          onOpenChange(value)
        }}
      />
      <Routes>
        <Route path="/" element={<div>home page</div>} />
        <Route path={routes.receive} element={<div>receive page</div>} />
      </Routes>
    </MemoryRouter>
  )
}

describe('Cheatsheet', () => {
  beforeEach(() => {
    // mimic a real translation: `<Trans>` replaces the children of the first element
    i18n.addResource('en', 'translation', 'cheatsheet.receive.title', '<0>Fund</0> your wallet.')
  })

  afterEach(() => {
    i18n.removeResourceBundle('en', 'translation')
  })

  it('renders nothing when closed', () => {
    render(
      <MemoryRouter>
        <Cheatsheet open={false} onOpenChange={vi.fn()} />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('is exposed as a dialog labelled by its title', () => {
    render(<CheatsheetHarness onOpenChange={vi.fn()} />)

    const dialog = screen.getByRole('dialog', { name: 'cheatsheet.title' })
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAccessibleDescription(/cheatsheet\.description|Follow the steps below/)
  })

  it('closes when pressing escape', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<CheatsheetHarness onOpenChange={onOpenChange} />)

    await user.keyboard('{Escape}')

    expect(onOpenChange).toHaveBeenCalledWith(false)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('closes when clicking the close button', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<CheatsheetHarness onOpenChange={onOpenChange} />)

    await user.click(screen.getByRole('button', { name: 'global.close' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('navigates and closes when following an in-app link', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<CheatsheetHarness onOpenChange={onOpenChange} />)

    await user.click(screen.getByRole('link', { name: 'Fund' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByText('receive page')).toBeInTheDocument()
  })

  it('keeps external documentation links in a new tab without closing', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    render(<CheatsheetHarness onOpenChange={onOpenChange} />)

    const documentationLinks = screen.getAllByRole('link').filter((link) => link.getAttribute('target') === '_blank')
    expect(documentationLinks.length).toBeGreaterThan(0)
    documentationLinks.forEach((link) => expect(link).toHaveAttribute('rel', 'noopener noreferrer'))

    // prevent jsdom from trying to open a new window
    documentationLinks[0].addEventListener('click', (event) => event.preventDefault())
    await user.click(documentationLinks[0])

    expect(onOpenChange).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
