import type { ReactNode } from 'react'
import { render, screen } from '@testing-library/react'
import { type FieldValues, FormProvider, useForm } from 'react-hook-form'
import { describe, expect, it, vi } from 'vitest'
import { TX_FEE_UNITS } from '@/lib/feeConfig'
import { TxFeeForm } from './TxFeeForm'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

const Wrapper = ({ children, defaultValues = {} }: { children: ReactNode; defaultValues?: FieldValues }) => {
  const methods = useForm({ defaultValues })
  return <FormProvider {...methods}>{children}</FormProvider>
}

describe('TxFeeForm', () => {
  it('renders blocks input when unit is blocks', () => {
    render(
      <Wrapper defaultValues={{ txFee: { txFeeUnit: TX_FEE_UNITS.BLOCKS } }}>
        <TxFeeForm />
      </Wrapper>,
    )

    expect(screen.getByText('send.label_tx_fees')).toBeInTheDocument()
    expect(screen.getByText('settings.fees.description_tx_fees_blocks')).toBeInTheDocument()
  })

  it('renders sats per vbyte input when unit is sats per vbyte', () => {
    render(
      <Wrapper defaultValues={{ txFee: { txFeeUnit: TX_FEE_UNITS.SATS_PER_VBYTE } }}>
        <TxFeeForm />
      </Wrapper>,
    )

    expect(screen.getByText('send.label_tx_fees')).toBeInTheDocument()
    expect(screen.getByText('settings.fees.description_tx_fees_satspervbyte')).toBeInTheDocument()
  })
})
