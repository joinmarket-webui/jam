import { useMemo, useState } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import type { TFunction } from 'i18next'
import { EyeIcon, EyeOffIcon, LockIcon } from 'lucide-react'
import { useForm, type Mode, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as yup from 'yup'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { MAX_WALLET_NAME_LENGTH } from '@/constants/jam'
import { JM_WALLET_FILE_EXTENSION } from '@/constants/jm'
import { cn, type WalletFileName } from '@/lib/utils'

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
        .required(t('create_wallet.feedback_invalid_wallet_name'))
        .test('valid-wallet-name-test', t('create_wallet.feedback_invalid_wallet_name'), (value) => {
          return /^[\w-]+$/.test(value)
        })
        .test('valid-wallet-name-unique-test', t('create_wallet.feedback_wallet_name_already_exists'), (value) => {
          return !wallets.includes((value + JM_WALLET_FILE_EXTENSION) as WalletFileName)
        }),
      password: yup.string().min(1).required(t('create_wallet.feedback_invalid_password')),
      confirmPassword: yup
        .string()
        .required(t('create_wallet.feedback_invalid_password_confirm'))
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
  initialValues?: CreateFormValues
  disabled?: boolean
  mode?: Mode
  submitButtonText: ({ isSubmitting }: { isSubmitting: boolean }) => string
}

export const CreateWalletForm = ({
  className,
  wallets,
  onSubmit,
  initialValues,
  disabled,
  mode = 'onSubmit',
  submitButtonText,
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
    values: initialValues,
    resolver: yupResolver(schema),
  })

  const doOnSubmit = handleSubmit(onSubmit)

  return (
    <form onSubmit={(event) => void doOnSubmit(event)} className={cn('flex flex-col gap-4', className)} noValidate>
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
        {errors.password?.message && <div className="text-destructive text-xs">{errors.password.message}</div>}
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
        {errors.confirmPassword?.message && (
          <div className="text-destructive text-xs">{errors.confirmPassword?.message}</div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={disabled || isSubmitting} size="xxl">
        {isSubmitting && <Spinner className="motion-reduce:hidden" />}
        {submitButtonText({ isSubmitting })}
      </Button>
    </form>
  )
}
