import type { ComponentProps, PropsWithChildren } from 'react'
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
import { cn } from '@/lib/utils'
import { Button } from '../button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '../dropdown-menu'

export const LanguageSelector = ({
  className,
  ...props
}: ComponentProps<typeof Select> & { className?: string } = {}) => {
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
      <SelectTrigger
        className={cn('w-full text-xs sm:min-w-42', className)}
        aria-label={t('settings.label_select_language_aria_label')}
      >
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

export const LanguageSelectorDropdownMenu = ({
  className,
  align,
  loop = true,
  ...props
}: PropsWithChildren<
  ComponentProps<typeof DropdownMenu> & {
    className?: string
    align?: ComponentProps<typeof DropdownMenuContent>['align']
    loop?: ComponentProps<typeof DropdownMenuContent>['loop']
  }
> = {}) => {
  const { i18n, t } = useTranslation()

  return (
    <DropdownMenu {...props}>
      <DropdownMenuTrigger asChild>
        {props.children ?? (
          <Button
            type="button"
            variant="ghost"
            className={className}
            aria-label={t('settings.label_select_language_aria_label')}
          >
            <LanguagesIcon />
            {t('settings.label_select_language')}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-full text-xs sm:min-w-56" align={align} loop={loop}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-1">
            <LanguagesIcon className="size-4" />
            {t('settings.label_select_language')}
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={i18n.resolvedLanguage}
            onValueChange={(value) => {
              void i18n.changeLanguage(value)
            }}
          >
            {languages.map((language) => (
              <DropdownMenuRadioItem key={language.key} value={language.key}>
                {language.description}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
