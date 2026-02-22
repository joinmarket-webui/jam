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

type PasswordVerificationI18nKeyPrefix = 'settings.seed_modal.verification' | 'settings.xpubs_modal.verification'

const passwordVerificationFormSchema = (
  walletFileName: WalletFileName,
  hashedPassword: string,
  t: TFunction,
  i18nKeyPrefix: PasswordVerificationI18nKeyPrefix,
) => {
  return yup
    .object({
      password: yup
        .string()
        .required()
        .test('verify-password-test', async (value) => {
          try {
            const hashed = await debouncedHashPassword(value, walletFileName)
            if (hashedPassword !== hashed) {
              const errorMessage = t(`${i18nKeyPrefix}.text_error_password_incorrect`)
              return new yup.ValidationError(errorMessage, undefined, 'password', undefined, true)
            }
            return true
          } catch (error: unknown) {
            const reason = (error instanceof Error ? error.message : undefined) || t('global.errors.reason_unknown')
            const errorMessage = t(`${i18nKeyPrefix}.text_error`, { reason })
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
  i18nKeyPrefix: PasswordVerificationI18nKeyPrefix
}

export const PasswordVerificationForm = ({
  walletFileName,
  onSubmit,
  hashedPassword,
  disabled,
  className,
  onCancel,
  i18nKeyPrefix,
}: PasswordVerificationFormProps) => {
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)

  const schema = useMemo(() => {
    return passwordVerificationFormSchema(walletFileName, hashedPassword, t, i18nKeyPrefix)
  }, [walletFileName, hashedPassword, t, i18nKeyPrefix])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: 'onSubmit',
    reValidateMode: 'onSubmit',
    resolver: yupResolver(schema),
  })

  const doOnSubmit = handleSubmit(onSubmit)

  return (
    <form onSubmit={(event) => void doOnSubmit(event)} className={cn('flex flex-col gap-4', className)} noValidate>
      <div className="space-y-2">
        <Field data-invalid={errors.password !== undefined}>
          <FieldLabel htmlFor="password-verification-input-password">{t(`${i18nKeyPrefix}.label_password`)}</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="password-verification-input-password"
              {...register('password', {
                required: true,
                disabled,
              })}
              type={showPassword ? 'text' : 'password'}
              autoComplete="off"
              placeholder={t(`${i18nKeyPrefix}.placeholder_password`)}
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
          <Button type="button" variant="outline" onClick={() => void onCancel()}>
            {t('global.cancel')}
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Spinner className="motion-reduce:hidden" />
              {t(`${i18nKeyPrefix}.text_button_submitting`)}
            </>
          ) : (
            t(`${i18nKeyPrefix}.text_button_submit`)
          )}
        </Button>
      </Field>
    </form>
  )
}
