import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { LanguageSelector } from './LanguageSelector'

const changeLanguageMock = vi.fn()

type ChildrenProps = { children: ReactNode }

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      changeLanguage: changeLanguageMock,
      resolvedLanguage: 'en',
    },
  }),
}))

vi.mock('@/i18n/languages', () => ({
  default: [
    { key: 'en', description: 'English' },
    { key: 'es', description: 'Spanish' },
  ],
}))

vi.mock('@/components/ui/select', () => ({
  Select: ({
    children,
    value,
    onValueChange,
  }: ChildrenProps & { value: string; onValueChange: (value: string) => void }) => (
    <div data-testid="select" data-value={value}>
      <button onClick={() => onValueChange('es')}>Change to Spanish</button>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: ChildrenProps) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <div data-testid="select-value">{placeholder}</div>,
  SelectContent: ({ children }: ChildrenProps) => <div>{children}</div>,
  SelectGroup: ({ children }: ChildrenProps) => <div>{children}</div>,
  SelectLabel: ({ children }: ChildrenProps) => <div>{children}</div>,
  SelectItem: ({ children, value }: ChildrenProps & { value: string }) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
}))

describe('LanguageSelector', () => {
  it('renders correctly with current language', () => {
    render(<LanguageSelector />)

    expect(screen.getByText('settings.label_select_language')).toBeInTheDocument()
    expect(screen.getByTestId('select-value')).toHaveTextContent('English')

    // Check languages are rendered
    expect(screen.getByTestId('select-item-en')).toHaveTextContent('English')
    expect(screen.getByTestId('select-item-es')).toHaveTextContent('Spanish')
  })

  it('changes language when selected', async () => {
    render(<LanguageSelector />)

    fireEvent.click(screen.getByText('Change to Spanish'))

    await waitFor(() => {
      expect(changeLanguageMock).toHaveBeenCalledWith('es')
    })
  })
})
