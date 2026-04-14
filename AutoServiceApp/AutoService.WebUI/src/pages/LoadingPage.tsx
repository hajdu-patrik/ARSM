/**
 * One-time loading splash screen.
 *
 * Displays an animated branded intro for roughly 3 seconds per browser
 * profile using a localStorage flag, then renders nothing.
 * @module pages/LoadingPage
 */

import { memo, useEffect, useState } from 'react';
import { useThemeStore } from '../store/theme.store';
import { Image } from '../components/common/Image';

const LOADING_PAGE_SEEN_KEY = 'loading-page-seen';

const LoadingPageComponent = memo(function LoadingPage() {
  const [isVisible, setIsVisible] = useState(() => {
    return localStorage.getItem(LOADING_PAGE_SEEN_KEY) !== 'true';
  });
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
  const rectangleColors = isDark
    ? ['#7A66C733', '#7A66C726', '#7A66C71A']
    : ['#C9B3FF33', '#C9B3FF26', '#C9B3FF1A'];

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ backgroundColor: isDark ? '#09090F' : '#ECECEF' }}
    >
      <style>{`
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
          animation-name: shape-left-in;
        }

        .shape-bottom-right {
          animation-name: shape-bottom-right-in;
        }

        .shape-top-right {
          animation-name: shape-top-right-in;
        }

        .mobile-orb {
          position: absolute;
          left: 50%;
          top: 52%;
          border-radius: 9999px;
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
      `}</style>
      <div className="absolute inset-0 pointer-events-none max-[320px]:hidden" aria-hidden="true">
        <div
          className="shape-base shape-bottom-right"
          style={{
            width: 'min(72.92vw, 920px)',
            aspectRatio: '1400 / 430',
            backgroundColor: rectangleColors[0]
          }}
        />
        <div
          className="shape-base shape-left"
          style={{
            width: 'min(51.04vw, 700px)',
            aspectRatio: '980 / 380',
            backgroundColor: rectangleColors[1]
          }}
        />
        <div
          className="shape-base shape-top-right"
          style={{
            width: 'min(42.71vw, 620px)',
            aspectRatio: '820 / 360',
            backgroundColor: rectangleColors[2]
          }}
        />
      </div>

      <div className="absolute inset-0 pointer-events-none hidden max-[320px]:block" aria-hidden="true">
        <div
          className="mobile-orb"
          style={{
            width: '84vw',
            height: '84vw',
            maxWidth: '250px',
            maxHeight: '250px',
            background: isDark
              ? 'radial-gradient(circle, rgba(122,102,199,0.32) 0%, rgba(122,102,199,0.1) 56%, rgba(122,102,199,0) 100%)'
              : 'radial-gradient(circle, rgba(201,179,255,0.36) 0%, rgba(201,179,255,0.12) 56%, rgba(201,179,255,0) 100%)',
          }}
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative z-10 flex items-center justify-center rounded-full"
          style={{
            width: 'clamp(124px, 40vw, 250px)',
            height: 'clamp(124px, 40vw, 250px)',
            border: '1px solid #C9B3FF26',
            backgroundColor: '#C9B3FF1A',
            boxShadow: '0 0 36px #C9B3FF70, 0 0 88px #C9B3FF30',
          }}
        >
          <Image
            src={logoSrc}
            alt="AutoService logo"
            draggable={false}
            loading="eager"
            decoding="async"
            className="logo-spin opacity-70 select-none"
            style={{
              width: 'clamp(64px, 20vw, 136px)',
              height: 'clamp(64px, 20vw, 136px)',
              objectFit: 'contain',
              willChange: 'transform'
            }}
          />
        </div>
      </div>
    </div>
  );
});

LoadingPageComponent.displayName = 'LoadingPage';

/** Animated loading splash shown once per browser profile. */
export const LoadingPage = LoadingPageComponent;
