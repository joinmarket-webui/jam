import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { txFeeUnit, type TxFeeUnit } from '@/constants/jm'
import { DisplayLogo } from '../DisplayLogo'

export interface TxFeeInputFieldProps {
  value: string
  unit: TxFeeUnit
  onUnitChange: (unit: TxFeeUnit) => void
  onValueChange: (value: string) => void
  error?: string
  disabled?: boolean
}

export const TxFeeInputField = ({
  value,
  unit,
  onUnitChange,
  onValueChange,
  error,
  disabled,
}: TxFeeInputFieldProps) => {
  const { t } = useTranslation()
  const unitTabs = useMemo(
    () => [
      { label: t('settings.fees.radio_tx_fees_blocks'), value: txFeeUnit.BLOCKS },
      { label: t('settings.fees.radio_tx_fees_satspervbyte'), value: txFeeUnit.SATS_PER_KILO_VBYTE },
    ],
    [t],
  )

  const handleUnitChange = (newUnit: TxFeeUnit) => {
    if (newUnit !== unit && value) {
      const numValue = Number(value)
      if (!isNaN(numValue)) {
        if (newUnit === txFeeUnit.SATS_PER_KILO_VBYTE && unit === txFeeUnit.BLOCKS) {
          // Convert blocks to sats/vbyte
          const converted = Math.round(numValue * 1000)
          onValueChange(String(converted / 1000))
        } else if (newUnit === txFeeUnit.BLOCKS && unit === txFeeUnit.SATS_PER_KILO_VBYTE) {
          // Convert sats/vbyte to blocks
          const converted = Math.round(numValue * 1000)
          onValueChange(String(Math.round(converted / 1000)))
        }
      }
    }
    onUnitChange(newUnit)
  }

  return (
    <div>
      <div className="mb-2 flex gap-4">
        {unitTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => handleUnitChange(tab.value as TxFeeUnit)}
            className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              unit === tab.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
            disabled={disabled}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <p className="text-muted-foreground mb-1 text-sm">
        {unit === txFeeUnit.BLOCKS
          ? t('settings.fees.description_tx_fees_blocks')
          : t('settings.fees.description_tx_fees_satspervbyte')}
      </p>
      <div className="flex max-w-md items-center">
        {unit === txFeeUnit.BLOCKS ? (
          <div className="bg-muted flex h-9 items-center rounded-l-md border border-r-0 px-3 py-2">
            <span className="text-xl font-medium">📦</span>
          </div>
        ) : (
          <div className="bg-muted flex h-9 items-center rounded-l-md border border-r-0 px-3 py-2">
            <div className="font-xs flex items-center text-xs">
              <DisplayLogo currency="sats" size="sm" /> <span className="text-nowrap">/ vB</span>
            </div>
          </div>
        )}
        <Input
          type="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={unit === txFeeUnit.BLOCKS ? '3' : '1.0'}
          className={'rounded-l-none'}
          disabled={disabled}
        />
      </div>
      {error && <div className="mt-1 text-xs text-red-500">{error}</div>}
    </div>
  )
}
