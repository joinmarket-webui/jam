import { Globe } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import languages from '@/i18n/languages'

export const LanguageSelector = () => {
  const { i18n, t } = useTranslation()

  const handleLanguageChange = (languageKey: string) => {
    i18n.changeLanguage(languageKey)
  }

  const getCurrentLanguageDescription = () => {
    const currentLanguage = languages.find((lang) => lang.key === i18n.resolvedLanguage)
    return currentLanguage?.description || 'English'
  }

  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <div className="bg-muted/50 flex h-7 w-7 items-center justify-center rounded-lg border">
          <Globe className="text-muted-foreground h-3 w-3" />
        </div>
        <div>
          <p className="text-sm font-medium">{t('settings.label_select_language')}</p>
        </div>
      </div>

      <Select value={i18n.resolvedLanguage} onValueChange={handleLanguageChange}>
        <SelectTrigger className="h-7 w-38 text-xs" aria-label="Select language">
          <SelectValue placeholder={getCurrentLanguageDescription()} />
        </SelectTrigger>
        <SelectContent>
          {languages.map((language) => (
            <SelectItem key={language.key} value={language.key}>
              {language.description}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
