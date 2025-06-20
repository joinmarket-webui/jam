interface JarProps {
  name: string
  amount: number
  color: '#e2b86a' | '#3b5ba9' | '#c94f7c' | '#a67c52' | '#7c3fa6'
  displayMode: 'sats' | 'btc'
  totalBalance?: number
}

type JarFillLevel = 0 | 1 | 2 | 3

function formatAmount(amount: number, displayMode: 'sats' | 'btc') {
  if (displayMode === 'btc') {
    return (amount / 100_000_000).toLocaleString(undefined, {
      maximumFractionDigits: 8,
    })
  }
  return amount.toLocaleString()
}

function getLogo(displayMode: 'sats' | 'btc') {
  return displayMode === 'btc' ? (
    '₿'
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16px"
      height="16px"
      viewBox="0 0 24 24"
      fill="none"
      style={{ display: 'inline', verticalAlign: 'middle', marginLeft: 2 }}
    >
      <path d="M7 7.90906H17" stroke="currentColor" />
      <path d="M12 5.45454V3" stroke="currentColor" />
      <path d="M12 20.9999V18.5454" stroke="currentColor" />
      <path d="M7 12H17" stroke="currentColor" />
      <path d="M7 16.0909H17" stroke="currentColor" />
    </svg>
  )
}

// Function to calculate the jar fill level based on jar balance relative to total balance
const calculateJarFillLevel = (jarBalance: number, totalBalance: number): JarFillLevel => {
  if (totalBalance === 0) return 0
  if (jarBalance > totalBalance / 2) return 3
  if (jarBalance > totalBalance / 4) return 2
  if (jarBalance > 0) return 1
  return 0
}

// Convert fill level to percentage for the visual display
const fillLevelToPercent = (fillLevel: JarFillLevel): number => {
  switch (fillLevel) {
    case 0:
      return 0
    case 1:
      return 30
    case 2:
      return 60
    case 3:
      return 90
  }
}

export function Jar({ name, amount, color, displayMode, totalBalance = 0 }: JarProps) {
  const fillLevel = calculateJarFillLevel(amount, totalBalance)
  const fillPercent = fillLevelToPercent(fillLevel)
  return (
    <div className="flex cursor-pointer flex-col items-center transition-all duration-300 hover:scale-105">
      <div className="mb-2">
        <div className="relative flex h-20 w-12 flex-col items-center">
          {/* Jar body */}
          <div className="absolute top-3 left-0 flex h-4/5 w-full items-end">
            <div className="bg-opacity-60 flex h-full w-full items-end overflow-hidden rounded-t-[16px] rounded-b-[10px] border-2 border-gray-400 bg-white dark:bg-gray-300">
              {/* Fill */}
              <div
                className="w-full rounded-b-[8px] transition-all duration-500"
                style={{
                  height: `${fillPercent}%`,
                  backgroundColor: color,
                  opacity: 0.85,
                }}
              />
            </div>
          </div>
          {/* Jar neck */}
          <div className="absolute top-0 left-2 z-10 h-3.5 w-8 rounded-t-[8px] border-2 border-b-0 border-gray-400 bg-white dark:bg-gray-300" />
          {/* Jar lid */}
          <div className="absolute top-0 left-1 z-20 h-2 w-10 rounded-t-[8px] rounded-b-[8px] bg-gray-500" />
        </div>
      </div>
      <p className="text-center text-sm">{name}</p>
      <p className="min-w-[110px] text-center text-xs tabular-nums">
        {formatAmount(amount, displayMode)} {getLogo(displayMode)}
      </p>
    </div>
  )
}
