import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { HandshakeIcon, KeyRoundIcon, ShieldCheckIcon, UsersIcon, WalletIcon } from 'lucide-react'
import { Trans, useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { JAM_DOCS_URL, JAM_JMNG_REPO_URL, JAM_REPO_URL } from '@/constants/jam'
import { cn } from '@/lib/utils'
import { Alert, AlertDescription, AlertTitle } from '../ui/alert'

type OnboardingStep = {
  titleKey: string
  descriptionKey: string
  icon: LucideIcon
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    titleKey: 'onboarding.screen_1_title',
    descriptionKey: 'onboarding.screen_1_description',
    icon: WalletIcon,
  },
  {
    titleKey: 'onboarding.screen_2_title',
    descriptionKey: 'onboarding.screen_2_description',
    icon: UsersIcon,
  },
  {
    titleKey: 'onboarding.screen_3_title',
    descriptionKey: 'onboarding.screen_3_description',
    icon: KeyRoundIcon,
  },
  {
    titleKey: 'onboarding.screen_4_title',
    descriptionKey: 'onboarding.screen_4_description',
    icon: HandshakeIcon,
  },
  {
    titleKey: 'onboarding.screen_5_title',
    descriptionKey: 'onboarding.screen_5_description',
    icon: ShieldCheckIcon,
  },
]

interface OnboardingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const OnboardingDialog = ({ open, onOpenChange }: OnboardingDialogProps) => {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)

  const isSplashStep = step === 0
  const isLastStep = step === ONBOARDING_STEPS.length

  const closeDialog = () => {
    setStep(0)
    onOpenChange(false)
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setStep(0)
    }
    onOpenChange(nextOpen)
  }

  const onNext = () => {
    if (isSplashStep) {
      setStep(1)
      return
    }

    if (isLastStep) {
      closeDialog()
      return
    }

    setStep((currentStep) => Math.min(currentStep + 1, ONBOARDING_STEPS.length))
  }

  const onBack = () => setStep((currentStep) => Math.max(0, currentStep - 1))

  const activeStep = ONBOARDING_STEPS[Math.max(0, step - 1)]
  const ActiveIcon = activeStep?.icon ?? WalletIcon

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        {isSplashStep ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">{t('onboarding.splashscreen_title')}</DialogTitle>
              <DialogDescription>{t('onboarding.splashscreen_subtitle')}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="motion-safe:animate-in fade-in bg-muted/40 flex items-center gap-4 rounded-lg border p-4 transition-all duration-500 hover:-translate-[2px] hover:ring-2">
                <KeyRoundIcon />
                <p className="text-lg leading-relaxed font-semibold">
                  {t('onboarding.splashscreen_description_line1')}
                </p>
              </div>
              <div className="motion-safe:animate-in fade-in bg-muted/40 flex items-center gap-4 rounded-lg border p-4 transition-all duration-500 hover:-translate-[2px] hover:ring-2">
                <HandshakeIcon />
                <p className="text-lg leading-relaxed font-semibold">
                  {t('onboarding.splashscreen_description_line2')}
                </p>
              </div>
              <div className="motion-safe:animate-in fade-in bg-muted/40 flex items-center gap-4 rounded-lg border p-4 transition-all duration-500 hover:-translate-[2px] hover:ring-2">
                <ShieldCheckIcon />
                <p className="text-lg leading-relaxed font-semibold">
                  {t('onboarding.splashscreen_description_line3')}
                </p>
              </div>

              <Alert variant="warning">
                <AlertTitle>{t('onboarding.splashscreen_warning_title')}</AlertTitle>
                <AlertDescription className="text-xs">
                  <Trans
                    i18nKey="onboarding.splashscreen_warning_text_ng"
                    components={{
                      '1': (
                        <a
                          href={`${JAM_REPO_URL}/issues`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold underline underline-offset-4"
                        />
                      ),
                      '2': (
                        <a
                          href={JAM_DOCS_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold underline underline-offset-4"
                        />
                      ),
                      '3': (
                        <a
                          href={JAM_JMNG_REPO_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-semibold underline underline-offset-4"
                        />
                      ),
                    }}
                  />
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter className="sm:justify-between">
              <Button variant="ghost" onClick={closeDialog}>
                {t('onboarding.splashscreen_button_skip_intro')}
              </Button>
              <Button onClick={onNext}>{t('onboarding.splashscreen_button_get_started')}</Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader className="space-y-4 pr-10 text-left">
              <DialogTitle className="sr-only">
                {activeStep?.titleKey ? t(activeStep.titleKey) : t('onboarding.splashscreen_title')}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {activeStep?.descriptionKey ? t(activeStep.descriptionKey) : t('onboarding.splashscreen_subtitle')}
              </DialogDescription>
              <div className="flex items-center gap-1.5">
                {ONBOARDING_STEPS.map((_, index) => (
                  <span
                    key={`progress-dot-${index}`}
                    className={cn(
                      'h-1.5 w-full rounded-full transition-colors',
                      index === step - 1 ? 'bg-primary' : 'bg-muted',
                    )}
                  />
                ))}
              </div>
            </DialogHeader>

            <div className="space-y-5">
              <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-full">
                <ActiveIcon className="size-7" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-semibold">{activeStep?.titleKey ? t(activeStep.titleKey) : undefined}</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {activeStep?.descriptionKey ? t(activeStep.descriptionKey) : undefined}
                </p>
              </div>
            </div>

            <DialogFooter className="sm:justify-between">
              <Button variant="ghost" onClick={onBack}>
                {t('global.back')}
              </Button>
              <Button onClick={onNext}>
                {isLastStep ? t('onboarding.button_complete') : t('onboarding.button_next')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
