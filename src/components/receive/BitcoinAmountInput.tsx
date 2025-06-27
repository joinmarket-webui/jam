import { ArrowUpDown } from 'lucide-react'
import { DisplayLogo } from '../DisplayLogo'
import { Button } from '../ui/button'
import { Input } from '../ui/input'

type DisplayMode = 'sats' | 'btc'

interface BitcoinAmountInputProps extends Omit<React.ComponentProps<'input'>, 'type'> {
  amountDisplayMode: DisplayMode
  toggleDisplayMode: () => void
}

export const BitcoinAmountInput = ({
  amountDisplayMode,
  onChange,
  value,
  toggleDisplayMode,
  disabled,
  ...inputProps
}: BitcoinAmountInputProps) => {
  return (
    <>
      <p className="mb-2 text-sm">Amount</p>
      <div className="flex w-full items-center gap-2">
        <div className="relative flex-1">
          <div onClick={toggleDisplayMode} className="absolute inset-y-0 left-0 flex items-center px-1">
            <span className="px-1 text-gray-500">
              <DisplayLogo displayMode={amountDisplayMode} size="sm" />
            </span>
          </div>
          <Input
            type="number"
            placeholder={`Enter Amount in ${amountDisplayMode}`}
            value={value}
            onChange={onChange}
            className="pl-8"
            step={amountDisplayMode === 'btc' ? '0.00000001' : '1'}
            inputMode="numeric"
            pattern="[0-9]*"
            aria-label={`Amount in ${amountDisplayMode}`}
            autoComplete="off"
            autoFocus={true}
            disabled={disabled}
            {...inputProps}
          />
        </div>
        <Button variant="outline" size="sm" className="py-4 whitespace-nowrap" onClick={toggleDisplayMode}>
          {amountDisplayMode === 'sats' ? 'BTC' : 'Sats'}
          <ArrowUpDown />
        </Button>
      </div>
    </>
  )
}
