import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/theme.store';

interface ThemeLanguageControlsProps {
  readonly className?: string;
}

const DEFAULT_WRAPPER_CLASS = 'fixed right-4 top-4 z-30 flex items-center gap-2 sm:right-8 sm:top-6 sm:gap-3';
const BASE_BUTTON_CLASS = 'min-w-[64px] rounded-full border px-7 py-3 transition-all duration-200 ease-out hover:-translate-y-px hover:shadow-md';
const LIGHT_THEME_BUTTON_CLASS = 'bg-[#E7DDFC] text-[#2C2440] border-[#C8B6EB] hover:bg-[#DED0FA] hover:border-[#B9A2E6]';
const DARK_THEME_BUTTON_CLASS = 'bg-[#2C2440] text-[#EDE8FA] border-[#463865] hover:bg-[#3A2E55] hover:border-[#5B4A82]';

const ThemeLanguageControlsComponent = memo(function ThemeLanguageControls({
  className = DEFAULT_WRAPPER_CLASS,
}: ThemeLanguageControlsProps) {
  const { i18n } = useTranslation();
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
  const languageButtonTitle = isHungarian ? 'Váltás angolra' : 'Switch to Hungarian';
  let themeButtonTitle: string;

  if (isHungarian) {
    themeButtonTitle = isDark ? 'Váltás világos módra' : 'Váltás sötét módra';
  } else {
    themeButtonTitle = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  }

  return (
    <div className={className}>
      <button
        onClick={handleLanguageSwitch}
        type="button"
        className={`${BASE_BUTTON_CLASS} ${themeButtonClass} text-xs font-medium tracking-wide`}
        title={languageButtonTitle}
      >
        {i18n.language.toUpperCase()}
      </button>

      <button
        onClick={toggleTheme}
        type="button"
        className={`${BASE_BUTTON_CLASS} ${themeButtonClass} text-sm`}
        title={themeButtonTitle}
      >
        {isDark ? '☽' : '☀'}
      </button>
    </div>
  );
});

ThemeLanguageControlsComponent.displayName = 'ThemeLanguageControls';

export const ThemeLanguageControls = ThemeLanguageControlsComponent;