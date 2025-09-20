import { DisplayLogo } from '../DisplayLogo'
import { JarIcon } from './JarIcon'

interface SelectableJarProps {
  name: string
  color: string
  balance: number
  totalBalance: number
  isSelected: boolean
  onClick: () => void
}

export const SelectableJar = ({ name, color, balance, totalBalance, isSelected, onClick }: SelectableJarProps) => {
  return (
    <button className="flex flex-col items-center" onClick={onClick}>
      <JarIcon
        color={color}
        amount={balance || 0}
        isSelected={isSelected}
        totalBalance={totalBalance}
        className={`cursor-pointer ${isSelected ? 'scale-[0.70]' : 'scale-[0.65]'}`}
      />

      <span className="text-xs">{name}</span>
      <div className="flex items-center font-mono text-[10px] text-gray-500">
        <DisplayLogo currency="sats" size="sm" />
        <span>{balance.toLocaleString()}</span>
      </div>
      <div className="flex items-center">
        <div
          className={`light:border-black mx-0.5 mt-1 h-2 w-2 rounded-full border border-white ${!isSelected ? 'light:bg-gray-200 bg-gray-800' : 'light:bg-gray-800 bg-gray-200'}`}
        ></div>
      </div>
    </button>
  )
}
