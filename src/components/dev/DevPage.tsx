import { useState } from 'react'
import { useStore } from 'zustand'
import { FeeLimitDialog } from '@/components/settings/FeeLimitDialog'
import { FeeConfigTestComponent } from '@/components/ui/FeeConfigTestComponent'
import { useFeeConfigValidation } from '@/hooks/useFeeConfigValidation'
import { authStore } from '@/store/authStore'
import { Button } from '../ui/button'

export default function DevPage() {
  const authState = useStore(authStore, (state) => state.state)
  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)

  //const { feeConfigValues, refetchAll: refetchFeeConfigValues, isLoading: isLoadingFeeConfig } = useFeeConfigValidation()
  const feeConfig = useFeeConfigValidation()
  //const feeConfigValues = {}
  //const refetchFeeConfigValues = () => ({})

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      <h1 className="my-2 text-2xl font-semibold tracking-tight">Development</h1>
      <p className="text-muted-foreground mb-4 text-sm">Development specific information</p>

      <div className="mt-8">
        <code className="light:text-red-700 text-red-800">import.meta.env:</code>
        <pre className="text-xs">{JSON.stringify(import.meta.env, null, 2)}</pre>
      </div>

      <div className="mt-8">
        <h3 className="my-2 text-xl font-semibold tracking-tight">Fees</h3>
        <FeeConfigTestComponent />

        <FeeLimitDialog
          open={showFeeConfigDialog}
          onOpenChange={setShowFeeConfigDialog}
          walletFileName={authState?.walletFileName || ''}
        />

        <code className="light:text-red-700 text-red-800">feeConfig.feeConfigValues:</code>
        <pre className="text-xs">{JSON.stringify(feeConfig.feeConfigValues, null, 2)}</pre>

        <code className="light:text-red-700 text-red-800">
          <footer></footer>feeConfig.isLoading:
        </code>
        <pre className="text-xs">{JSON.stringify(feeConfig.isLoading, null, 2)}</pre>

        <code className="light:text-red-700 text-red-800">
          <footer></footer>feeConfig.maxFeesConfigMissing:
        </code>
        <pre className="text-xs">{JSON.stringify(feeConfig.maxFeesConfigMissing, null, 2)}</pre>

        <Button onClick={() => feeConfig.refetchAll()}>feeConfig.refetchAll()</Button>
      </div>
    </div>
  )
}
