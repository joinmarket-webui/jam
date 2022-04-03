import React, { useState } from 'react'
import { Trans, useTranslation } from 'react-i18next'
import Sprite from './Sprite'
import { useSettingsDispatch } from '../context/SettingsContext'
import Button from 'react-bootstrap/Button'

export default function Onboarding() {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const settingsDispatch = useSettingsDispatch()

  const next = () => {
    if (step < steps.length) {
      setStep(step + 1)
    } else {
      settingsDispatch({ showOnboarding: false })
    }
  }

  const steps = [
    {
      title: t('onboarding.screen_1_title'),
      description: t('onboarding.screen_1_description'),
      icon: 'welcome',
    },
    {
      title: t('onboarding.screen_2_title'),
      description: t('onboarding.screen_2_description'),
      icon: 'collab',
    },
    {
      title: t('onboarding.screen_3_title'),
      description: t('onboarding.screen_3_description'),
      icon: 'key',
    },
    {
      title: t('onboarding.screen_4_title'),
      description: t('onboarding.screen_4_description'),
      icon: 'handshake',
    },
    {
      title: t('onboarding.screen_5_title'),
      description: t('onboarding.screen_5_description'),
      icon: 'shield-outline',
    },
  ]

  if (step === 0) {
    return (
      <div>
        <div className="d-flex justify-content-center">
          <Sprite symbol="logo" width="8rem" height="8rem" className="mb-4" />
        </div>
        <h1 className="text-center">{t('onboarding.splashscreen_title')}</h1>
        <h2 className="text-center fw-normal text-secondary mb-5">{t('onboarding.splashscreen_subtitle')}</h2>
        <div className="d-flex justify-content-center mb-2">
          <Button size="lg" variant="dark" onClick={next}>
            {t('onboarding.splashscreen_button_get_started')}
          </Button>
        </div>
        <div className="d-flex justify-content-center">
          <Button size="lg" variant="outline-dark" onClick={() => settingsDispatch({ showOnboarding: false })}>
            {t('onboarding.splashscreen_button_skip_intro')}
          </Button>
        </div>
        <p className="mt-4 text-center text-secondary">
          {t('onboarding.splashscreen_description_line1')}
          <br />
          {t('onboarding.splashscreen_description_line2')}
        </p>
        <div className="mt-4 text-secondary text-center">
          <div className="fw-bolder">{t('onboarding.splashscreen_warning_title')}</div>
          <div>
            <Trans i18nKey="onboarding.splashscreen_warning_text">
              While JoinMarket is tried and tested, Jam is not. It is in an alpha stage, so use with caution.
              <a
                href="https://github.com/joinmarket-webui/joinmarket-webui/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="link-secondary"
              >
                Help us improve the project on GitHub.
              </a>
            </Trans>
          </div>
        </div>
      </div>
    )
  } else {
    const content = steps[step - 1]

    return (
      <>
        <div className="flex-1">
          <div className="d-flex justify-content-center">
            <Sprite symbol={content.icon} width="5rem" height="5rem" className="mb-4" />
          </div>
          <h2 className="text-center mb-3">{content.title}</h2>
          <p className="description text-center text-secondary mb-5">{content.description}</p>
        </div>
        <div className="button d-flex justify-content-center">
          <Button size="lg" variant="dark" onClick={next}>
            {step === steps.length ? t('onboarding.button_complete') : t('onboarding.button_next')}
          </Button>
        </div>
      </>
    )
  }
}
