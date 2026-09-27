/**
 * Full-page-load loading splash screen.
 *
 * Displays an animated branded intro for roughly 3 seconds on browser reload
 * (for example F5 / Ctrl+F5), then renders nothing.
 * @module pages/LoadingPage
 */

import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/theme.store';
import { Image } from '../components/common/Image';
import { consumeSkipLoadingSplashOnNextBoot } from '../utils/serverErrorRecoverySession';

const LOADING_PAGE_DURATION_MS = 3000;
const SPLASH_ENABLED_PATHS = new Set([
  '/',
  '/login',
  '/customers',
  '/admin/register',
  '/settings',
  '/scheduler',
  '/dashboard',
]);

/** Strips trailing slashes so pathname variants match one canonical form. */
function normalizePathname(pathname: string): string {
  if (pathname.length <= 1) {
    return '/';
  }

  return pathname.replace(/\/+$/, '') || '/';
}

/** Decides whether the loading splash should render for the given route. */
function shouldShowSplashForPathname(pathname: string): boolean {
  const normalizedPathname = normalizePathname(pathname.toLowerCase());
  return SPLASH_ENABLED_PATHS.has(normalizedPathname);
}
type LoadingRectangleColors = readonly [string, string, string];

/** Resolves loading splash accent colors from semantic CSS tokens. */
function getLoadingRectangleColors(isDark: boolean): LoadingRectangleColors {
  const accentToken = isDark ? 'var(--color-arsm-accent-dark)' : 'var(--color-arsm-accent)';

  if (isDark) {
    return [
      `color-mix(in srgb, ${accentToken} 24%, transparent)`,
      `color-mix(in srgb, ${accentToken} 20%, transparent)`,
      `color-mix(in srgb, ${accentToken} 16%, transparent)`,
    ];
  }

  return [
    `color-mix(in srgb, ${accentToken} 24%, transparent)`,
    `color-mix(in srgb, ${accentToken} 18%, transparent)`,
    `color-mix(in srgb, ${accentToken} 12%, transparent)`,
  ];
}

const DESKTOP_SHAPE_STYLES = [
  { className: 'shape-base shape-bottom-right', width: 'min(72.92vw, 920px)', aspectRatio: '1400 / 430' },
  { className: 'shape-base shape-left', width: 'min(51.04vw, 700px)', aspectRatio: '980 / 380' },
  { className: 'shape-base shape-top-right', width: 'min(42.71vw, 620px)', aspectRatio: '820 / 360' },
] as const;

const MOBILE_ORB_STYLE = {
  width: '84vw',
  height: '84vw',
  maxWidth: '250px',
  maxHeight: '250px',
} as const;

const LOGO_HALO_STYLE = {
  width: 'clamp(124px, 40vw, 250px)',
  height: 'clamp(124px, 40vw, 250px)',
} as const;

const LOGO_IMAGE_STYLE = {
  width: 'clamp(64px, 20vw, 136px)',
  height: 'clamp(64px, 20vw, 136px)',
  objectFit: 'contain',
  willChange: 'transform',
} as const;

interface LoadingDesktopShapesProps {
  readonly rectangleColors: LoadingRectangleColors;
}

function LoadingDesktopShapes({ rectangleColors }: LoadingDesktopShapesProps) {
  return (
    <div className="absolute inset-0 pointer-events-none max-[320px]:hidden" aria-hidden="true">
      {DESKTOP_SHAPE_STYLES.map((shape, index) => (
        <div
          key={shape.className}
          className={shape.className}
          style={{
            width: shape.width,
            aspectRatio: shape.aspectRatio,
            backgroundColor: rectangleColors[index],
          }}
        />
      ))}
    </div>
  );
}

function LoadingMobileOrb() {
  return (
    <div className="absolute inset-0 pointer-events-none hidden max-[320px]:block" aria-hidden="true">
      <div className="arsm-loading-mobile-orb mobile-orb" style={MOBILE_ORB_STYLE} />
    </div>
  );
}

interface LoadingCenterLogoProps {
  readonly logoAlt: string;
  readonly logoSrc: string;
}

function LoadingCenterLogo({ logoAlt, logoSrc }: LoadingCenterLogoProps) {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="arsm-loading-logo-halo relative z-10 flex items-center justify-center rounded-full" style={LOGO_HALO_STYLE}>
        <Image
          src={logoSrc}
          alt={logoAlt}
          width={789}
          height={662}
          draggable={false}
          loading="eager"
          decoding="async"
          className="logo-spin opacity-70 select-none"
          style={LOGO_IMAGE_STYLE}
        />
      </div>
    </div>
  );
}

const LoadingPageComponent = memo(function LoadingPage() {
  const [isVisible, setIsVisible] = useState(() => {
    if (consumeSkipLoadingSplashOnNextBoot()) {
      return false;
    }

    return shouldShowSplashForPathname(globalThis.location.pathname);
  });
  const { t: translate } = useTranslation();
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(false);
    }, LOADING_PAGE_DURATION_MS);

    return () => clearTimeout(timer);
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  const isDark = theme === 'dark';
  const logoSrc = isDark ? '/AppLogoFrameWhite.webp' : '/AppLogoFrameBlack.webp';
  const rectangleColors = getLoadingRectangleColors(isDark);
  const logoAlt = translate('login.logoAlt');

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-arsm-surface dark:bg-arsm-surface-dark">
      <LoadingDesktopShapes rectangleColors={rectangleColors} />
      <LoadingMobileOrb />
      <LoadingCenterLogo logoSrc={logoSrc} logoAlt={logoAlt} />
    </div>
  );
});

LoadingPageComponent.displayName = 'LoadingPage';

/** Animated loading splash shown once per full browser reload on app routes. */
export const LoadingPage = LoadingPageComponent;
