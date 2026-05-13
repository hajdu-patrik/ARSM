/**
 * Theme (dark/light) and language (EN/HU) toggle controls.
 * Persists preferences to localStorage and applies them immediately.
 */
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../../store/theme.store';
import { compactUtilityButtonClass } from '../../utils/formStyles';

interface ThemeLanguageControlsProps {
	readonly className?: string;
}

const DEFAULT_WRAPPER_CLASS = 'fixed left-1/2 top-5 z-30 flex min-w-0 -translate-x-1/2 items-center gap-1.5 rounded-2xl border border-arsm-border/45 bg-arsm-card/72 px-2.5 py-1.5 backdrop-blur-md max-[320px]:top-3.5 max-[320px]:gap-1 max-[320px]:px-2 max-[320px]:py-1 sm:left-auto sm:right-7 sm:top-6 sm:translate-x-0 sm:gap-2 dark:border-arsm-border-dark/45 dark:bg-arsm-card-dark/70';

const ThemeLanguageControlsComponent = memo(function ThemeLanguageControls({
	className = DEFAULT_WRAPPER_CLASS,
}: ThemeLanguageControlsProps) {
	const { i18n, t } = useTranslation();
	const theme = useThemeStore((state) => state.theme);
	const toggleTheme = useThemeStore((state) => state.toggleTheme);

	const activeLanguage = (i18n.resolvedLanguage ?? i18n.language ?? 'en').toLowerCase();
	const isHungarian = activeLanguage.startsWith('hu');
	const visibleLanguageLabel = isHungarian ? 'HU' : 'EN';

	const handleLanguageSwitch = useCallback(() => {
		const newLang = isHungarian ? 'en' : 'hu';
		void i18n.changeLanguage(newLang);
		localStorage.setItem('preferred-language', newLang);
	}, [i18n, isHungarian]);

	const isDark = theme === 'dark';
	const languageButtonTitle = isHungarian ? t('theme.switchToEnglish') : t('theme.switchToHungarian');
	const themeButtonTitle = isDark ? t('theme.switchToLight') : t('theme.switchToDark');

	return (
		<div className={className}>
			<button
				data-testid="theme-language-toggle"
				onClick={handleLanguageSwitch}
				type="button"
				className={`${compactUtilityButtonClass} select-none`}
				title={languageButtonTitle}
				aria-label={languageButtonTitle}
			>
				{visibleLanguageLabel}
			</button>
			<button
				data-testid="theme-mode-toggle"
				onClick={toggleTheme}
				type="button"
				className={`${compactUtilityButtonClass} select-none`}
				title={themeButtonTitle}
				aria-label={themeButtonTitle}
			>
				{isDark ? '☽' : '☀'}
			</button>
		</div>
	);
});

ThemeLanguageControlsComponent.displayName = 'ThemeLanguageControls';

export const ThemeLanguageControls = ThemeLanguageControlsComponent;
