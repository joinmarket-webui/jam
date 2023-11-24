import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useField, useFormikContext } from 'formik'
import { useSettings } from '../../context/SettingsContext'
import * as rb from 'react-bootstrap'
import classNames from 'classnames'
import styles from './CollaboratorsSelector.module.css'
import { isValidNumCollaborators } from './helpers'

type CollaboratorsSelectorProps = {
  name: string
  minNumCollaborators: number
  maxNumCollaborators: number
  disabled?: boolean
}
const CollaboratorsSelector = ({
  name,
  minNumCollaborators,
  maxNumCollaborators,
  disabled = false,
}: CollaboratorsSelectorProps) => {
  const { t } = useTranslation()
  const settings = useSettings()

  const [field] = useField<number>(name)
  const form = useFormikContext<any>()

  const [usesCustomNumCollaborators, setUsesCustomNumCollaborators] = useState(false)

  const defaultCollaboratorsSelection = useMemo(() => {
    const start = Math.max(minNumCollaborators, 8)
    return [start, start + 1, start + 2]
  }, [minNumCollaborators])

  const validateAndSetCustomNumCollaborators = (candidate: string) => {
    const parsed = parseInt(candidate, 10)
    if (isValidNumCollaborators(parsed, minNumCollaborators)) {
      form.setFieldValue(field.name, parsed, true)
    } else {
      form.setFieldValue(field.name, undefined, true)
    }
  }

  return (
    <rb.Form.Group className={styles.collaboratorsSelector}>
      <rb.Form.Label className="mb-0">
        {t('send.label_num_collaborators', { numCollaborators: field.value })}
      </rb.Form.Label>
      <div className="mb-2">
        <rb.Form.Text className="text-secondary">{t('send.description_num_collaborators')}</rb.Form.Text>
      </div>
      <div className="d-flex flex-row flex-wrap gap-2">
        {defaultCollaboratorsSelection.map((number) => {
          const isSelected = !usesCustomNumCollaborators && field.value === number
          return (
            <rb.Button
              key={number}
              variant={settings.theme === 'light' ? 'white' : 'dark'}
              className={classNames(styles.collaboratorsSelectorElement, 'border', 'border-1', {
                [styles.selected]: isSelected,
              })}
              onClick={() => {
                setUsesCustomNumCollaborators(false)
                validateAndSetCustomNumCollaborators(String(number))
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
          max={maxNumCollaborators}
          isInvalid={usesCustomNumCollaborators && !isValidNumCollaborators(field.value, minNumCollaborators)}
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
        <rb.Form.Control.Feedback type="invalid">{form.errors[field.name]}</rb.Form.Control.Feedback>
      </div>
    </rb.Form.Group>
  )
}

export default CollaboratorsSelector
