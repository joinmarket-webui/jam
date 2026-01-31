import { useMemo, useState } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import type { TFunction } from 'i18next'
import { EyeIcon, EyeOffIcon, LockIcon } from 'lucide-react'
import { useForm, useWatch, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as yup from 'yup'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { cn, shortenStringMiddle, walletDisplayName } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { Field, FieldLabel } from '../ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group'

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

interface LoginFormValues {
  walletFileName: WalletFileName
  password: string
}

const loginFormSchema = (wallets: WalletFileName[], _t: TFunction) => {
  return yup
    .object({
      walletFileName: yup.string<WalletFileName>().oneOf(wallets).required(),
      password: yup.string().required(),
    })
    .required()
}

type LoginFormComponentProps = {
  className?: string
  wallets: WalletFileName[]
  activeWallet?: WalletFileName
  preselectedWallet?: WalletFileName
  makerRunning: boolean
  coinjoinInProgress: boolean
  disabled: boolean
  onSubmit: SubmitHandler<LoginFormValues>
}

export const LoginFormComponent = ({
  className,
  wallets,
  activeWallet,
  preselectedWallet = activeWallet,
  makerRunning,
  coinjoinInProgress,
  onSubmit,
  disabled,
}: LoginFormComponentProps) => {
  const { t } = useTranslation()

  const [showPassword, setShowPassword] = useState(false)

  const schema = useMemo(() => {
    return loginFormSchema(wallets, t)
  }, [wallets, t])

  const {
    control,
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm({
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    defaultValues: {
      walletFileName: preselectedWallet ?? (wallets.length === 1 ? wallets[0] : undefined),
    },
    resolver: yupResolver(schema),
  })

  const values = useWatch({ control })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn('flex flex-col gap-4', className)} noValidate>
      <div className="space-y-2">
        <Field data-invalid={errors.walletFileName !== undefined}>
          <FieldLabel>{/* TODO: i18n */}Wallet</FieldLabel>
          <Select
            onValueChange={(val: WalletFileName) => setValue('walletFileName', val, { shouldValidate: true })}
            value={values.walletFileName ?? ''}
            {...register('walletFileName', {
              required: true,
              disabled: disabled || wallets.length === 0,
            })}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={/* TODO: i18n */ wallets.length > 0 ? 'Select a wallet' : 'No wallets found.'}
              />
            </SelectTrigger>
            <SelectContent>
              {wallets?.map((wallet, index) => (
                <SelectItem key={index} value={wallet} className="text-base">
                  {shortenStringMiddle(walletDisplayName(wallet), 32)}
                  {activeWallet === wallet ? (
                    <span
                      className={cn('py-1 text-xs', {
                        'text-muted-foreground/50': !(makerRunning || coinjoinInProgress),
                        'light:text-green-600 animate-pulse text-green-300/90': makerRunning || coinjoinInProgress,
                      })}
                    >
                      {t('wallets.wallet_preview.wallet_active')}
                    </span>
                  ) : undefined}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="space-y-2">
        <Field data-invalid={errors.password !== undefined}>
          <FieldLabel htmlFor="login-password">{t(/* TODO: i18n */ 'Password')}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="login-password"
              {...register('password', {
                required: true,
                disabled,
              })}
              type={showPassword ? 'text' : 'password'}
              placeholder={t('wallets.wallet_preview.placeholder_password')}
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
      </div>

      <Button type="submit" className="w-full" disabled={disabled || isSubmitting} size="lg">
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
