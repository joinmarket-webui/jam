import { useState } from 'react'
import { EyeIcon, EyeOffIcon, LockIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { shortenStringMiddle, walletDisplayName } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'

const LoginFormSkeleton = () => {
  return (
    <div className="flex flex-col space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-[75px]" />
          <Skeleton className="h-8 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-[75px]" />
          <Skeleton className="h-9 w-full" />
        </div>
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  )
}

interface LoginFormData {
  walletFileName: WalletFileName
  password: string
}

type LoginFormComponentProps = {
  wallets: WalletFileName[]
  preselectedWallet?: WalletFileName
  disabled: boolean
  isSubmitting: boolean
  onSubmit: (val: LoginFormData) => Promise<void>
}

/* TODO: use react-hook-form and yup schema */
export const LoginFormComponent = ({
  wallets,
  preselectedWallet,
  isSubmitting,
  onSubmit,
  disabled,
}: LoginFormComponentProps) => {
  const { t } = useTranslation()
  const [selectedWallet, setSelectedWallet] = useState<WalletFileName | undefined>(preselectedWallet)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  if (wallets.length === 1 && selectedWallet === undefined) {
    setSelectedWallet(wallets[0])
  }

  return (
    <form
      onSubmit={(e: React.FormEvent) => {
        e.preventDefault()

        if (!selectedWallet) return

        onSubmit({ walletFileName: selectedWallet, password })
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="wallet-select">{/* TODO: i18n */}Wallet</Label>
        <Select
          value={selectedWallet ?? undefined}
          onValueChange={(it) => setSelectedWallet(it as WalletFileName)}
          disabled={disabled || isSubmitting || wallets.length === 0}
          required
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={/* TODO: i18n */ wallets.length > 0 ? 'Select a wallet' : 'No wallets found.'} />
          </SelectTrigger>
          <SelectContent>
            {wallets?.map((wallet, index) => (
              <SelectItem key={index} value={wallet}>
                {shortenStringMiddle(walletDisplayName(wallet), 32)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{/* TODO: i18n */}Password</Label>
        <div className="relative">
          <LockIcon className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2 transform" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={disabled || isSubmitting}
            placeholder={t('wallets.wallet_preview.placeholder_password')}
            className="pr-10 pl-10"
          />
          <Button
            tabIndex={-1}
            type="button"
            variant="link"
            size="icon"
            className="absolute top-1/2 right-0 -translate-y-1/2 transform"
            onClick={() => setShowPassword((val) => !val)}
          >
            {showPassword ? <EyeIcon /> : <EyeOffIcon />}
          </Button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={disabled || isSubmitting || !selectedWallet} size="lg">
        {isSubmitting ? (
          <>
            <Spinner className="motion-reduce:hidden" />
            {t('wallets.wallet_preview.button_unlocking')}
          </>
        ) : (
          <>{t('wallets.wallet_preview.button_unlock')}</>
        )}
      </Button>
    </form>
  )
}

type LoginFormLoadingProps = {
  loading: true
}

type LoginFormProps =
  | LoginFormLoadingProps
  | LoginFormComponentProps
  | (LoginFormLoadingProps & Partial<LoginFormComponentProps>)
  | ({ loading?: false } & LoginFormComponentProps)

function isLoginFormLoadingGuard(val: LoginFormProps): val is LoginFormLoadingProps {
  return (val as LoginFormLoadingProps).loading === true
}

export const LoginForm = (props: LoginFormProps) => {
  if (isLoginFormLoadingGuard(props)) {
    return <LoginFormSkeleton />
  } else {
    return <LoginFormComponent {...props} />
  }
}
