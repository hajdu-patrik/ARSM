/**
 * Theme (dark/light) and language (EN/HU) toggle controls.
 * Persists preferences to `localStorage` and applies them immediately.
 * @module ThemeLanguageControls
 */
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/theme.store';

/** Props for the {@link ThemeLanguageControls} component. */
interface ThemeLanguageControlsProps {
  /** Optional wrapper CSS classes. Defaults to a fixed-position centered layout. */
  readonly className?: string;
}

/** Default wrapper class: fixed-position, centered on mobile, right-aligned on sm+. */
const DEFAULT_WRAPPER_CLASS = 'fixed left-1/2 top-5 z-30 flex -translate-x-1/2 items-center gap-1.5 rounded-2xl border border-arsm-border/70 bg-arsm-card/85 px-2.5 py-2 shadow-[0_16px_36px_rgba(45,36,64,0.16),0_0_0_1px_rgba(255,255,255,0.4)_inset] backdrop-blur-xl sm:left-auto sm:right-7 sm:top-6 sm:translate-x-0 sm:gap-2 dark:border-arsm-border-dark/70 dark:bg-arsm-card-dark/82 dark:shadow-[0_20px_42px_rgba(5,8,20,0.65),0_0_0_1px_rgba(255,255,255,0.04)_inset]';

/** Base Tailwind classes shared by both the language and theme buttons. */
const BASE_BUTTON_CLASS = 'min-w-[3.1rem] rounded-xl px-3.5 py-2.5 text-sm font-semibold leading-none tracking-wide transition duration-200 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-focus-ring/45';

/** Button variant styling for light theme. */
const LIGHT_THEME_BUTTON_CLASS = 'bg-arsm-accent text-arsm-primary shadow-[0_10px_22px_rgba(97,67,154,0.28)] hover:bg-arsm-accent-hover hover:shadow-[0_14px_28px_rgba(97,67,154,0.32)]';

/** Button variant styling for dark theme. */
const DARK_THEME_BUTTON_CLASS = 'bg-arsm-accent-dark text-arsm-hover shadow-[0_12px_24px_rgba(10,12,24,0.55)] hover:bg-arsm-accent-dark-hover hover:shadow-[0_16px_30px_rgba(10,12,24,0.62)] focus-visible:ring-arsm-focus-ring/35';

/** Memoized language and theme toggle buttons with persisted preferences. */
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
        className={`${BASE_BUTTON_CLASS} ${themeButtonClass} select-none`}
        title={languageButtonTitle}
      >
        {i18n.language.toUpperCase()}
      </button>

      <button
        onClick={toggleTheme}
        type="button"
        className={`${BASE_BUTTON_CLASS} ${themeButtonClass} select-none`}
        title={themeButtonTitle}
      >
        {isDark ? '☽' : '☀'}
      </button>
    </div>
  );
});

ThemeLanguageControlsComponent.displayName = 'ThemeLanguageControls';

export const ThemeLanguageControls = ThemeLanguageControlsComponent;
