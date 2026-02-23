import { useMemo, useState } from 'react'
import { yupResolver } from '@hookform/resolvers/yup'
import { listwalletsOptions, recoverwalletMutation } from '@joinmarket-webui/joinmarket-api-ts/@tanstack/react-query'
import { session } from '@joinmarket-webui/joinmarket-api-ts/jm'
import { validateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { AlertCircleIcon, EyeIcon, EyeOffIcon, InfoIcon, WalletIcon } from 'lucide-react'
import { useForm, useWatch, type SubmitHandler } from 'react-hook-form'
import { Trans, useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import * as yup from 'yup'
import { useStore } from 'zustand'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { WalletLoadErrorAlert } from '@/components/ui/jam/WalletLoadErrorAlert'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { isDebugFeatureEnabled } from '@/constants/debugFeatures'
import { MAX_WALLET_NAME_LENGTH } from '@/constants/jam'
import { JM_DEFAULT_WALLET_TYPE, JM_WALLET_FILE_EXTENSION } from '@/constants/jm'
import { routes } from '@/constants/routes'
import { useApiClient } from '@/hooks/useApiClient'
import { getErrorReason } from '@/lib/errorReason'
import { hashPassword } from '@/lib/hash'
import { withQueryDelay } from '@/lib/queryClient'
import { DUMMY_SEED_PHRASE, walletDisplayName, walletDisplayNameToFileName } from '@/lib/utils'
import type { WalletFileName } from '@/lib/utils'
import { authStore } from '@/store/authStore'
import { AuthPageShell } from '../layout/AuthPageShell'

const VALID_SEED_WORD_COUNTS = new Set([12, 15, 18, 21, 24])
const SEED_WORD_COUNT_HINT = '12 / 15 / 18 / 21 / 24'
const SEED_WORD_PATTERN = /^[a-z]+$/

interface ImportWalletFormValues {
  walletName: string
  password: string
  confirmPassword: string
  seedPhrase: string
}

const normalizeSeedPhrase = (value?: string) =>
  (value ?? '')
    .toLowerCase()
    .split(/[\s,]+/)
    .map((word) => word.trim())
    .map((word) => word.replace(/^\d+\.$/, ''))
    .map((word) => word.replaceAll(/^[^a-z]+|[^a-z]+$/g, ''))
    .filter(Boolean)
    .join(' ')

const getSeedPhraseWords = (value: string) => normalizeSeedPhrase(value).split(' ').filter(Boolean)

const isValidSeedPhrase = (value: string) => {
  const normalized = normalizeSeedPhrase(value)
  const words = getSeedPhraseWords(normalized)
  if (words.length === 0) return false

  if (!VALID_SEED_WORD_COUNTS.has(words.length)) return false
  if (!words.every((word) => SEED_WORD_PATTERN.test(word))) return false

  return validateMnemonic(normalized, wordlist)
}

const importWalletSchema = (wallets: WalletFileName[], t: (key: string) => string) =>
  yup
    .object({
      walletName: yup
        .string()
        .trim()
        .max(MAX_WALLET_NAME_LENGTH)
        .required(t('create_wallet.feedback_invalid_wallet_name'))
        .test('valid-wallet-name-format', t('create_wallet.feedback_invalid_wallet_name'), (value) =>
          /^[\w-]+$/.test(value || ''),
        )
        .test('wallet-name-unique', t('create_wallet.feedback_wallet_name_already_exists'), (value) => {
          if (!value) return false
          return !wallets.includes((value + JM_WALLET_FILE_EXTENSION) as WalletFileName)
        }),
      password: yup.string().min(1).required(t('create_wallet.feedback_invalid_password')),
      confirmPassword: yup
        .string()
        .required(t('create_wallet.feedback_invalid_password_confirm'))
        .oneOf([yup.ref('password')], t('create_wallet.feedback_invalid_password_confirm')),
      seedPhrase: yup
        .string()
        .required(t('import_wallet.import_details.feedback_invalid_menmonic_phrase'))
        .test('seed-phrase-format', t('import_wallet.import_details.feedback_invalid_menmonic_phrase'), (value) =>
          isValidSeedPhrase(value || ''),
        ),
    })
    .required()

const ImportWalletPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const client = useApiClient()
  const updateAuthState = useStore(authStore, (state) => state.update)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const listWalletsQueryOptions = listwalletsOptions({ client })

  const {
    data: walletsData,
    error: walletsError,
    isLoading: walletsLoading,
    isFetching: walletsFetching,
    refetch: walletsRefetch,
  } = useQuery({
    ...listWalletsQueryOptions,
    queryFn: withQueryDelay(listWalletsQueryOptions.queryFn, { delayAfter: 210 }),
    retry: false,
  })

  const { data: sessionInfo, isLoading: sessionLoading } = useQuery({
    queryKey: ['import-wallet-session'],
    queryFn: async () => {
      const { data } = await session({ client })
      return data
    },
    retry: false,
    refetchOnWindowFocus: false,
  })

  const hasActiveWalletSession = sessionInfo?.session === true

  const wallets = useMemo(() => (walletsData?.wallets ?? []) as WalletFileName[], [walletsData?.wallets])
  const schema = useMemo(() => importWalletSchema(wallets, t), [wallets, t])

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting, isValid },
  } = useForm<ImportWalletFormValues>({
    mode: 'onChange',
    resolver: yupResolver(schema),
  })
  const seedPhraseField = register('seedPhrase', {
    required: true,
  })
  const watchedSeedPhrase = useWatch({
    control,
    name: 'seedPhrase',
    defaultValue: '',
  })
  const seedWordCount = useMemo(() => getSeedPhraseWords(watchedSeedPhrase).length, [watchedSeedPhrase])
  const hasSupportedSeedWordCount = VALID_SEED_WORD_COUNTS.has(seedWordCount)
  const showDummyMnemonicHelper = isDebugFeatureEnabled('importDummyMnemonicPhrase')

  const recoverWallet = useMutation({
    ...recoverwalletMutation({ client }),
    retry: false,
  })

  const onSubmit: SubmitHandler<ImportWalletFormValues> = async (values) => {
    if (hasActiveWalletSession) return

    try {
      const walletFileName = walletDisplayNameToFileName(values.walletName)
      const response = await recoverWallet.mutateAsync({
        body: {
          walletname: walletFileName,
          password: values.password,
          wallettype: JM_DEFAULT_WALLET_TYPE,
          seedphrase: normalizeSeedPhrase(values.seedPhrase),
        },
      })

      let hashedPassword: string | undefined
      try {
        hashedPassword = await hashPassword(values.password, response.walletname as WalletFileName)
      } catch (hashError) {
        console.warn('Failed to hash password after wallet recovery:', hashError)
      }

      updateAuthState({
        walletFileName: response.walletname as WalletFileName,
        auth: { token: response.token, refresh_token: response.refresh_token },
        hashed_password: hashedPassword,
      })

      toast.success(t('import_wallet.success.title'))
      await navigate(routes.home)
    } catch (error: unknown) {
      const reason = getErrorReason(error, t('global.errors.reason_unknown'))
      toast.error(t('import_wallet.error_importing_failed', { reason }))
    }
  }

  const formDisabled = isSubmitting || recoverWallet.isPending || hasActiveWalletSession
  const submitDisabled = formDisabled || walletsFetching || walletsLoading || sessionLoading || !isValid

  return (
    <AuthPageShell>
      <Card className="w-full max-w-xl">
        <CardHeader className="flex flex-col items-center space-y-2">
          <div className="bg-primary/10 mb-4 flex h-12 w-12 items-center justify-center rounded-full">
            <WalletIcon className="text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">{t('import_wallet.wallet_details.title')}</CardTitle>
          <CardDescription>{t('import_wallet.import_details.subtitle')}</CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {walletsError && <WalletLoadErrorAlert reason={walletsError.message} />}

          {hasActiveWalletSession ? (
            <Alert variant="warning">
              <AlertCircleIcon />
              <AlertDescription>
                <p>
                  <Trans
                    i18nKey="import_wallet.alert_other_wallet_unlocked"
                    values={{
                      walletName: walletDisplayName((sessionInfo?.wallet_name || 'Unknown') as WalletFileName),
                    }}
                  >
                    Currently <strong>walletName</strong> is active. You need to lock it first.
                    <Link to={routes.login} className="font-semibold underline">
                      Go back
                    </Link>
                  </Trans>
                </p>
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="flex flex-col gap-4" noValidate>
              <Alert>
                <InfoIcon />
                <AlertDescription>{t('import_wallet.text_recovery_time_warning')}</AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Field data-invalid={errors.walletName !== undefined}>
                  <FieldLabel htmlFor="import-wallet-name">{t('create_wallet.label_wallet_name')}</FieldLabel>
                  <Input
                    id="import-wallet-name"
                    {...register('walletName', {
                      required: true,
                    })}
                    disabled={formDisabled}
                    placeholder={t('create_wallet.placeholder_wallet_name')}
                    autoComplete="off"
                  />
                </Field>
                {errors.walletName?.message && (
                  <div className="text-destructive text-xs">{errors.walletName.message}</div>
                )}
              </div>

              <div className="space-y-2">
                <Field data-invalid={errors.seedPhrase !== undefined}>
                  <FieldLabel htmlFor="import-wallet-seed">{t('import_wallet.import_details.title')}</FieldLabel>
                  <Textarea
                    id="import-wallet-seed"
                    rows={4}
                    {...seedPhraseField}
                    disabled={formDisabled}
                    placeholder={t('import_wallet.import_details.feedback_invalid_menmonic_phrase')}
                    autoComplete="off"
                    onBlur={(event) => {
                      void seedPhraseField.onBlur(event)
                      const normalized = normalizeSeedPhrase(event.target.value)
                      if (normalized !== event.target.value) {
                        setValue('seedPhrase', normalized, {
                          shouldDirty: true,
                          shouldValidate: true,
                        })
                      }
                    }}
                  />
                </Field>
                <div className="text-muted-foreground flex justify-between text-xs">
                  <span>{seedWordCount} words</span>
                  <span>Expected {SEED_WORD_COUNT_HINT} words</span>
                </div>
                {seedWordCount > 0 && !hasSupportedSeedWordCount && (
                  <div className="text-warning text-xs">Mnemonic phrase must contain {SEED_WORD_COUNT_HINT} words.</div>
                )}
                {showDummyMnemonicHelper && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={formDisabled}
                    onClick={() => {
                      setValue('seedPhrase', DUMMY_SEED_PHRASE.join(' '), {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }}
                  >
                    Use dummy mnemonic
                  </Button>
                )}
                {errors.seedPhrase?.message && (
                  <div className="text-destructive text-xs">{errors.seedPhrase.message}</div>
                )}
              </div>

              <div className="space-y-2">
                <Field data-invalid={errors.password !== undefined}>
                  <FieldLabel htmlFor="import-wallet-password">{t('create_wallet.label_password')}</FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="import-wallet-password"
                      {...register('password', {
                        required: true,
                      })}
                      disabled={formDisabled}
                      type={showPassword ? 'text' : 'password'}
                      placeholder={t('create_wallet.placeholder_password')}
                      autoComplete="off"
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

              <div className="space-y-2">
                <Field data-invalid={errors.confirmPassword !== undefined}>
                  <FieldLabel htmlFor="import-wallet-password-confirm">
                    {t('create_wallet.label_password_confirm')}
                  </FieldLabel>
                  <InputGroup>
                    <InputGroupInput
                      id="import-wallet-password-confirm"
                      {...register('confirmPassword', {
                        required: true,
                      })}
                      disabled={formDisabled}
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder={t('create_wallet.placeholder_password_confirm')}
                      autoComplete="off"
                    />
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
                  <div className="text-destructive text-xs">{errors.confirmPassword.message}</div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={submitDisabled} size="xxl">
                {recoverWallet.isPending ? (
                  <>
                    <Spinner className="motion-reduce:hidden" />
                    {t('import_wallet.confirmation.text_button_submitting')}
                  </>
                ) : (
                  <>{t('import_wallet.confirmation.text_button_submit')}</>
                )}
              </Button>
            </form>
          )}

          <div className="flex justify-center">
            <Button variant="link" onClick={() => void navigate(routes.login)}>
              {t('global.back')}
            </Button>
            {walletsError && (
              <Button variant="link" onClick={() => void walletsRefetch()}>
                {t('global.retry')}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </AuthPageShell>
  )
}

export default ImportWalletPage
