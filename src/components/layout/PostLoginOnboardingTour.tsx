import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { POST_LOGIN_TOUR_DISMISSED_STORAGE_KEY, POST_LOGIN_TOUR_EVENT } from '@/constants/onboarding'
import { cn } from '@/lib/utils'

type TourStep = {
  selector: string
  title: string
  description: string
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour-id="wallet-preview"]',
    title: 'Wallet Snapshot',
    description:
      'This area shows your current wallet and total balance. Use it to quickly verify you are in the right wallet.',
  },
  {
    selector: '[data-tour-id="wallet-actions"]',
    title: 'Primary Actions',
    description: 'Start here for day-to-day usage: Receive for deposits and Send for withdrawals or coinjoin flows.',
  },
  {
    selector: '[data-tour-id="wallet-jars"]',
    title: 'Jars Overview',
    description: 'Jars help you separate funds by mixdepth. Click any jar to inspect UTXOs and details.',
  },
  {
    selector: '[data-tour-id="footer-tools"]',
    title: 'Quick Tools',
    description: 'Open Cheatsheet, Orderbook, and Logs from here without leaving the current page.',
  },
  {
    selector: '[data-tour-id="settings-button"]',
    title: 'Settings & Safety',
    description: 'Use Settings to manage lock wallet, language, display mode, and other important preferences.',
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

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))

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

      <Card className={cn('absolute max-w-[calc(100vw-2rem)] shadow-2xl')} style={tooltipStyles}>
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">{currentStep.title}</CardTitle>
          <CardDescription>
            Step {stepIndex + 1} of {TOUR_STEPS.length}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm leading-relaxed">{currentStep.description}</p>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={closeTour}>
            Skip tour
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
              disabled={stepIndex === 0}
            >
              Back
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
              {isLastStep ? 'Finish' : 'Next'}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}
