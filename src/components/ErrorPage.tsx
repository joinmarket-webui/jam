import { useTranslation } from 'react-i18next'
import { useRouteError } from 'react-router-dom'

export default function ErrorPage() {
  const { t } = useTranslation()
  const error = useRouteError()

  return (
    <div>
      <p>Error</p>
    </div>
  )
}
