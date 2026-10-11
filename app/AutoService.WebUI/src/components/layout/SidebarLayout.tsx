/** Authenticated app shell: the collapsible sidebar (a drawer below md), the header with the
 * theme/language controls, and the page. */
import { memo, useCallback, useId, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';
import { authService } from '../../services/auth/auth.service';
import { APP_ROUTE_PATHS } from '../../router/appRoutes';
import { largeIconClass, sidebarShellIconButtonClass } from '../../utils/formStyles';
import { readStorage, writeStorage } from '../../utils/safeStorage';
import { ThemeLanguageControls } from './ThemeLanguageControls';
import { SidebarContent, type NavItem } from './SidebarContent';
import { useSidebarProfile } from './useSidebarProfile';

interface SidebarLayoutProps {
  readonly children: ReactNode;
  readonly navItems?: readonly NavItem[] | undefined;
}

const COLLAPSED_KEY = 'preferred-sidebar-collapsed';
/** Tablet range (md up to below lg, the Tailwind breakpoint thresholds), where the default is the icon rail. */
const TABLET_VIEWPORT_QUERY = '(width >= 48rem) and (width < 64rem)';

/** Reads the saved collapse choice; null until the user toggled once, so the viewport default applies. */
function readSavedCollapsedPreference(): boolean | null {
  const saved = readStorage('local', COLLAPSED_KEY);

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

/** Current snapshot of the tablet range media query. */
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
    writeStorage('local', COLLAPSED_KEY, String(next));
    setSavedPreference(next);
  }, [collapsed]);

  return { collapsed, toggleCollapse };
}

const SidebarLayoutComponent = memo(function SidebarLayout({ children, navItems }: SidebarLayoutProps) {
  const { t: translate } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const theme = useThemeStore((state) => state.theme);
  const profile = useSidebarProfile();
  const mobileDrawerId = useId();
  const desktopSidebarId = useId();

  const { collapsed, toggleCollapse } = useSidebarCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    await authService.logout();
    void navigate(APP_ROUTE_PATHS.login);
  }, [navigate]);

  const requestLogout = useCallback(() => {
    void handleLogout();
  }, [handleLogout]);

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

        <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto overscroll-y-contain">{children}</main>
      </div>
    </div>
  );
});

SidebarLayoutComponent.displayName = 'SidebarLayout';

/** Authenticated page shell with the collapsible sidebar, mobile drawer and header controls. */
export const SidebarLayout = SidebarLayoutComponent;
