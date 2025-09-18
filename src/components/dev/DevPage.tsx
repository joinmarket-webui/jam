import { useState } from 'react'
import { useStore } from 'zustand'
import { FeeConfigTestComponent } from '@/components/dev/FeeConfigTestComponent'
import { FeeLimitDialog } from '@/components/settings/FeeLimitDialog'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import type { WalletFileName } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { jamSettingsStore } from '@/store/jamSettingsStore'
import { jmSessionStore } from '@/store/jmSessionStore'
import { Button } from '../ui/button'

interface DevPageProps {
  walletFileName?: WalletFileName
}

export default function DevPage({ walletFileName }: DevPageProps) {
  const authState = useStore(authStore, (state) => state.state)
  const jmSessionState = useStore(jmSessionStore, (state) => state.state)
  const jamSettingsState = useStore(jamSettingsStore, (state) => state.state)
  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)

  const feeConfig = useFeeConfigValidation({ walletFileName: walletFileName ?? 'None.jmdat' })

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      <h1 className="my-2 text-2xl font-semibold tracking-tight">Development</h1>
      <p className="text-muted-foreground mb-4 text-sm">Development specific information</p>

      <div className="mt-8 overflow-scroll">
        <code className="light:text-red-700 text-red-800">import.meta.env:</code>
        <pre className="text-xs">{JSON.stringify(import.meta.env, null, 2)}</pre>
      </div>
      <div className="mt-8 overflow-scroll">
        <code className="light:text-red-700 text-red-800">useStore(authStore):</code>
        <pre className="text-xs">{JSON.stringify(authState, null, 2)}</pre>
      </div>
      <div className="mt-8 overflow-scroll">
        <code className="light:text-red-700 text-red-800">useStore(jmSessionStore):</code>
        <pre className="text-xs">{JSON.stringify(jmSessionState, null, 2)}</pre>
      </div>
      <div className="mt-8 overflow-scroll">
        <code className="light:text-red-700 text-red-800">useStore(jamSettingsStore):</code>
        <pre className="text-xs">{JSON.stringify(jamSettingsState, null, 2)}</pre>
      </div>

      {feeConfig && walletFileName && (
        <div className="mt-8">
          <h3 className="my-2 text-xl font-semibold tracking-tight">Fees</h3>
          <FeeConfigTestComponent walletFileName={walletFileName} />

          <FeeLimitDialog
            open={showFeeConfigDialog}
            onOpenChange={setShowFeeConfigDialog}
            walletFileName={walletFileName}
          />

          <div className="overflow-scroll">
            <code className="light:text-red-700 text-red-800">feeConfig.feeConfigValues:</code>
            <pre className="text-xs">{JSON.stringify(feeConfig.feeConfigValues, null, 2)}</pre>
          </div>
          <div className="overflow-scroll">
            <code className="light:text-red-700 text-red-800">feeConfig.isLoading:</code>
            <pre className="text-xs">{JSON.stringify(feeConfig.isLoading, null, 2)}</pre>
          </div>
          <div className="overflow-scroll">
            <code className="light:text-red-700 text-red-800">feeConfig.maxFeesConfigMissing:</code>
            <pre className="text-xs">{JSON.stringify(feeConfig.maxFeesConfigMissing, null, 2)}</pre>
          </div>
          <Button onClick={() => feeConfig.refetchAll()}>feeConfig.refetchAll()</Button>
        </div>
      )}
    </div>
  )
}
