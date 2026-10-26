/** Authenticated app shell: the skip link, the collapsible sidebar (a drawer below md), the header with the
 * theme/language controls, and the page. */
import { memo, useCallback, useId, useRef, useState, useSyncExternalStore, type MouseEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';
import { authService } from '../../services/auth/auth.service';
import { APP_ROUTE_PATHS } from '../../router/appRoutes';
import { focusVisibleOutlineClass, largeIconClass, sidebarShellIconButtonClass } from '../../utils/formStyles';
import { readStorage, writeStorage } from '../../utils/safeStorage';
import { PREF_SIDEBAR_COLLAPSED_KEY } from '../../utils/browserStorageKeys';
import { ThemeLanguageControls } from './ThemeLanguageControls';
import { SidebarContent, type NavItem } from './SidebarContent';
import { useSidebarProfile } from './useSidebarProfile';

interface SidebarLayoutProps {
  readonly children: ReactNode;
  readonly navItems?: readonly NavItem[] | undefined;
}

/** Id of the `<main>` landmark, which the skip link jumps to. */
const MAIN_CONTENT_ID = 'main-content';
/** Hidden until it takes keyboard focus, then drawn over the top-left corner of the page. */
const SKIP_LINK_CLASS = `sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[130] focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-xl focus:border focus:border-ui-border focus:bg-ui-card focus:px-4 focus:text-sm focus:font-medium focus:text-ui-text ${focusVisibleOutlineClass}`;
/** Tablet range (md up to below lg, the Tailwind breakpoint thresholds), where the default is the icon rail. */
const TABLET_VIEWPORT_QUERY = '(width >= 48rem) and (width < 64rem)';

/** Reads the saved collapse choice; null until the user toggled once, so the viewport default applies. */
function readSavedCollapsedPreference(): boolean | null {
  const saved = readStorage('local', PREF_SIDEBAR_COLLAPSED_KEY);

  if (saved === 'true' || saved === 'false') {
    return saved === 'true';
  }

  return null;
}

/** Subscribes to the tablet range media query for `useSyncExternalStore`. */
function subscribeToTabletViewport(onChange: () => void): () => void {
  const query = globalThis.matchMedia(TABLET_VIEWPORT_QUERY);
  query.addEventListener('change', onChange);

  return () => {
    query.removeEventListener('change', onChange);
  };
}

function isTabletViewport(): boolean {
  return globalThis.matchMedia(TABLET_VIEWPORT_QUERY).matches;
}

/** Collapsed state: a saved preference wins, otherwise the tablet range defaults to the icon rail. */
function useSidebarCollapsed() {
  const [savedPreference, setSavedPreference] = useState(readSavedCollapsedPreference);
  const tabletDefault = useSyncExternalStore(subscribeToTabletViewport, isTabletViewport);
  const collapsed = savedPreference ?? tabletDefault;

  const toggleCollapse = useCallback(() => {
    const next = !collapsed;
    writeStorage('local', PREF_SIDEBAR_COLLAPSED_KEY, String(next));
    setSavedPreference(next);
  }, [collapsed]);

  return { collapsed, toggleCollapse };
}

export const SidebarLayout = memo(function SidebarLayout({ children, navItems }: SidebarLayoutProps) {
  const { t: translate } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const theme = useThemeStore((state) => state.theme);
  const profile = useSidebarProfile();
  const mobileDrawerId = useId();
  const desktopSidebarId = useId();

  const { collapsed, toggleCollapse } = useSidebarCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const handleLogout = useCallback(async () => {
    await authService.logout();
    void navigate(APP_ROUTE_PATHS.login);
  }, [navigate]);

  const requestLogout = useCallback(() => {
    void handleLogout();
  }, [handleLogout]);

  // A plain `#main-content` link would write the hash into the router's URL, so the link moves focus itself.
  const skipToContent = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    mainRef.current?.focus();
  }, []);

  const toggleMobile = useCallback(() => {
    setMobileOpen((previous) => !previous);
  }, []);
  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const logoSrc = theme === 'dark' ? '/AppLogoFrameWhite.webp' : '/AppLogoFrameBlack.webp';

  const sidebarContent = (
    <SidebarContent
      collapsed={collapsed}
      collapseControlsId={desktopSidebarId}
      logoSrc={logoSrc}
      navItems={navItems}
      profile={profile}
      canShowAdminNav={Boolean(user?.isAdmin)}
      onCloseMobile={closeMobile}
      onToggleCollapse={toggleCollapse}
      onLogout={requestLogout}
    />
  );

  return (
    <div className="relative flex h-screen h-dvh overflow-hidden bg-ui-surface">
      <a href={`#${MAIN_CONTENT_ID}`} onClick={skipToContent} className={SKIP_LINK_CLASS}>
        {translate('layout.skipToContent')}
      </a>

      <div
        aria-hidden="true"
        className="arsm-shell-ambient pointer-events-none absolute inset-0"
      />

      {mobileOpen && (
        <button
          type="button"
          aria-label={translate('sidebar.closeOverlay')}
          className="arsm-mobile-overlay fixed inset-0 z-40 md:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        id={mobileDrawerId}
        inert={!mobileOpen}
        aria-hidden={mobileOpen ? undefined : true}
        className={`fixed inset-y-0 left-0 z-50 w-[calc(100vw-1rem)] max-w-72 border-r border-ui-border bg-arsm-input transform transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] will-change-transform motion-reduce:transition-none dark:bg-arsm-card-dark md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {sidebarContent}
      </aside>

      <aside
        id={desktopSidebarId}
        className={`hidden overflow-hidden border-r border-ui-border bg-arsm-input transition-[width] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] will-change-[width] motion-reduce:transition-none dark:bg-arsm-card-dark md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:flex-col ${collapsed ? 'md:w-[68px]' : 'md:w-64'}`}
      >
        {sidebarContent}
      </aside>

      <div className={`flex min-h-0 min-w-0 flex-1 flex-col transition-[padding-left] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] motion-reduce:transition-none ${collapsed ? 'md:pl-[68px]' : 'md:pl-64'}`}>
        <header className="flex h-[73px] shrink-0 items-center justify-between border-b border-ui-border bg-arsm-input/90 px-4 backdrop-blur-xl dark:bg-arsm-card-dark/85">
          <button
            type="button"
            onClick={toggleMobile}
            title={translate('sidebar.openMenu')}
            aria-label={translate('sidebar.openMenu')}
            aria-expanded={mobileOpen}
            aria-controls={mobileDrawerId}
            className={`${sidebarShellIconButtonClass} md:hidden`}
          >
            <Menu className={largeIconClass} />
          </button>

          <div className="flex-1" />

          <ThemeLanguageControls className="flex items-center gap-1.5 sm:gap-3" />
        </header>

        <main
          ref={mainRef}
          id={MAIN_CONTENT_ID}
          tabIndex={-1}
          className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain focus:outline-none"
        >
          {children}
        </main>
      </div>
    </div>
  );
});
