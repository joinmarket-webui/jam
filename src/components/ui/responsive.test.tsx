import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ButtonGroup } from './button-group'
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle } from './card'
import { Dialog, DialogContent, DialogTitle } from './dialog'
import { BitcoinXpubQrCode } from './jam/BitcoinQrCode'
import { SeedPhraseGrid } from './jam/SeedPhraseGrid'
import { PaginationFirst, PaginationLast } from './pagination'
import { Tabs, TabsList, TabsTrigger } from './tabs'

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,test'),
  },
}))

describe('responsive UI contracts', () => {
  it('allows QR codes to shrink below their generated image size', async () => {
    render(<BitcoinXpubQrCode xpub="xpub-test" width={320} />)

    await waitFor(() => expect(screen.getByRole('img')).toBeInTheDocument())
    const container = screen.getByRole('img').parentElement

    expect(container).toHaveClass('aspect-square', 'w-full')
    expect(container).toHaveStyle({ maxWidth: '320px' })
    expect(screen.getByRole('img')).toHaveClass('h-full', 'w-full')
  })

  it('keeps dialogs inside the dynamic viewport', () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Responsive dialog</DialogTitle>
        </DialogContent>
      </Dialog>,
    )

    expect(screen.getByRole('dialog')).toHaveClass('max-h-[calc(100dvh-2rem)]', 'overflow-y-auto', 'p-4', 'sm:p-6')
  })

  it('stacks card actions and uses compact spacing on phone widths', () => {
    render(
      <Card data-testid="card">
        <CardHeader data-testid="card-header">
          <CardTitle>Wallet</CardTitle>
          <CardAction data-testid="card-action">Balance</CardAction>
        </CardHeader>
        <CardContent data-testid="card-content">Content</CardContent>
        <CardFooter data-testid="card-footer">Actions</CardFooter>
      </Card>,
    )

    expect(screen.getByTestId('card')).toHaveClass('min-w-0', 'gap-4', 'py-4', 'sm:gap-6', 'sm:py-6')
    expect(screen.getByTestId('card-header')).toHaveClass(
      'px-4',
      'has-data-[slot=card-action]:grid-cols-1',
      'sm:has-data-[slot=card-action]:grid-cols-[minmax(0,1fr)_auto]',
    )
    expect(screen.getByTestId('card-action')).toHaveClass('row-start-3', 'sm:row-start-1')
    expect(screen.getByTestId('card-content')).toHaveClass('min-w-0', 'px-4', 'sm:px-6')
    expect(screen.getByTestId('card-footer')).toHaveClass('min-w-0', 'px-4', 'sm:px-6')
  })

  it('makes tab lists horizontally scrollable', () => {
    render(
      <Tabs defaultValue="one">
        <TabsList data-testid="tabs-list">
          <TabsTrigger value="one">One</TabsTrigger>
          <TabsTrigger value="two">Two</TabsTrigger>
        </TabsList>
      </Tabs>,
    )

    expect(screen.getByTestId('tabs-list')).toHaveClass('max-w-full', 'overflow-x-auto', 'overflow-y-hidden')
  })

  it('lets button groups and seed entries shrink within narrow containers', () => {
    const { container } = render(
      <>
        <ButtonGroup data-testid="button-group">
          <input aria-label="Amount" />
          <button type="button">Submit</button>
        </ButtonGroup>
        <SeedPhraseGrid value={['abandon', 'ability']} masked={false} />
      </>,
    )

    expect(screen.getByTestId('button-group')).toHaveClass('max-w-full', '[&>input]:min-w-0')
    expect(screen.getByLabelText('Amount')).toBeInTheDocument()
    expect(container.querySelectorAll('.min-w-0')).toHaveLength(2)
  })

  it('hides first and last pagination controls on phone widths', () => {
    render(
      <>
        <PaginationFirst onClick={() => undefined} />
        <PaginationLast onClick={() => undefined} />
      </>,
    )

    expect(screen.getByTitle('global.table.pagination.page_selector.label_first')).toHaveClass(
      'hidden',
      'sm:inline-flex',
    )
    expect(screen.getByTitle('global.table.pagination.page_selector.label_last')).toHaveClass(
      'hidden',
      'sm:inline-flex',
    )
  })
})
