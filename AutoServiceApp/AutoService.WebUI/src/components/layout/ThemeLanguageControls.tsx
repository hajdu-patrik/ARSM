import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/theme.store';

interface ThemeLanguageControlsProps {
  readonly className?: string;
}

const DEFAULT_WRAPPER_CLASS = 'fixed left-1/2 top-6 z-30 flex -translate-x-1/2 items-center gap-1.5 sm:left-auto sm:right-8 sm:top-6 sm:translate-x-0 sm:gap-3';
const BASE_BUTTON_CLASS = 'min-w-[52px] rounded-xl px-8 py-3 text-sm leading-none transition hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9B3FF66]';
const LIGHT_THEME_BUTTON_CLASS = 'bg-[#C9B3FF] text-[#2C2440] shadow-[0_8px_20px_rgba(111,84,173,0.28)] hover:bg-[#BFA6F7]';
const DARK_THEME_BUTTON_CLASS = 'bg-[#7A66C7] text-[#F5F2FF] shadow-[0_8px_20px_rgba(111,84,173,0.28)] hover:bg-[#8A75D6] focus-visible:ring-[#8A75D64D]';

const ThemeLanguageControlsComponent = memo(function ThemeLanguageControls({
  className = DEFAULT_WRAPPER_CLASS,
}: ThemeLanguageControlsProps) {
  const { i18n, t } = useTranslation();
  const theme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);

  const handleLanguageSwitch = useCallback(() => {
    const newLang = i18n.language === 'en' ? 'hu' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('preferred-language', newLang);
  }, [i18n]);

  const isDark = theme === 'dark';
  const activeLanguage = (i18n.resolvedLanguage ?? i18n.language ?? 'en').toLowerCase();
  const isHungarian = activeLanguage.startsWith('hu');
  const themeButtonClass = isDark ? DARK_THEME_BUTTON_CLASS : LIGHT_THEME_BUTTON_CLASS;
  const languageButtonTitle = isHungarian ? t('theme.switchToEnglish') : t('theme.switchToHungarian');
  const themeButtonTitle = isDark ? t('theme.switchToLight') : t('theme.switchToDark');

  return (
    <div className={className}>
      <button
        onClick={handleLanguageSwitch}
        type="button"
        className={`${BASE_BUTTON_CLASS} ${themeButtonClass} tracking-wide select-none `}
        title={languageButtonTitle}
      >
        {i18n.language.toUpperCase()}
      </button>

      <button
        onClick={toggleTheme}
        type="button"
        className={`${BASE_BUTTON_CLASS} ${themeButtonClass} select-none `}
        title={themeButtonTitle}
      >
        {isDark ? '☽' : '☀'}
      </button>
    </div>
  );
});

ThemeLanguageControlsComponent.displayName = 'ThemeLanguageControls';

export const ThemeLanguageControls = ThemeLanguageControlsComponent;