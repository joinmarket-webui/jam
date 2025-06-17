import React, { useEffect, useState } from 'react'
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
import { listwallets, unlockwallet } from '@/lib/jm-api/generated/client'

const LoginPage = () => {
  const navigate = useNavigate()
  const [wallets, setWallets] = useState<string[]>([])
  const [selectedWallet, setSelectedWallet] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)

  useEffect(() => {
    // Fetch available wallets when component mounts
    const fetchWallets = async () => {
      try {
        setIsLoading(true)
        const { data, error } = await listwallets()
        if (error || !data?.wallets) {
          throw new Error('No wallets found')
        }
        setWallets(data.wallets || [])
        if (data.wallets && data.wallets.length > 0) {
          setSelectedWallet(data.wallets[0])
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch wallets')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchWallets()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedWallet || !password) return

    try {
      setIsLoading(true)
      setError(null)

      const { data, error } = await unlockwallet({
        path: { walletname: selectedWallet },
        body: { password },
      })

      if (error) {
        throw error
      }

      // Save session data
      setSession({
        walletFileName: selectedWallet,
        auth: { token: data?.token || '' },
      })

      navigate('/')
    } catch (err: unknown) {
      if (typeof err === 'object' && err !== null && 'message' in err) {
        setError(err.message as string)
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Wallet className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold">Welcome to Jam</CardTitle>
            <CardDescription>Select your wallet and enter your password to continue</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wallet-select">Wallet</Label>
                <Select
                  value={selectedWallet}
                  onValueChange={setSelectedWallet}
                  disabled={isLoading || wallets.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a wallet" />
                  </SelectTrigger>
                  <SelectContent>
                    {wallets.map((wallet) => (
                      <SelectItem key={wallet} value={wallet}>
                        {formatWalletName(wallet)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {wallets.length === 0 && !isLoading && (
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
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading || !selectedWallet}
                    placeholder="Enter your password"
                    className="pl-10 pr-10"
                    required
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

              <Button type="submit" className="w-full" disabled={isLoading || !selectedWallet || !password} size="lg">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging in...
                  </>
                ) : (
                  'Log in'
                )}
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Don't have a wallet?{' '}
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
