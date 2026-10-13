import { useEffect, useMemo, useState } from 'react'
import { BlocksIcon, CalendarIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BITCOIN_GENESIS_YEAR,
  estimateBlockheightFromDate,
  getAvailableYearOptions,
  getMonthOptions,
} from '@/lib/blockheight'
import { cn } from '@/lib/utils'
import type { BlockHeight } from '@/types/global'

export type RescanHeightMode = 'date' | 'block'

export interface RescanHeightSelectorProps {
  id?: string
  value: number
  onChange: (value: number) => void
  currentBlockHeight?: BlockHeight
  disabled?: boolean
  error?: string
}

export function RescanHeightSelector({
  id = 'blockheight',
  value,
  onChange,
  currentBlockHeight,
  disabled = false,
  error,
}: RescanHeightSelectorProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<RescanHeightMode>('date')
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [isGenesis, setIsGenesis] = useState<boolean>(value === 0)

  const yearOptions = useMemo(() => getAvailableYearOptions(), [])
  const monthOptions = useMemo(() => getMonthOptions(), [])

  useEffect(() => {
    if (mode !== 'date') return

    if (isGenesis) {
      if (value !== 0) {
        onChange(0)
      }
      return
    }

    if (selectedYear && selectedMonth) {
      const year = Number.parseInt(selectedYear, 10)
      const month = Number.parseInt(selectedMonth, 10)
      const estimated = estimateBlockheightFromDate({
        year,
        month,
        currentBlockHeight,
      })
      if (estimated !== value) {
        onChange(estimated)
      }
    }
  }, [mode, isGenesis, selectedYear, selectedMonth, currentBlockHeight, onChange, value])

  const handleGenesisToggle = (checked: boolean) => {
    setIsGenesis(checked)
    if (checked) {
      setSelectedYear(String(BITCOIN_GENESIS_YEAR))
      setSelectedMonth('01')
      onChange(0)
    } else {
      setSelectedYear('')
      setSelectedMonth('')
    }
  }

  return (
    <div className="space-y-3">
      <Field data-invalid={error !== undefined}>
        <FieldLabel htmlFor={id}>{t('import_wallet.import_details.label_blockheight')}</FieldLabel>
        <FieldDescription className="text-xs">
          {t('import_wallet.import_details.description_blockheight')}
        </FieldDescription>

        <Tabs value={mode} onValueChange={(newMode) => setMode(newMode as RescanHeightMode)} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="date" className="cursor-pointer" disabled={disabled}>
              <CalendarIcon className="mr-1.5 size-3.5" />
              {t('import_wallet.import_details.tab_rescan_by_date')}
            </TabsTrigger>
            <TabsTrigger value="block" className="cursor-pointer" disabled={disabled}>
              <BlocksIcon className="mr-1.5 size-3.5" />
              {t('import_wallet.import_details.tab_rescan_by_block')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="date" forceMount className={cn('mt-3 space-y-3', mode !== 'date' && 'hidden')}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Select
                  value={selectedMonth}
                  onValueChange={(newMonth) => setSelectedMonth(newMonth)}
                  disabled={disabled || isGenesis}
                >
                  <SelectTrigger
                    id={`${id}-month`}
                    className="h-10 w-full"
                    aria-label={t('import_wallet.import_details.label_month')}
                  >
                    <SelectValue placeholder={t('import_wallet.import_details.label_month')} />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Select
                  value={selectedYear}
                  onValueChange={(newYear) => setSelectedYear(newYear)}
                  disabled={disabled || isGenesis}
                >
                  <SelectTrigger
                    id={`${id}-year`}
                    className="h-10 w-full"
                    aria-label={t('import_wallet.import_details.label_year')}
                  >
                    <SelectValue placeholder={t('import_wallet.import_details.label_year')} />
                  </SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-2.5">
              <label htmlFor={`${id}-switch-genesis`} className="cursor-pointer text-sm font-medium">
                {t('import_wallet.import_details.label_start_at_genesis')}
              </label>
              <Switch
                id={`${id}-switch-genesis`}
                checked={isGenesis}
                onCheckedChange={handleGenesisToggle}
                disabled={disabled}
              />
            </div>

            <div className="text-muted-foreground text-xs">
              {isGenesis ? (
                <span className="text-foreground font-medium">
                  {t('import_wallet.import_details.hint_genesis_block')}
                </span>
              ) : selectedYear && selectedMonth ? (
                <span>
                  {t('import_wallet.import_details.hint_estimated_blockheight', {
                    blockheight: value.toLocaleString(),
                  })}
                </span>
              ) : (
                <span>{t('import_wallet.import_details.hint_select_month_year')}</span>
              )}
            </div>
          </TabsContent>

          <TabsContent value="block" forceMount className={cn('mt-3', mode !== 'block' && 'hidden')}>
            <InputGroup>
              <InputGroupInput
                id={id}
                placeholder={t('import_wallet.import_details.placeholder_blockheight')}
                value={value ?? ''}
                onChange={(event) => {
                  const blockNumber = Number.parseInt(event.target.value, 10)
                  onChange(Number.isNaN(blockNumber) ? 0 : blockNumber)
                }}
                disabled={disabled}
                type="number"
                min={0}
                step={1}
              />
              <InputGroupAddon align="inline-start">
                <BlocksIcon />
              </InputGroupAddon>
            </InputGroup>
          </TabsContent>
        </Tabs>

        {error && <FieldError>{error}</FieldError>}
      </Field>
    </div>
  )
}
