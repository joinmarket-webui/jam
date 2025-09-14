import { useState } from 'react'
import { useStore } from 'zustand'
import { FeeLimitDialog } from '@/components/settings/FeeLimitDialog'
import { FeeConfigTestComponent } from '@/components/ui/FeeConfigTestComponent'
import { authStore } from '@/store/authStore'

export default function DevPage() {
  const authState = useStore(authStore, (state) => state.state)
  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)

  return (
    <div className="mx-auto max-w-2xl space-y-3 p-4">
      <h1 className="my-2 text-2xl font-semibold tracking-tight">Development</h1>
      <p className="text-muted-foreground mb-4 text-sm">Development specific information</p>

      <div className="mt-8">
        <code className="light:text-red-700 text-red-800">import.meta.env:</code>
        <pre className="text-xs">{JSON.stringify(import.meta.env, null, 2)}</pre>
      </div>

      <div className="mt-8">
        <FeeConfigTestComponent />

        <FeeLimitDialog
          open={showFeeConfigDialog}
          onOpenChange={setShowFeeConfigDialog}
          walletFileName={authState?.walletFileName || ''}
        />
      </div>
    </div>
  )
}
