/** Shell of the pages that stand without the sidebar (login, required password change): the ambient backdrop,
 * the theme and language controls and one card that carries the logo, the title, a subtitle and the content. */
import { memo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Image } from '../common/Image';
import { centeredAmbientOrbLayoutClass, displayHeadingTextClass, mutedSecondaryTextClass } from '../../utils/formStyles';
import { ThemeLanguageControls } from './ThemeLanguageControls';

interface AuthPageLayoutProps {
  readonly title: string;
  readonly subtitle: string;
  readonly children: ReactNode;
}

/** Centered auth card on the ambient backdrop; the page's own form goes in as children. */
export const AuthPageLayout = memo(function AuthPageLayout({ title, subtitle, children }: AuthPageLayoutProps) {
  const { t: translate } = useTranslation();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-arsm-surface px-3 pb-6 pt-24 text-ui-text dark:bg-arsm-deepest sm:px-4 sm:pb-8 sm:pt-8">
      <div
        aria-hidden="true"
        className={`arsm-auth-ambient ${centeredAmbientOrbLayoutClass}`}
      />
      <div
        aria-hidden="true"
        className="arsm-auth-sheen pointer-events-none absolute inset-0 z-0"
      />

      <ThemeLanguageControls />

      <div className="relative z-10 w-full max-w-[28rem] max-[320px]:max-w-[19.5rem]">
        <div className="relative overflow-hidden rounded-3xl border border-ui-border bg-ui-card/95 p-5 backdrop-blur-md max-[320px]:p-4 sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center max-[320px]:mb-5 sm:mb-8">
            <div className="mt-1 flex items-center justify-center">
              <Image
                src="/AppLogoFrameBlack.webp"
                alt={translate('login.logoAlt')}
                width={789}
                height={662}
                fetchPriority="high"
                decoding="async"
                className="block h-20 w-auto select-none opacity-75 dark:hidden sm:h-24"
              />
              <Image
                src="/AppLogoFrameWhite.webp"
                alt={translate('login.logoAlt')}
                width={789}
                height={662}
                fetchPriority="high"
                decoding="async"
                className="hidden h-20 w-auto select-none opacity-75 dark:block sm:h-24"
              />
            </div>
            <h1 className={`mt-2 text-balance ${displayHeadingTextClass}`}>
              {title}
            </h1>
            <p className={`mt-2 ${mutedSecondaryTextClass}`}>{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </main>
  );
});
