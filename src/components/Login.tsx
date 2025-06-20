import React, { useEffect, useMemo, useState } from 'react'

import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertCircle, Eye, EyeOff, Loader2, Lock, RefreshCwIcon, Wallet } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { listwalletsOptions, unlockwalletMutation } from '@/lib/jm-api/generated/client/@tanstack/react-query.gen'
import { setSession } from '@/lib/session'
import { formatWalletName } from '@/lib/utils'

import { useApiClient } from '@/hooks/useApiClient'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { Skeleton } from './ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

const LoginFormSkeleton = () => {
  return (
    <>
      <div className="flex flex-col space-y-6">
        <Skeleton className="h-4 w-full" />
        <div className="space-y-3">
          <div className="space-y-1">
            <Skeleton className="h-4 w-[75px]" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-[75px]" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
      <div>&nbsp;</div>
      <div>&nbsp;</div>
    </>
  )
}

interface LoginFormProps {
  wallets: string[]
  isSubmitting: boolean
  onSubmit: (val: { walletFileName: string; password: string }) => Promise<void>
}

const LoginForm = ({ wallets, isSubmitting, onSubmit }: LoginFormProps) => {
  const [selectedWallet, setSelectedWallet] = useState<string | undefined>(
    wallets.length !== 1 ? undefined : wallets[0],
  )
  const [password, setPassword] = useState<string>('')
  const [showPassword, setShowPassword] = useState<boolean>(false)

  useEffect(
    function preselectWalletIfOnlyOneExists() {
      if (wallets.length !== 1) return
      setSelectedWallet(wallets[0])
    },
    [wallets],
  )

  return (
    <>
      <form
        onSubmit={(e: React.FormEvent) => {
          e.preventDefault()

          if (selectedWallet === undefined) return

          onSubmit({ walletFileName: selectedWallet, password })
        }}
        className="space-y-4"
      >
        <div className="space-y-2">
          <Label htmlFor="wallet-select">Wallet</Label>
          <Select
            value={selectedWallet ?? ''}
            onValueChange={setSelectedWallet}
            disabled={isSubmitting || wallets.length === 0}
            required
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={wallets.length > 0 ? 'Select a wallet' : 'No wallets found.'} />
            </SelectTrigger>
            <SelectContent>
              {wallets?.map((wallet, index) => (
                <SelectItem key={index} value={wallet}>
                  {formatWalletName(wallet)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isSubmitting}
              placeholder="Enter your password"
              className="pr-10 pl-10"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute top-1/2 right-1 -translate-y-1/2 transform"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting || !selectedWallet} size="lg">
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Unlocking...
            </>
          ) : (
            'Unlock'
          )}
        </Button>
      </form>
    </>
  )
}

const LoginPage = () => {
  const navigate = useNavigate()
  const client = useApiClient()

  const listwalletsQuery = useQuery({
    ...listwalletsOptions({ client }),
    retry: false,
  })

  const isLoadingWallets = useMemo(() => listwalletsQuery.isFetching, [listwalletsQuery.isFetching])
  const listwalletsError = useMemo(() => {
    if (!listwalletsQuery.error) return undefined
    return {
      message: `Failed to load wallets`,
      error_description: listwalletsQuery.error.message || 'Unknown reason.',
    }
  }, [listwalletsQuery.error])

  const wallets = useMemo(() => listwalletsQuery.data?.wallets, [listwalletsQuery.data])

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

  const handleSubmit = async (data: { walletFileName: string; password: string }) => {
    try {
      const response = await unlockWallet.mutateAsync({
        path: {
          walletname: encodeURIComponent(data.walletFileName),
        },
        body: {
          password: data.password,
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
    <div className="from-background to-muted flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              {isLoadingWallets ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Wallet className="text-primary h-6 w-6" onClick={async () => await listwalletsQuery.refetch()} />
              )}
            </div>
            <CardTitle className="text-2xl font-bold">Welcome to Jam</CardTitle>
            {!isLoadingWallets && wallets !== undefined && wallets.length > 0 && (
              <CardDescription>Select a wallet and enter your password to continue.</CardDescription>
            )}
          </CardHeader>

          {isLoadingWallets ? (
            <CardContent className="space-y-6">
              <LoginFormSkeleton />
            </CardContent>
          ) : (
            <>
              {listwalletsError ? (
                <CardContent className="space-y-6">
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>{listwalletsError.message}</AlertTitle>
                    <AlertDescription>{listwalletsError.error_description}</AlertDescription>
                  </Alert>
                  <Button variant="ghost" size="sm" onClick={async () => await listwalletsQuery.refetch()}>
                    <RefreshCwIcon className="h-4 w-4" /> Retry
                  </Button>
                </CardContent>
              ) : (
                <CardContent className="space-y-6">
                  {wallets!.length === 0 ? (
                    <>
                      <div className="text-center">
                        <p className="text-muted-foreground text-sm">It looks like you do not have a wallet, yet.</p>
                      </div>
                      <div className="space-y-4">
                        <Button className="w-full" size="lg" onClick={async () => await navigate('/create-wallet')}>
                          Create new wallet
                        </Button>
                        <Tooltip>
                          <TooltipTrigger className="w-full">
                            <Button variant="secondary" className="w-full" size="lg" disabled>
                              Import existing wallet
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Not yet implemented.</TooltipContent>
                        </Tooltip>
                      </div>
                    </>
                  ) : (
                    <>
                      <LoginForm wallets={wallets || []} isSubmitting={isUnlockingWallet} onSubmit={handleSubmit} />

                      <div className="flex flex-col gap-2">
                        <Button
                          variant="link"
                          size="sm"
                          onClick={async () => await navigate('/create-wallet')}
                          className="cursor-pointer"
                        >
                          Create a new wallet
                        </Button>
                        <Tooltip>
                          <TooltipTrigger className="w-full">
                            <Button
                              variant="link"
                              size="sm"
                              onClick={async () => await navigate('/create-wallet')}
                              disabled
                            >
                              Import an existing wallet
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Not yet implemented.</TooltipContent>
                        </Tooltip>
                      </div>
                    </>
                  )}
                </CardContent>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}

export default LoginPage
