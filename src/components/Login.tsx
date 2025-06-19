import React, { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useNavigate, Link } from 'react-router-dom'
import { setSession } from '@/lib/session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertCircle, Wallet, Lock, Loader2, Eye, EyeOff } from 'lucide-react'
import { formatWalletName } from '@/lib/utils'
import { useMutation, useQuery } from '@tanstack/react-query'
import { listwalletsOptions, unlockwalletMutation } from '@/lib/jm-api/generated/client/@tanstack/react-query.gen'
import { useApiClient } from '@/hooks/useApiClient'

const LoginPage = () => {
  const navigate = useNavigate()
  const client = useApiClient()
  const [selectedWallet, setSelectedWallet] = useState<string>()
  const [password, setPassword] = useState<string>()
  const [showPassword, setShowPassword] = useState<boolean>(false)

  const listwalletsQuery = useQuery({
    ...listwalletsOptions({ client }),
    retry: false,
  })

  const isLoadingWallets = useMemo(() => listwalletsQuery.isFetching, [listwalletsQuery.isFetching])
  const listwalletsError = useMemo(() => {
    if (!listwalletsQuery.error) return undefined
    return `Failed to load wallets: ${listwalletsQuery.error.message}`
  }, [listwalletsQuery.error])

  const wallets = useMemo(() => listwalletsQuery.data?.wallets, [listwalletsQuery.data])

  useEffect(
    function preselectWalletIfOnlyOneExists() {
      if (wallets === undefined || wallets.length !== 1) return
      setSelectedWallet((current) => current ?? wallets[0])
    },
    [wallets],
  )

  const unlockWallet = useMutation({
    ...unlockwalletMutation({ client }),
    retry: false,
    onSuccess: () => {
      toast.success('Successfully unlocked wallet.')
    },
    onError: (error) => {
      toast.error(`Failed to unlock wallet: ${error.message || 'Unknown reason.'}`)
    },
  })

  const isUnlockingWallet = useMemo(() => unlockWallet.isPending, [unlockWallet.isPending])
  const isLoading = useMemo(() => isLoadingWallets || isUnlockingWallet, [isLoadingWallets, isUnlockingWallet])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedWallet) return

    try {
      const response = await unlockWallet.mutateAsync({
        path: {
          walletname: encodeURIComponent(selectedWallet),
        },
        body: {
          password: password || '',
        },
      })

      setSession({
        walletFileName: response.walletname,
        auth: { token: response.token, refresh_token: response.refresh_token },
      })

      await navigate('/')
    } catch (error: unknown) {
      console.error('Error unlocking wallet', error)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              {isLoadingWallets ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Wallet className="h-6 w-6 text-primary" />
              )}
            </div>
            <CardTitle className="text-2xl font-bold">Welcome to Jam</CardTitle>
            <CardDescription>Select your wallet and enter your password to continue</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {listwalletsError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{listwalletsError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wallet-select">Wallet</Label>
                <Select
                  value={selectedWallet ?? ''}
                  onValueChange={setSelectedWallet}
                  disabled={isLoading || wallets === undefined || wallets.length === 0}
                  required
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets?.map((wallet, index) => (
                      <SelectItem key={index} value={wallet}>
                        {formatWalletName(wallet)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isLoadingWallets && (wallets === undefined || wallets.length === 0) && (
                  <p className="text-sm text-muted-foreground">No wallets found. Please create a wallet first.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password || ''}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    placeholder="Enter your password"
                    className="pl-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading || !selectedWallet} size="lg">
                {isUnlockingWallet ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Unlocking...
                  </>
                ) : (
                  'Unlock'
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don't have a wallet yet?{' '}
                <Link
                  to="/create-wallet"
                  className="text-primary hover:text-primary/80 font-medium underline underline-offset-4"
                >
                  Create a new wallet
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default LoginPage
