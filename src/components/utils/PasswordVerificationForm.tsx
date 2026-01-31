import { useState, useMemo } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import type { TFunction } from 'i18next'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import * as yup from 'yup'
import { Button } from '@/components/ui/button'
import { hashPassword } from '@/lib/hash'
import { cn, debounce, type WalletFileName } from '@/lib/utils'
import { Field, FieldLabel } from '../ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '../ui/input-group'
import { Spinner } from '../ui/spinner'

type PasswordVerificationFormValues = {
  password: string
}

const debouncedHashPassword = debounce(hashPassword, 210)

const passwordVerificationFormSchema = (walletFileName: WalletFileName, hashedPassword: string, t: TFunction) => {
  return yup
    .object({
      password: yup
        .string()
        .required()
        .test('verify-password-test', async (value) => {
          try {
            const hashed = await debouncedHashPassword(value, walletFileName)
            if (hashedPassword !== hashed) {
              const errorMessage = t(/*TODO: i18n*/ 'Incorrect password. Please try again.')
              return new yup.ValidationError(errorMessage, undefined, 'password', undefined, true)
            }
            return true
          } catch (error) {
            const reason = (error instanceof Error ? error.message : undefined) || t('global.errors.reason_unknown')
            const errorMessage = t(/*TODO: i18n*/ 'Error while verifying given password. {{ reason }}', { reason })
            throw new yup.ValidationError(errorMessage, undefined, 'password', undefined, true)
          }
        }),
    })
    .required()
}

type PasswordVerificationFormProps = {
  walletFileName: WalletFileName
  hashedPassword: string
  onSubmit: SubmitHandler<PasswordVerificationFormValues>
  onCancel?: () => void | Promise<void>
  className?: string
  disabled?: boolean
}

export const PasswordVerificationForm = ({
  walletFileName,
  onSubmit,
  hashedPassword,
  disabled,
  className,
  onCancel,
}: PasswordVerificationFormProps) => {
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)

  const schema = useMemo(() => {
    return passwordVerificationFormSchema(walletFileName, hashedPassword, t)
  }, [walletFileName, hashedPassword, t])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    // force type (see https://github.com/react-hook-form/resolvers/issues/807)
    resolver: yupResolver(schema),
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className={cn('flex flex-col gap-4', className)} noValidate>
      <div className="space-y-2">
        <Field data-invalid={errors.password !== undefined}>
          <FieldLabel htmlFor="password-verification-input-password">{t(/* TODO: i18n */ 'Password')}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="password-verification-input-password"
              {...register('password', {
                required: true,
                disabled,
              })}
              type={showPassword ? 'text' : 'password'}
              autoComplete="off"
              placeholder={t(/* TODO: i18n */ 'Enter your password')}
            />
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

      <Field orientation="horizontal" className="justify-end">
        {onCancel !== undefined && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t('global.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner className="motion-reduce:hidden" />
              {t(/* TODO: i18n */ 'Verifying...')}
            </>
          ) : (
            t(/* TODO: i18n */ 'Verify')
          )}
        </Button>
      </Field>
    </form>
  )
}
