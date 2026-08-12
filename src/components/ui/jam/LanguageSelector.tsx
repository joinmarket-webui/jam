import type { ComponentProps } from 'react'
import { LanguagesIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select'
import languages from '@/i18n/languages'

export const LanguageSelector = (props: ComponentProps<typeof Select> = {}) => {
  const { i18n, t } = useTranslation()
  const currentLanguage = languages.find((lang) => lang.key === i18n.resolvedLanguage)
  const currentLanguageDescription = currentLanguage?.description || 'English'

  return (
    <Select
      value={i18n.resolvedLanguage}
      onValueChange={(value) => {
        void i18n.changeLanguage(value)
      }}
      {...props}
    >
      <SelectTrigger className="w-full text-xs sm:min-w-42" aria-label="Select language">
        <SelectValue placeholder={currentLanguageDescription} />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel className="flex items-center gap-1">
            <LanguagesIcon className="size-4" />
            {t('settings.label_select_language')}
          </SelectLabel>
          {languages.map((language) => (
            <SelectItem key={language.key} value={language.key}>
              {language.description}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
