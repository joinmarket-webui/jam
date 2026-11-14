import { ArrowUpRightIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { JAM_REPO_URL } from '@/constants/jam'

export default function BetaInfoHeader() {
  const { t } = useTranslation()

  return (
    <header className="bg-brand-warning text-brand-warning-foreground border-brand-warning-foreground/15 w-full border-b">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-3 py-1.5 text-center text-xs leading-tight">
        <span className="border-brand-warning-foreground/25 inline-flex shrink-0 items-center rounded-full border px-1.5 py-px text-[10px] font-bold tracking-wider uppercase">
          {t('beta_info.badge_beta')}
        </span>
        <span className="font-bold">{t('beta_info.text_thanks')} </span>
        <span className="font-medium">{t('beta_info.text_report')}</span>
        <a
          href={`${JAM_REPO_URL}/issues/new?labels=bug,beta&template=bug_report.md`}
          target="_blank"
          rel="noopener noreferrer"
          className="group border-brand-warning-foreground/30 hover:bg-brand-warning-foreground/10 inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 font-semibold transition-colors"
        >
          {t('beta_info.button_report_bug')}
          <ArrowUpRightIcon className="size-3 transition-transform group-hover:translate-x-px group-hover:-translate-y-px" />
        </a>
      </div>
    </header>
  )
}
