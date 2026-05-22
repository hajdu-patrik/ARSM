/**
 * One-time loading splash screen.
 *
 * Displays an animated branded intro for roughly 3 seconds per browser
 * profile using a localStorage flag, then renders nothing.
 * @module pages/LoadingPage
 */

import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../store/theme.store';
import { Image } from '../components/common/Image';

const LOADING_PAGE_SEEN_KEY = 'loading-page-seen';
type LoadingRectangleColors = readonly [string, string, string];

const LOADING_PAGE_ANIMATION_CSS = `
@keyframes logo-spin-variable {
  0% { transform: rotate(0deg); }
  40% { transform: rotate(85deg); }
  70% { transform: rotate(290deg); }
  100% { transform: rotate(360deg); }
}

@keyframes shape-left-in {
  0% { transform: translate(calc(-70vw), calc(0vh)) rotate(12deg); opacity: 0; }
  100% { transform: translate(calc(-52vw), calc(-10vh)) rotate(12deg); opacity: 1; }
}

@keyframes shape-bottom-right-in {
  0% { transform: translate(calc(50vw), calc(60vh)) rotate(-8deg); opacity: 0; }
  100% { transform: translate(calc(10vw), calc(15vh)) rotate(-8deg); opacity: 1; }
}

@keyframes shape-top-right-in {
  0% { transform: translate(calc(51.04vw), calc(-100vh)) rotate(-12deg); opacity: 0; }
  100% { transform: translate(calc(0vw), calc(-60vh)) rotate(-12deg); opacity: 1; }
}

@keyframes mobile-orb-float {
  0% { transform: translate(-50%, -50%) scale(0.92); opacity: 0.2; }
  50% { transform: translate(-50%, -55%) scale(1.02); opacity: 0.34; }
  100% { transform: translate(-50%, -50%) scale(0.92); opacity: 0.2; }
}

@keyframes mobile-logo-pulse-spin {
  0% { transform: rotate(0deg) scale(0.96); }
  50% { transform: rotate(180deg) scale(1.03); }
  100% { transform: rotate(360deg) scale(0.96); }
}

.logo-spin {
  animation: logo-spin-variable 1.5s linear infinite;
  transform-origin: center;
}

.shape-base {
  position: absolute;
  left: 50%;
  top: 50%;
  border-radius: 9999px;
  transform-origin: center;
  animation-duration: 3s;
  animation-fill-mode: forwards;
  animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
}

.shape-left {
  transform: translate(calc(-52vw), calc(-10vh)) rotate(12deg);
  opacity: 1;
  animation-name: shape-left-in;
}

.shape-bottom-right {
  transform: translate(calc(10vw), calc(15vh)) rotate(-8deg);
  opacity: 1;
  animation-name: shape-bottom-right-in;
}

.shape-top-right {
  transform: translate(calc(0vw), calc(-60vh)) rotate(-12deg);
  opacity: 1;
  animation-name: shape-top-right-in;
}

.mobile-orb {
  position: absolute;
  left: 50%;
  top: 52%;
  border-radius: 9999px;
  transform: translate(-50%, -50%) scale(0.92);
  opacity: 0.2;
  animation: mobile-orb-float 2.2s ease-in-out infinite;
}

.mobile-logo {
  animation: mobile-logo-pulse-spin 1.8s linear infinite;
  transform-origin: center;
}

@media (max-width: 320px) {
  .logo-spin {
    animation: mobile-logo-pulse-spin 1.8s linear infinite;
  }
}

@media (prefers-reduced-motion: reduce) {
  .logo-spin,
  .mobile-logo,
  .mobile-orb,
  .shape-base {
    animation: none;
  }
}`;

/** Resolves loading splash accent colors from semantic CSS tokens. */
function getLoadingRectangleColors(isDark: boolean): LoadingRectangleColors {
  const accentToken = isDark ? 'var(--color-arsm-accent-dark)' : 'var(--color-arsm-accent)';

  return [
    `color-mix(in srgb, ${accentToken} 20%, transparent)`,
    `color-mix(in srgb, ${accentToken} 15%, transparent)`,
    `color-mix(in srgb, ${accentToken} 10%, transparent)`,
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
    return localStorage.getItem(LOADING_PAGE_SEEN_KEY) !== 'true';
  });
  const { t: translate } = useTranslation();
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const timer = setTimeout(() => {
      localStorage.setItem(LOADING_PAGE_SEEN_KEY, 'true');
      setIsVisible(false);
    }, 3000);

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
      <style>{LOADING_PAGE_ANIMATION_CSS}</style>
      <LoadingDesktopShapes rectangleColors={rectangleColors} />
      <LoadingMobileOrb />
      <LoadingCenterLogo logoSrc={logoSrc} logoAlt={logoAlt} />
    </div>
  );
});

LoadingPageComponent.displayName = 'LoadingPage';

/** Animated loading splash shown once per browser profile. */
export const LoadingPage = LoadingPageComponent;
