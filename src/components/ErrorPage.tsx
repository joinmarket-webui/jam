import { Trans, useTranslation } from 'react-i18next'
import * as rb from 'react-bootstrap'
import { useRouteError } from 'react-router-dom'
import PageTitle from './PageTitle'
import { t } from 'i18next'
import { useEffect } from 'react'

export function ErrorThrowingComponent() {
  useEffect(() => {
    throw new Error('This error is thrown on purpose. Only to be used for testing.')
  }, [])
  return <></>
}

interface ErrorViewProps {
  title: string
  subtitle: string
  reason: string
  stacktrace?: string
}

function ErrorView({ title, subtitle, reason, stacktrace }: ErrorViewProps) {
  return (
    <div>
      <PageTitle title={title} subtitle={subtitle} />

      <p>
        <Trans i18nKey="error_page.report_bug">
          Please,{' '}
          <a
            href="https://github.com/joinmarket-webui/jam/issues/new?labels=bug&template=bug_report.md"
            target="_blank"
            rel="noopener noreferrer"
          >
            open an issue on GitHub
          </a>{' '}
          for this to be reviewed and for the error to be resolved in an upcoming version.
        </Trans>
      </p>

      <div className="my-4">
        <h6>{t('error_page.heading_reason')}</h6>
        <rb.Alert variant="danger">{reason}</rb.Alert>
      </div>

      {stacktrace && (
        <div className="my-4">
          <h6>{t('error_page.heading_stacktrace')}</h6>
          <pre className="border p-2">
            <code>{stacktrace}</code>
          </pre>
        </div>
      )}
    </div>
  )
}

function UnknownError({ error }: { error: any }) {
  const { t } = useTranslation()

  return (
    <ErrorView
      title={t('error_page.unknown_error.title')}
      subtitle={t('error_page.unknown_error.subtitle')}
      reason={error.message || t('global.errors.reason_unknown')}
      stacktrace={error.stack}
    />
  )
}

function ErrorWithDetails({ error }: { error: Error }) {
  const { t } = useTranslation()

  return (
    <ErrorView
      title={t('error_page.error_with_details.title')}
      subtitle={t('error_page.error_with_details.subtitle')}
      reason={error.message || t('global.errors.reason_unknown')}
      stacktrace={error.stack}
    />
  )
}

export default function ErrorPage() {
  const error = useRouteError()

  if (error instanceof Error) {
    return <ErrorWithDetails error={error} />
  } else {
    return <UnknownError error={error} />
  }
}
