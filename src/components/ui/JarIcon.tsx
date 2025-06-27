import type { ReactNode } from 'react'
import { useState } from 'react'
import { cn } from '@/lib/utils'

const calculateJarFillLevel = (jarBalance: number, totalBalance: number): JarFillLevel => {
  if (totalBalance === 0) return 0
  if (jarBalance > totalBalance / 2) return 3
  if (jarBalance > totalBalance / 4) return 2
  if (jarBalance > 0) return 1
  return 0
}

type JarFillLevel = 0 | 1 | 2 | 3

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

interface JarIconProps {
  color?: string
  amount?: number
  totalBalance?: number
  width?: number
  height?: number
  isSelected?: boolean
  className?: string
  children?: ReactNode
}

export function JarIcon({
  color = '#e2b86a',
  amount = 0,
  totalBalance = 0,
  isSelected = false,
  className,
}: JarIconProps) {
  const [isHovered, setIsHovered] = useState(false)
  const fillLevel = calculateJarFillLevel(amount, totalBalance)
  const fillPercent = fillLevelToPercent(fillLevel)

  const isLidOpen = isHovered || isSelected

  return (
    <div
      className={cn(
        'relative flex h-20 w-12 flex-col items-center transition-transform duration-200 ease-in-out',
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Jar body */}
      <div className={`absolute top-3 left-0 flex h-4/5 w-full items-end`}>
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
      <div className="absolute top-0 left-2 z-10 mt-2 h-2 w-8 border-2 border-y-0 border-gray-400 bg-white dark:bg-gray-300" />
      {/* Jar lid */}
      <div
        className="absolute z-20 h-2 w-10 rounded-t-[8px] rounded-b-[8px] bg-gray-500 transition-transform duration-200 ease-in-out"
        style={{
          top: isLidOpen ? '-5px' : '0px',
        }}
      />
    </div>
  )
}
