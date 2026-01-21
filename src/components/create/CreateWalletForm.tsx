import { useState } from 'react'
import { EyeIcon, EyeOffIcon, LockIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MAX_WALLET_NAME_LENGTH } from '@/constants/jam'
import { Spinner } from '../ui/spinner'

type CreateWalletFormProps = {
  onSubmit: (args: { walletName: string; password: string; confirmPassword: string }) => Promise<void>
  isSubmitting: boolean
}

// TODO: use react-hook-form and yup schema
export const CreateWalletForm = ({ onSubmit, isSubmitting }: CreateWalletFormProps) => {
  const { t } = useTranslation()
  const [walletName, setWalletName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit({
          walletName,
          password,
          confirmPassword,
        })
      }}
      className="space-y-4"
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="wallet-name">{t('create_wallet.label_wallet_name')}</Label>
        <Input
          id="wallet-name"
          type="text"
          value={walletName}
          onChange={(e) => setWalletName(e.target.value)}
          disabled={isSubmitting}
          placeholder={t('create_wallet.placeholder_wallet_name')}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">{t('create_wallet.label_password')}</Label>
        <div className="relative">
          <LockIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            placeholder={t('create_wallet.placeholder_password')}
            maxLength={MAX_WALLET_NAME_LENGTH}
            className="pr-10 pl-10"
            required
          />
          <Button
            tabIndex={-1}
            type="button"
            variant="link"
            size="icon"
            className="absolute top-1/2 right-0 -translate-y-1/2 transform"
            onClick={() => {
              setShowConfirmPassword(false)
              setShowPassword((val) => !val)
            }}
          >
            {showPassword ? <EyeIcon /> : <EyeOffIcon />}
          </Button>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirm-password">{t('create_wallet.label_password_confirm')}</Label>
        <div className="relative">
          <LockIcon className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
          <Input
            id="confirm-password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isSubmitting}
            placeholder={t('create_wallet.placeholder_password_confirm')}
            className="pr-10 pl-10"
            required
          />
          <Button
            tabIndex={-1}
            type="button"
            variant="link"
            size="icon"
            className="absolute top-1/2 right-0 -translate-y-1/2 transform"
            onClick={() => {
              setShowPassword(false)
              setShowConfirmPassword((val) => !val)
            }}
          >
            {showConfirmPassword ? <EyeIcon /> : <EyeOffIcon />}
          </Button>
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting} size="lg">
        {isSubmitting ? (
          <>
            <Spinner className="motion-reduce:hidden" />
            {t('create_wallet.button_creating')}
          </>
        ) : (
          <>{t('create_wallet.button_create')}</>
        )}
      </Button>
    </form>
  )
}
