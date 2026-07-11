import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { POST_LOGIN_TOUR_DISMISSED_STORAGE_KEY, POST_LOGIN_TOUR_EVENT } from '@/constants/onboarding'
import { clamp, cn } from '@/lib/utils'

type TourStep = {
  selector: string
  titleKey: string
  descriptionKey: string
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour-id="wallet-preview"]',
    titleKey: 'onboarding.tour.step_wallet_title',
    descriptionKey: 'onboarding.tour.step_wallet_description',
  },
  {
    selector: '[data-tour-id="wallet-actions"]',
    titleKey: 'onboarding.tour.step_actions_title',
    descriptionKey: 'onboarding.tour.step_actions_description',
  },
  {
    selector: '[data-tour-id="wallet-jars"]',
    titleKey: 'onboarding.tour.step_jars_title',
    descriptionKey: 'onboarding.tour.step_jars_description',
  },
  {
    selector: '[data-tour-id="footer-tools"]',
    titleKey: 'onboarding.tour.step_tools_title',
    descriptionKey: 'onboarding.tour.step_tools_description',
  },
  {
    selector: '[data-tour-id="settings-button"]',
    titleKey: 'onboarding.tour.step_settings_title',
    descriptionKey: 'onboarding.tour.step_settings_description',
  },
]

const getTargetRect = (selector: string): DOMRect | null => {
  const target = document.querySelector(selector)
  if (!(target instanceof HTMLElement)) return null

  const styles = window.getComputedStyle(target)
  if (styles.display === 'none' || styles.visibility === 'hidden') return null

  const rect = target.getBoundingClientRect()
  if (rect.width < 8 || rect.height < 8) return null

  return rect
}

interface PostLoginOnboardingTourProps {
  enabled?: boolean
}

export const PostLoginOnboardingTour = ({ enabled = true }: PostLoginOnboardingTourProps) => {
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return false

    try {
      return window.localStorage.getItem(POST_LOGIN_TOUR_DISMISSED_STORAGE_KEY) !== '1'
    } catch (error) {
      console.warn('Failed to read post-login onboarding preference:', error)
      return false
    }
  })
  const { t } = useTranslation()
  const [stepIndex, setStepIndex] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)

  const currentStep = TOUR_STEPS[stepIndex]
  const isLastStep = stepIndex === TOUR_STEPS.length - 1

  const closeTour = () => {
    setOpen(false)
    setStepIndex(0)
    try {
      window.localStorage.setItem(POST_LOGIN_TOUR_DISMISSED_STORAGE_KEY, '1')
    } catch (error) {
      console.warn('Failed to persist post-login onboarding preference:', error)
    }
  }

  useEffect(() => {
    const onStartTour = () => {
      setStepIndex(0)
      setOpen(true)
    }

    window.addEventListener(POST_LOGIN_TOUR_EVENT, onStartTour)
    return () => window.removeEventListener(POST_LOGIN_TOUR_EVENT, onStartTour)
  }, [])

  useEffect(() => {
    if (!open) return

    const updateTargetRect = () => {
      setTargetRect(getTargetRect(currentStep.selector))
    }

    const targetElement = document.querySelector(currentStep.selector)
    if (targetElement instanceof HTMLElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      })
    }

    updateTargetRect()

    window.addEventListener('resize', updateTargetRect)
    window.addEventListener('scroll', updateTargetRect, true)
    return () => {
      window.removeEventListener('resize', updateTargetRect)
      window.removeEventListener('scroll', updateTargetRect, true)
    }
  }, [currentStep.selector, open])

  const overlayStyles = useMemo(() => {
    if (!targetRect) return null

    const padding = 8
    return {
      left: targetRect.left - padding,
      top: targetRect.top - padding,
      width: targetRect.width + padding * 2,
      height: targetRect.height + padding * 2,
    }
  }, [targetRect])

  const tooltipStyles = useMemo(() => {
    if (typeof window === 'undefined') {
      return { left: 16, top: 16, width: 320 }
    }

    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const cardWidth = Math.min(380, viewportWidth - 32)
    const estimatedCardHeight = 220
    const margin = 16

    if (!targetRect) {
      return {
        left: (viewportWidth - cardWidth) / 2,
        top: Math.max(margin, (viewportHeight - estimatedCardHeight) / 2),
        width: cardWidth,
      }
    }

    const left = clamp(
      targetRect.left + targetRect.width / 2 - cardWidth / 2,
      margin,
      viewportWidth - cardWidth - margin,
    )

    const belowTop = targetRect.bottom + 12
    const aboveTop = targetRect.top - estimatedCardHeight - 12

    const top =
      belowTop + estimatedCardHeight <= viewportHeight - margin
        ? belowTop
        : clamp(aboveTop, margin, viewportHeight - estimatedCardHeight - margin)

    return { left, top, width: cardWidth }
  }, [targetRect])

  if (!enabled || !open) return null

  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-black/60" />

      {overlayStyles && (
        <div
          className="absolute rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] transition-all duration-200"
          style={overlayStyles}
        />
      )}

      <Card
        className={cn('absolute max-h-[calc(100dvh-2rem)] max-w-[calc(100vw-2rem)] overflow-y-auto shadow-2xl')}
        style={tooltipStyles}
      >
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">{t(currentStep.titleKey)}</CardTitle>
          <CardDescription>
            {t('onboarding.tour.step_label', { current: stepIndex + 1, total: TOUR_STEPS.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{t(currentStep.descriptionKey)}</p>
        </CardContent>
        <CardFooter className="flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button variant="ghost" size="sm" className="w-full sm:w-auto" onClick={closeTour}>
            {t('global.skip')}
          </Button>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              disabled={stepIndex === 0}
            >
              {t('global.back')}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (isLastStep) {
                  closeTour()
                  return
                }
                setStepIndex((current) => Math.min(TOUR_STEPS.length - 1, current + 1))
              }}
            >
              {isLastStep ? t('global.finish') : t('global.next')}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
