import React, { useState } from 'react'
import { AlertCircle, Eye, EyeOff, Loader2, Lock, Wallet } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { hashPassword } from '@/lib/hash'
import { type CreateWalletResponse, createwallet, session } from '@/lib/jm-api/generated/client'
import { clearSession, setSession } from '@/lib/session'
import { formatWalletName } from '@/lib/utils'

const CreateWallet = () => {
  const navigate = useNavigate()
  const [walletName, setWalletName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [createWalletResponse, setCreateWalletResponse] = useState<CreateWalletResponse>()
  const [step, setStep] = useState<'create' | 'seed' | 'confirm'>('create')

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!walletName.trim()) {
      toast.error('Wallet name is required')
      return
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters long')
      return
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    try {
      setIsLoading(true)

      // Clear any existing local session
      clearSession()

      // Check if there's an active session on the server
      try {
        const { data: sessionInfo } = await session()
        if (sessionInfo?.session || sessionInfo?.wallet_name !== 'None') {
          console.warn('Active session detected:', sessionInfo)
          toast.error(
            `Cannot create wallet as "${formatWalletName(
              sessionInfo?.wallet_name || 'Unknown',
            )}" wallet is currently active.`,
            {
              description: (
                <div className="text-black dark:text-white">
                  Alternatively, you can{' '}
                  <Link to="/login" className="font-medium underline hover:no-underline">
                    log in with the existing wallet
                  </Link>{' '}
                  instead.
                </div>
              ),
              duration: 8000,
            },
          )
          return
        }
      } catch (sessionError) {
        console.warn('Could not check session status:', sessionError)
        // Continue anyway, wallet creation might still work
      }

      const walletFileName = walletName.endsWith('.jmdat') ? walletName : `${walletName}.jmdat`
      const { data: response, error: createError } = await createwallet({
        body: {
          walletname: walletFileName,
          password,
          wallettype: 'sw-fb',
        },
      })

      if (createError) {
        throw createError
      }

      if (response?.seedphrase) {
        setCreateWalletResponse(response)
        setStep('seed')
      } else {
        throw new Error('No seedphrase returned')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create wallet'
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmSeed = async () => {
    if (createWalletResponse?.seedphrase) {
      // Save session and navigate to dashboard
      const walletFileName = walletName.endsWith('.jmdat') ? walletName : `${walletName}.jmdat`
      const hashedSecret = await hashPassword(password, walletFileName)
      setSession({
        walletFileName,
        auth: { token: createWalletResponse.token, refresh_token: createWalletResponse.refresh_token }, // We'll need to unlock it properly later
        hashedSecret,
      })

      navigate('/login', {
        state: {
          message: 'Wallet created successfully! Please log in with your credentials.',
          walletName: walletFileName,
        },
      })
    }
  }

  const renderCreateForm = () => (
    <form onSubmit={handleCreateWallet} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="wallet-name">Wallet Name</Label>
        <Input
          id="wallet-name"
          type="text"
          value={walletName}
          onChange={(e) => setWalletName(e.target.value)}
          disabled={isLoading}
          placeholder="Enter wallet name"
          required
        />
        <p className="text-muted-foreground text-xs">Will be saved as {walletName || 'wallet-name'}.jmdat</p>
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
            disabled={isLoading}
            placeholder="Enter password"
            className="pr-10 pl-10"
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-1/2 right-1 -translate-y-1/2 transform"
            onClick={() => {
              setShowConfirmPassword(false)
              setShowPassword(!showPassword)
            }}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">Confirm Password</Label>
        <div className="relative">
          <Lock className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
          <Input
            id="confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
            placeholder="Confirm password"
            className="pr-10 pl-10"
            required
          />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute top-1/2 right-1 -translate-y-1/2 transform"
            onClick={() => {
              setShowPassword(false)
              setShowConfirmPassword(!showConfirmPassword)
            }}
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isLoading} size="lg">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating Wallet...
          </>
        ) : (
          'Create Wallet'
        )}
      </Button>
    </form>
  )

  const renderSeedPhrase = () => (
    <div className="space-y-6">
      <div className="bg-muted rounded-lg p-4">
        <div className="grid grid-cols-3 gap-2 font-mono text-sm">
          {createWalletResponse?.seedphrase.split(' ').map((word, index) => (
            <div key={index} className="bg-background rounded border p-2">
              <span className="text-muted-foreground mr-2">{index + 1}.</span>
              {word}
            </div>
          ))}
        </div>
      </div>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Important:</strong> Write down this seed phrase and store it safely. It's the only way to recover your
          wallet if you lose access.
        </AlertDescription>
      </Alert>

      <Button onClick={handleConfirmSeed} className="w-full" size="lg">
        I have saved my seed phrase
      </Button>
    </div>
  )

  return (
    <div className="from-background to-muted flex min-h-screen items-center justify-center bg-gradient-to-br p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <div className="bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full">
              <Wallet className="text-primary h-6 w-6" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {step === 'create' && 'Create New Wallet'}
              {step === 'seed' && 'Save Your Seed Phrase'}
            </CardTitle>
            <CardDescription>
              {step === 'create' && 'Set up a new Joinmarket wallet for CoinJoin privacy'}
              {step === 'seed' && "This is your wallet's recovery phrase"}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === 'create' && renderCreateForm()}
            {step === 'seed' && renderSeedPhrase()}

            {step === 'create' && (
              <div className="text-center">
                <p className="text-muted-foreground text-sm">
                  Already have a wallet?{' '}
                  <Link
                    to="/login"
                    className="text-primary hover:text-primary/80 font-medium underline underline-offset-4"
                  >
                    Sign in here
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default CreateWallet
