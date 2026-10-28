import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import '@/i18n/config'
import { TablePagination } from './TablePagination'

const prototypeMethods = ['hasPointerCapture', 'releasePointerCapture', 'scrollIntoView'] as const
const originalPrototypeDescriptors = Object.fromEntries(
  prototypeMethods.map((method) => [method, Object.getOwnPropertyDescriptor(HTMLElement.prototype, method)]),
) as Record<(typeof prototypeMethods)[number], PropertyDescriptor | undefined>

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
    configurable: true,
    value: vi.fn(() => false),
  })
  Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
    configurable: true,
    value: vi.fn(),
  })
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn(),
  })
})

afterAll(() => {
  for (const method of prototypeMethods) {
    const descriptor = originalPrototypeDescriptors[method]
    if (descriptor) {
      Object.defineProperty(HTMLElement.prototype, method, descriptor)
    } else {
      Reflect.deleteProperty(HTMLElement.prototype, method)
    }
  }
})

describe('<TablePagination />', () => {
  it('renders the current range and calls page navigation handlers', () => {
    const onPageChange = vi.fn()

    render(
      <TablePagination
        currentPage={2}
        totalPages={5}
        itemsPerPage={25}
        totalItems={125}
        onPageChange={onPageChange}
        onItemsPerPageChange={vi.fn()}
      />,
    )

    expect(screen.getByText('26-50 of 125')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2' })).toHaveAttribute('aria-current', 'page')

    fireEvent.click(screen.getByRole('button', { name: 'First' }))
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }))
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    fireEvent.click(screen.getByRole('button', { name: 'Last' }))

    expect(onPageChange.mock.calls.map(([page]) => page as number)).toEqual([1, 1, 3, 3, 5])
  })

  it('handles empty and show-all states', () => {
    const { rerender } = render(
      <TablePagination
        currentPage={1}
        totalPages={1}
        totalItems={0}
        onPageChange={vi.fn()}
        onItemsPerPageChange={vi.fn()}
      />,
    )

    expect(screen.queryByText(/of/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'First' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Last' })).toBeDisabled()

    rerender(
      <TablePagination
        currentPage={1}
        totalPages={1}
        itemsPerPage={-1}
        totalItems={42}
        allowShowAll={false}
        pageSizes={[10]}
        onPageChange={vi.fn()}
        onItemsPerPageChange={vi.fn()}
      />,
    )

    expect(screen.getByText('1-42 of 42')).toBeInTheDocument()
  })

  it('notifies when the page size changes', async () => {
    const onItemsPerPageChange = vi.fn()

    render(
      <TablePagination
        currentPage={1}
        totalPages={3}
        itemsPerPage={25}
        totalItems={75}
        onPageChange={vi.fn()}
        onItemsPerPageChange={onItemsPerPageChange}
      />,
    )

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(await screen.findByRole('option', { name: '50' }))

    expect(onItemsPerPageChange).toHaveBeenCalledWith(50)
  })

  it('correctly displays and orders page buttons numerically when totalPages >= 10', () => {
    const { rerender } = render(
      <TablePagination
        currentPage={9}
        totalPages={15}
        itemsPerPage={25}
        totalItems={375}
        onPageChange={vi.fn()}
        onItemsPerPageChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: '9' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '8' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '10' })).toBeInTheDocument()

    rerender(
      <TablePagination
        currentPage={8}
        totalPages={15}
        itemsPerPage={25}
        totalItems={375}
        onPageChange={vi.fn()}
        onItemsPerPageChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: '8' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '7' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '9' })).toBeInTheDocument()

    rerender(
      <TablePagination
        currentPage={15}
        totalPages={15}
        itemsPerPage={25}
        totalItems={375}
        onPageChange={vi.fn()}
        onItemsPerPageChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: '15' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '13' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '14' })).toBeInTheDocument()
  })
})
