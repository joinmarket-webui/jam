import { t } from 'i18next'
import { Trans, useTranslation } from 'react-i18next'
import { useRouteError } from 'react-router-dom'
import { Alert, AlertDescription } from '@/components/ui/alert'
import PageTitle from '@/components/ui/jam/PageTitle'

interface ErrorViewProps {
  title: string
  subtitle: string
  reason: string
  stacktrace?: string
}

function ErrorView({ title, subtitle, reason, stacktrace }: ErrorViewProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-3 p-4">
      <PageTitle title={title} subtitle={subtitle} variant="error" />
      <p>
        <Trans i18nKey="error_page.report_bug">
          Please{' '}
          <a
            href="https://github.com/joinmarket-webui/jam/issues/new?labels=bug&template=bug_report.md"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline hover:no-underline"
          >
            open an issue on GitHub
          </a>{' '}
          for this error to be reviewed and resolved in an upcoming version.
        </Trans>
      </p>

      <div className="my-4">
        <h6 className="font-semibold">{t('error_page.heading_reason')}</h6>
        <Alert variant="destructive" className="overflow-scroll">
          <AlertDescription className="flex items-center justify-between">{reason}</AlertDescription>
        </Alert>
      </div>

      {stacktrace && (
        <div className="my-4">
          <h6 className="font-semibold">{t('error_page.heading_stacktrace')}</h6>
          <pre className="overflow-scroll rounded-lg border p-2">
            <code>{stacktrace}</code>
          </pre>
        </div>
      )}
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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
