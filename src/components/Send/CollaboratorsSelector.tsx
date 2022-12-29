import { Dispatch, SetStateAction, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSettings } from '../../context/SettingsContext'
import * as rb from 'react-bootstrap'
import classNames from 'classnames'
import styles from './Send.module.css'
import { isValidNumCollaborators } from './helpers'

type CollaboratorsSelectorArgs = {
  numCollaborators: number | null
  setNumCollaborators: Dispatch<SetStateAction<number | null>>
  minNumCollaborators: number
  disabled?: boolean
}
const CollaboratorsSelector = ({
  numCollaborators,
  setNumCollaborators,
  minNumCollaborators,
  disabled = false,
}: CollaboratorsSelectorArgs) => {
  const { t } = useTranslation()
  const settings = useSettings()

  const [usesCustomNumCollaborators, setUsesCustomNumCollaborators] = useState(false)

  const defaultCollaboratorsSelection = useMemo(() => {
    const start = Math.max(minNumCollaborators, 8)
    return [start, start + 1, start + 2]
  }, [minNumCollaborators])

  const validateAndSetCustomNumCollaborators = (candidate: string) => {
    const parsed = parseInt(candidate, 10)
    if (isValidNumCollaborators(parsed, minNumCollaborators)) {
      setNumCollaborators(parsed)
    } else {
      setNumCollaborators(null)
    }
  }

  return (
    // @ts-ignore FIXME: "Property 'disabled' does not exist on type..."
    <rb.Form noValidate className={styles.collaboratorsSelector} disabled={disabled}>
      <rb.Form.Group>
        <rb.Form.Label className="mb-0">{t('send.label_num_collaborators', { numCollaborators })}</rb.Form.Label>
        <div className="mb-2">
          <rb.Form.Text className="text-secondary">{t('send.description_num_collaborators')}</rb.Form.Text>
        </div>
        <div className="d-flex flex-row flex-wrap gap-2">
          {defaultCollaboratorsSelection.map((number) => {
            const isSelected = !usesCustomNumCollaborators && numCollaborators === number
            return (
              <rb.Button
                key={number}
                variant={settings.theme === 'light' ? 'white' : 'dark'}
                className={classNames(styles.collaboratorsSelectorElement, 'border', 'border-1', {
                  [styles.selected]: isSelected,
                })}
                onClick={() => {
                  setUsesCustomNumCollaborators(false)
                  setNumCollaborators(number)
                }}
                disabled={disabled}
              >
                {number}
              </rb.Button>
            )
          })}
          <rb.Form.Control
            type="number"
            min={minNumCollaborators}
            max={99}
            isInvalid={!isValidNumCollaborators(numCollaborators, minNumCollaborators)}
            placeholder={t('send.input_num_collaborators_placeholder')}
            defaultValue=""
            className={classNames(styles.collaboratorsSelectorElement, 'border', 'border-1', {
              [styles.selected]: usesCustomNumCollaborators,
            })}
            onChange={(e) => {
              setUsesCustomNumCollaborators(true)
              validateAndSetCustomNumCollaborators(e.target.value)
            }}
            onClick={(e) => {
              // @ts-ignore - FIXME: "Property 'value' does not exist on type 'EventTarget'"
              if (e.target.value !== '') {
                setUsesCustomNumCollaborators(true)
                // @ts-ignore - FIXME: "Property 'value' does not exist on type 'EventTarget'"
                validateAndSetCustomNumCollaborators(e.target.value)
              }
            }}
            disabled={disabled}
          />
          {usesCustomNumCollaborators && (
            <rb.Form.Control.Feedback type="invalid">
              {t('send.error_invalid_num_collaborators', { minNumCollaborators, maxNumCollaborators: 99 })}
            </rb.Form.Control.Feedback>
          )}
        </div>
      </rb.Form.Group>
    </rb.Form>
  )
}

export default CollaboratorsSelector
