import type { TFunction } from 'i18next'
import { describe, expect, it, vi } from 'vitest'
import { TX_FEE_UNITS, toJamFeeConfigValues } from '@/lib/feeConfig'
import { createTxFeeFormSchema, toTxFeeFormDefaultValues } from './TxFeeForm.schema'

const t = vi.fn((key: string) => key) as unknown as TFunction<'translation', undefined>

describe('toTxFeeFormDefaultValues', () => {
  it('should copy tx fee values into form defaults', () => {
    expect(
      toTxFeeFormDefaultValues(
        toJamFeeConfigValues({
          tx_fees: '2500',
        }),
      ),
    ).toEqual({
      txFee: {
        txFeeUnit: TX_FEE_UNITS.SATS_PER_VBYTE,
        txFeeInBlocks: undefined,
        txFeeInSatsPerVbyte: 2.5,
      },
    })
  })
})

describe('createTxFeeFormSchema', () => {
  const schema = createTxFeeFormSchema({ t })

  it('should accept targeted-block fee values and clear sats/vbyte input', async () => {
    await expect(
      schema.validate({
        txFee: {
          txFeeUnit: TX_FEE_UNITS.BLOCKS,
          txFeeInBlocks: 6,
          txFeeInSatsPerVbyte: 2,
        },
      }),
    ).resolves.toEqual({
      txFee: {
        txFeeUnit: TX_FEE_UNITS.BLOCKS,
        txFeeInBlocks: 6,
        txFeeInSatsPerVbyte: null,
      },
    })
  })

  it('should accept sats/vbyte fee values and clear block input', async () => {
    await expect(
      schema.validate({
        txFee: {
          txFeeUnit: TX_FEE_UNITS.SATS_PER_VBYTE,
          txFeeInBlocks: 6,
          txFeeInSatsPerVbyte: 12.5,
        },
      }),
    ).resolves.toEqual({
      txFee: {
        txFeeUnit: TX_FEE_UNITS.SATS_PER_VBYTE,
        txFeeInBlocks: null,
        txFeeInSatsPerVbyte: 12.5,
      },
    })
  })

  it('should reject invalid targeted-block fees', async () => {
    await expect(
      schema.validate({
        txFee: { txFeeUnit: TX_FEE_UNITS.BLOCKS, txFeeInBlocks: 0 },
      }),
    ).rejects.toThrow('settings.fees.feedback_invalid_tx_fees_blocks')

    await expect(
      schema.validate({
        txFee: { txFeeUnit: TX_FEE_UNITS.BLOCKS, txFeeInBlocks: 1.5 },
      }),
    ).rejects.toThrow('settings.fees.feedback_invalid_tx_fees_blocks')
  })

  it('should reject invalid sats/vbyte fees', async () => {
    await expect(
      schema.validate({
        txFee: { txFeeUnit: TX_FEE_UNITS.SATS_PER_VBYTE, txFeeInSatsPerVbyte: 1 },
      }),
    ).rejects.toThrow('settings.fees.feedback_invalid_tx_fees_satspervbyte')

    await expect(
      schema.validate({
        txFee: { txFeeUnit: TX_FEE_UNITS.SATS_PER_VBYTE, txFeeInSatsPerVbyte: 351 },
      }),
    ).rejects.toThrow('settings.fees.feedback_invalid_tx_fees_satspervbyte')
  })
})
