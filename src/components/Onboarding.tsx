import { useCallback, useState, useMemo } from 'react'
import * as rb from 'react-bootstrap'
import { Trans, useTranslation } from 'react-i18next'
import Sprite from './Sprite'
import { useSettingsDispatch } from '../context/SettingsContext'
import styles from './Onboarding.module.css'

export default function Onboarding() {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)
  const settingsDispatch = useSettingsDispatch()

  const steps = useMemo(
    () => [
      {
        title: t('onboarding.screen_1_title'),
        description: t('onboarding.screen_1_description'),
        icon: <Sprite symbol="welcome" width="11rem" height="11rem" />,
      },
      {
        title: t('onboarding.screen_2_title'),
        description: t('onboarding.screen_2_description'),
        icon: <Sprite symbol="collab" width="10rem" height="10rem" />,
      },
      {
        title: t('onboarding.screen_3_title'),
        description: t('onboarding.screen_3_description'),
        icon: <Sprite symbol="key" width="11rem" height="11rem" />,
      },
      {
        title: t('onboarding.screen_4_title'),
        description: t('onboarding.screen_4_description'),
        icon: <Sprite symbol="handshake" width="11rem" height="11rem" />,
      },
      {
        title: t('onboarding.screen_5_title'),
        description: t('onboarding.screen_5_description'),
        icon: <Sprite symbol="shield-outline" width="11rem" height="11rem" />,
      },
    ],
    [t],
  )

  const next = useCallback(() => {
    if (step < steps.length) {
      setStep(step + 1)
    } else {
      settingsDispatch({ showOnboarding: false })
    }
  }, [step, steps.length, settingsDispatch])

  const back = () => setStep((current) => Math.max(0, current - 1))

  if (step === 0) {
    return (
      <>
        <div className="text-center mt-3 mb-4">
          <Sprite symbol="logo" width="128px" height="128px" className="mb-4" />
          <h1>{t('onboarding.splashscreen_title')}</h1>
          <h2 className="fw-normal text-secondary mb-5">{t('onboarding.splashscreen_subtitle')}</h2>
          <rb.Button className="w-100 mb-2" size="lg" variant="dark" onClick={next}>
            {t('onboarding.splashscreen_button_get_started')}
          </rb.Button>
          <rb.Button
            className="w-100 mb-2"
            size="lg"
            variant="outline-dark"
            onClick={() => settingsDispatch({ showOnboarding: false })}
          >
            {t('onboarding.splashscreen_button_skip_intro')}
          </rb.Button>
        </div>
        <div className="text-secondary mb-2">
          <p className="text-center mb-4">
            {t('onboarding.splashscreen_description_line1')}
            <br />
            {t('onboarding.splashscreen_description_line2')}
          </p>
          <div className="text-center fw-bolder">{t('onboarding.splashscreen_warning_title')}</div>
          <p className="text-justify">
            <Trans i18nKey="onboarding.splashscreen_warning_text">
              While JoinMarket is tried and tested, Jam is not. It is in a beta stage, so use with caution.
              <a
                href="https://github.com/joinmarket-webui/jam/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="link-secondary"
              >
                Help us improve the project on GitHub.
              </a>
              <a
                href="https://joinmarket-webui.github.io/jamdocs/"
                target="_blank"
                rel="noopener noreferrer"
                className="link-secondary"
              >
                read the documentation
              </a>
            </Trans>
          </p>
        </div>
      </>
    )
  } else {
    const content = steps[step - 1]

    return (
      <>
        <div className="text-center mt-3">
          <div className={`${styles.icon} d-flex justify-content-center align-items-center mb-4`}>{content.icon}</div>
          <h2 className={`${styles.title} d-flex justify-content-center align-items-center mb-2`}>{content.title}</h2>
          <div className={`${styles.description} d-flex justify-content-center align-items-center text-secondary mb-4`}>
            {content.description}
          </div>
        </div>
        <div className="d-flex flex-column align-items-center gap-2">
          <rb.Button className="w-50" variant="dark" size="lg" onClick={next}>
            {step === steps.length ? t('onboarding.button_complete') : t('onboarding.button_next')}
          </rb.Button>
          <rb.Button className="w-50" variant="none" size="sm" onClick={back}>
            {t('global.back')}
          </rb.Button>
        </div>
      </>
    )
  }
}
