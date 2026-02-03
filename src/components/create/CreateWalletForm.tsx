import { useMemo, useState } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import type { TFunction } from 'i18next'
import { EyeIcon, EyeOffIcon, LockIcon } from 'lucide-react'
import { useForm, type Mode, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as yup from 'yup'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MAX_WALLET_NAME_LENGTH } from '@/constants/jam'
import { JM_WALLET_FILE_EXTENSION } from '@/constants/jm'
import { cn, type WalletFileName } from '@/lib/utils'
import { Field, FieldLabel } from '../ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group'
import { Spinner } from '../ui/spinner'

interface CreateFormValues {
  walletName: string
  password: string
  confirmPassword: string
}

const createFormSchema = (wallets: WalletFileName[], t: TFunction) => {
  return yup
    .object({
      walletName: yup
        .string()
        .trim()
        .max(MAX_WALLET_NAME_LENGTH)
        .required()
        .test('valid-wallet-name-test', t('create_wallet.feedback_invalid_wallet_name'), (value) => {
          return /^[\w-]+$/.test(value)
        })
        .test('valid-wallet-name-exists-test', t('create_wallet.feedback_wallet_name_already_exists'), (value) => {
          return !wallets.includes((value + JM_WALLET_FILE_EXTENSION) as WalletFileName)
        }),
      password: yup.string().min(1).required(),
      confirmPassword: yup
        .string()
        .required()
        .test(
          'valid-confirm-password-test',
          t('create_wallet.feedback_invalid_password_confirm'),
          (value, { parent: { password } }) => {
            return value === password
          },
        ),
    })
    .required()
}

type CreateWalletFormProps = {
  className?: string
  wallets: WalletFileName[]
  onSubmit: SubmitHandler<CreateFormValues>
  disabled?: boolean
  mode?: Mode
}

// TODO: use react-hook-form and yup schema
export const CreateWalletForm = ({
  className,
  wallets,
  onSubmit,
  disabled,
  mode = 'onSubmit',
}: CreateWalletFormProps) => {
  const { t } = useTranslation()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const schema = useMemo(() => {
    return createFormSchema(wallets, t)
  }, [wallets, t])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode,
    resolver: yupResolver(schema),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn('flex flex-col gap-4', className)} noValidate>
      <div className="space-y-2">
        <Field data-invalid={errors.walletName !== undefined}>
          <FieldLabel htmlFor="create-wallet-name">{t('create_wallet.label_wallet_name')}</FieldLabel>
          <Input
            id="create-wallet-name"
            {...register('walletName', {
              required: true,
              disabled,
            })}
            placeholder={t('create_wallet.placeholder_wallet_name')}
            autoComplete="off"
          />
        </Field>
        {errors.walletName?.message && <div className="text-destructive text-xs">{errors.walletName.message}</div>}
      </div>

      <div className="space-y-2">
        <Field data-invalid={errors.password !== undefined}>
          <FieldLabel htmlFor="create-password">{t('create_wallet.label_password')}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="create-password"
              {...register('password', {
                required: true,
                disabled,
              })}
              type={showPassword ? 'text' : 'password'}
              placeholder={t('create_wallet.placeholder_password')}
              autoComplete="off"
            />
            <InputGroupAddon align="inline-start">
              <LockIcon />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <Button
                tabIndex={-1}
                type="button"
                variant="link"
                size="icon"
                onClick={() => setShowPassword((val) => !val)}
              >
                {showPassword ? <EyeIcon /> : <EyeOffIcon />}
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </Field>
        {errors.password && (
          <div className="text-destructive text-xs">{t('create_wallet.feedback_invalid_password')}</div>
        )}
      </div>

      <div className="space-y-2">
        <Field data-invalid={errors.confirmPassword !== undefined}>
          <FieldLabel htmlFor="create-confirm-password">{t('create_wallet.label_password_confirm')}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="create-confirm-password"
              {...register('confirmPassword', {
                required: true,
                disabled,
              })}
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder={t('create_wallet.placeholder_password_confirm')}
              autoComplete="off"
            />
            <InputGroupAddon align="inline-start">
              <LockIcon />
            </InputGroupAddon>
            <InputGroupAddon align="inline-end">
              <Button
                tabIndex={-1}
                type="button"
                variant="link"
                size="icon"
                onClick={() => setShowConfirmPassword((val) => !val)}
              >
                {showConfirmPassword ? <EyeIcon /> : <EyeOffIcon />}
              </Button>
            </InputGroupAddon>
          </InputGroup>
        </Field>
        {errors.confirmPassword && (
          <div className="text-destructive text-xs">{t('create_wallet.feedback_invalid_password_confirm')}</div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={disabled || isSubmitting} size="xxl">
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
