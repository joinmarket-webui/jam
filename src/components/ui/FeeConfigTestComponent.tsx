import { useState } from 'react'
import { useStore } from 'zustand'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { authStore } from '@/store/authStore'
import { FeeLimitDialog } from '../settings/FeeLimitDialog'
import { FeeConfigErrorAlert } from './FeeConfigErrorAlert'

export const FeeConfigTestComponent = () => {
  const [showFeeConfigDialog, setShowFeeConfigDialog] = useState(false)
  const [forceError, setForceError] = useState(false)
  const authState = useStore(authStore, (state) => state.state)

  return (
    <Card className="border-2 border-dashed border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
      <CardHeader>
        <CardTitle className="text-yellow-700 dark:text-yellow-300">🧪 Fee Config Error Test Component</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-yellow-600 dark:text-yellow-400">
          This component allows you to test the fee config error handling.
        </p>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setForceError(!forceError)}
            className="border-yellow-500 text-yellow-700 hover:bg-yellow-100 dark:text-yellow-300 dark:hover:bg-yellow-800"
          >
            {forceError ? 'Hide Error' : 'Show Error'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFeeConfigDialog(true)}
            className="border-blue-500 text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-800"
          >
            Open Fee Config Dialog
          </Button>
        </div>

        {/* Force Error Display */}
        {forceError && <FeeConfigErrorAlert onOpenFeeConfig={() => setShowFeeConfigDialog(true)} className="mt-4" />}

        {/* Fee Configuration Dialog */}
        <FeeLimitDialog
          open={showFeeConfigDialog}
          onOpenChange={setShowFeeConfigDialog}
          walletFileName={authState?.walletFileName || ''}
        />
      </CardContent>
    </Card>
  )
}
