import { SelectableJar } from '@/components/ui/jam/SelectableJar'
import { useJamWalletInfoContext, type Jar } from '@/context/JamWalletInfoContext'
import type { JarIndex } from '@/types/global'

type FidelityBondJarSelectorProps = {
  selectedJarIndex: JarIndex | undefined
  onSelect: (jarIndex: JarIndex) => void
  isJarDisabled: (jar: Jar) => boolean
}

/** jar selection grid shared by the fidelity bond flows, same look as the send flow's jar selector */
export function FidelityBondJarSelector({ selectedJarIndex, onSelect, isJarDisabled }: FidelityBondJarSelectorProps) {
  const { jars, walletBalanceSummary } = useJamWalletInfoContext()

  return (
    <div className="flex flex-1 flex-row flex-wrap items-center justify-center gap-2 gap-y-4">
      {jars.map((jar) => (
        <SelectableJar
          key={jar.jarIndex}
          name={jar.name}
          color={jar.color}
          totalBalance={jar.balanceSummary.calculatedTotalBalanceInSats}
          availableBalance={jar.balanceSummary.calculatedAvailableBalanceInSats}
          frozenOrLockedBalance={jar.balanceSummary.calculatedFrozenOrLockedBalanceInSats}
          totalWalletBalance={walletBalanceSummary.calculatedTotalBalanceInSats}
          isSelected={selectedJarIndex === jar.jarIndex}
          onClick={() => onSelect(jar.jarIndex)}
          disabled={isJarDisabled(jar)}
        />
      ))}
    </div>
  )
}
