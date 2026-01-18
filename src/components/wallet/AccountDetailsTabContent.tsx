import type { TFunction } from 'i18next'
import { useTranslation } from 'react-i18next'
import { type AccountMeta } from '@/context/JamWalletInfoContext'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion'

const HIDE_EMPTY_BRANCHES = false

const toTypeHeading = (type: string, t: TFunction) => {
  if (type === 'external addresses') {
    return t('current_wallet.account_heading_external_addresses')
  } else if (type === 'internal addresses') {
    return t('current_wallet.account_heading_internal_addresses')
  }
  return type
}

interface AccountDetailsTabContentProps {
  value: AccountMeta
}

export const AccountDetailsTabContent = ({ value }: AccountDetailsTabContentProps) => {
  const { t } = useTranslation()

  const displayBranches = (value.branches || [])
    .map((it, index) => ({
      branch: it,
      index,
    }))
    .filter(({ branch }) =>
      !HIDE_EMPTY_BRANCHES ? true : branch.__raw.entries !== undefined && branch.__raw.entries.length > 0,
    )

  const defaultValue = displayBranches.length > 0 ? String(displayBranches[0].index) : undefined

  return (
    <div className="bg-muted rounded-lg p-4">
      <Accordion type="single" collapsible className="bg-background w-full rounded-lg" defaultValue={defaultValue}>
        {displayBranches.map(({ branch, index }) => {
          const typeTitle = toTypeHeading(branch.type, t)
          return (
            <AccordionItem key={index} value={String(index)} className="px-6">
              <AccordionTrigger className="group/account-branch-accordion-trigger items-center no-underline!">
                <div className="flex flex-col gap-0.25">
                  <span className="text-base font-medium group-hover/account-branch-accordion-trigger:underline">
                    {typeTitle}
                  </span>
                  <code className="text-muted-foreground text-xs">({branch.derivation})</code>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="overflow-scroll">
                      <code className="light:text-red-700 text-red-800">branch:</code>
                      <pre className="text-xs">{JSON.stringify(branch, null, 2)}</pre>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}
