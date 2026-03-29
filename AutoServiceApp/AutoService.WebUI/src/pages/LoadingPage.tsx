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
    }, 2500);

    return () => clearTimeout(timer);
  }, [isVisible]);

  if (!isVisible) {
    return null;
  }

  const isDark = theme === 'dark';
  const logoSrc = isDark ? '/AppLogoFrameWhite.webp' : '/AppLogoFrameBlack.webp';
  const rectangleColors = isDark
    ? ['#6A57CC33', '#7C66E633', '#5B43C226']
    : ['#6A57CC22', '#7C66E622', '#5B43C21A'];

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden"
      style={{ backgroundColor: isDark ? '#121212' : '#f6f4fb' }}
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
          100% { transform: translate(calc(-25vw), calc(0vh)) rotate(-8deg); opacity: 1; }
        }

        @keyframes shape-top-right-in {
          0% { transform: translate(calc(51.04vw), calc(-100vh)) rotate(-12deg); opacity: 0; }
          100% { transform: translate(calc(0vw), calc(-60vh)) rotate(-12deg); opacity: 1; }
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
      `}</style>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div
          className="shape-base shape-bottom-right"
          style={{ 
            width: '72.92vw',
            aspectRatio: '1400 / 430',
            backgroundColor: rectangleColors[0] 
          }}
        />
        <div
          className="shape-base shape-left"
          style={{ 
            width: '51.04vw',
            aspectRatio: '980 / 380',
            backgroundColor: rectangleColors[1] 
          }}
        />
        <div
          className="shape-base shape-top-right"
          style={{ 
            width: '42.71vw',
            aspectRatio: '820 / 360',
            backgroundColor: rectangleColors[2] 
          }}
        />
      </div>

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative z-10 flex items-center justify-center rounded-full"
          style={{
            width: 'clamp(200px, 16.67vw, 320px)',
            height: 'clamp(200px, 16.67vw, 320px)',
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
              width: 'clamp(100px, 8.85vw, 170px)', 
              height: 'clamp(100px, 8.85vw, 170px)', 
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

export const LoadingPage = LoadingPageComponent;