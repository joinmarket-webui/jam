import { useState } from 'react'
import { directsendMutation, freezeMutation } from '@joinmarket-webui/joinmarket-ng-api-ts/@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useApiClient } from '@/hooks/useApiClient'
import { getErrorReason } from '@/lib/errorReason'

/**
 * The freeze/unfreeze/direct-send mutations shared by all fidelity bond flows,
 * reporting failures through a common error state. The unfreeze/send error
 * messages differ per flow (create/renew/move) and are passed as i18n keys.
 */
export function useFidelityBondMutations({
  unfreezeErrorKey,
  sendErrorKey,
}: {
  unfreezeErrorKey: string
  sendErrorKey: string
}) {
  const { t } = useTranslation()
  const client = useApiClient()
  const [error, setError] = useState<string | undefined>()

  const setErrorWithReason = (error: unknown, message: string) =>
    setError(`${message} ${getErrorReason(error, t('global.errors.reason_unknown'))}`)

  const freezeUtxo = useMutation({
    ...freezeMutation({ client }),
    retry: false,
    onError: (error) => setErrorWithReason(error, t('global.errors.error_freezing_utxos')),
  })

  const unfreezeUtxo = useMutation({
    ...freezeMutation({ client }),
    retry: false,
    onError: (error) => setErrorWithReason(error, t(unfreezeErrorKey)),
  })

  const directSend = useMutation({
    ...directsendMutation({ client }),
    retry: false,
    onError: (error) => setErrorWithReason(error, t(sendErrorKey)),
  })

  return { freezeUtxo, unfreezeUtxo, directSend, error, setError }
}
