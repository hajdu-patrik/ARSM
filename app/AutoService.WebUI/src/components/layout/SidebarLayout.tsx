import { memo, useCallback, useEffect, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronsLeft, LogOut, Menu, Settings, Shield, Users } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';
import { authService } from '../../services/auth/auth.service';
import { profileService } from '../../services/profile/profile.service';
import {
  PROFILE_PICTURE_UPDATED_EVENT,
  startProfilePictureLiveUpdates,
} from '../../services/profile/profile-picture-live.service';
import { ThemeLanguageControls } from './ThemeLanguageControls';
import { getAvatarInitials, getDeterministicAvatarColor } from '../../utils/avatar';
import { sidebarIconSlotClass } from '../../utils/formStyles';

interface NavItem {
  key: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { key: 'scheduler', labelKey: 'nav.scheduler', icon: CalendarDays, path: '/scheduler' },
  { key: 'customers', labelKey: 'nav.customers', icon: Users, path: '/customers' },
];

const ADMIN_NAV_ITEM: NavItem = { key: 'admin', labelKey: 'nav.admin', icon: Shield, path: '/admin/register' };
const SETTINGS_NAV_ITEM: NavItem = { key: 'settings', labelKey: 'nav.settings', icon: Settings, path: '/settings' };

interface SidebarLayoutProps {
  readonly children: React.ReactNode;
  readonly navItems?: NavItem[];
}

const COLLAPSED_KEY = 'preferred-sidebar-collapsed';
const TEXT_TRANSITION = 'overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]';

const SidebarLayoutComponent = memo(function SidebarLayout({ children, navItems = DEFAULT_NAV_ITEMS }: SidebarLayoutProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const theme = useThemeStore((state) => state.theme);

  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === 'true');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profilePersonId, setProfilePersonId] = useState<number | null>(user?.personId ?? null);
  const [profileFirstName, setProfileFirstName] = useState<string | null>(null);
  const [profileLastName, setProfileLastName] = useState<string | null>(null);
  const [profileEmail, setProfileEmail] = useState<string | null>(null);
  const [hasProfilePicture, setHasProfilePicture] = useState(false);
  const [avatarCacheBuster, setAvatarCacheBuster] = useState(0);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    let isCancelled = false;

    const loadProfileForAvatar = async () => {
      await Promise.resolve();

      if (isCancelled) {
        return;
      }

      if (!user) {
        setProfilePersonId(null);
        setProfileFirstName(null);
        setProfileLastName(null);
        setProfileEmail(null);
        setHasProfilePicture(false);
        setAvatarCacheBuster(0);
        setAvatarLoadFailed(false);
        return;
      }

      setProfilePersonId(user.personId);
      setProfileFirstName(null);
      setProfileLastName(null);
      setProfileEmail(null);
      setHasProfilePicture(false);
      setAvatarLoadFailed(false);
      setAvatarCacheBuster(Date.now());

      try {
        const profile = await profileService.getProfile();
        if (isCancelled) {
          return;
        }

        setProfilePersonId(profile.personId);
        setProfileFirstName(profile.firstName ?? null);
        setProfileLastName(profile.lastName ?? null);
        setProfileEmail(profile.email);
        setHasProfilePicture(profile.hasProfilePicture);
        setAvatarLoadFailed(false);
        setAvatarCacheBuster(Date.now());
      } catch {
        // Keep prior state on transient profile fetch failures.
      }
    };

    void loadProfileForAvatar();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  useEffect(() => {
    const stopLiveUpdates = startProfilePictureLiveUpdates();
    return () => {
      stopLiveUpdates();
    };
  }, []);

  useEffect(() => {
    const onProfilePictureUpdated = (event: Event) => {
      const custom = event as CustomEvent<{ personId?: number; hasProfilePicture?: boolean; cacheBuster?: number }>;
      const currentPersonId = profilePersonId ?? user?.personId;
      if (typeof custom.detail?.personId !== 'number' || custom.detail.personId !== currentPersonId) {
        return;
      }

      setHasProfilePicture(custom.detail?.hasProfilePicture ?? hasProfilePicture);
      setAvatarCacheBuster(custom.detail?.cacheBuster ?? Date.now());
      setAvatarLoadFailed(false);
    };

    globalThis.addEventListener(PROFILE_PICTURE_UPDATED_EVENT, onProfilePictureUpdated);
    return () => {
      globalThis.removeEventListener(PROFILE_PICTURE_UPDATED_EVENT, onProfilePictureUpdated);
    };
  }, [hasProfilePicture, profilePersonId, user?.personId]);

  const handleLogout = useCallback(async () => {
    await authService.logout();
    navigate('/login');
  }, [navigate]);

  const toggleCollapse = useCallback(() => setCollapsed((prev) => !prev), []);
  const toggleMobile = useCallback(() => setMobileOpen((prev) => !prev), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const initials = getAvatarInitials(profileFirstName, profileLastName, profileEmail);
  const fallbackAvatarColorClass = getDeterministicAvatarColor(profilePersonId ?? user?.personId ?? profileEmail);
  const showProfilePicture = hasProfilePicture && !avatarLoadFailed;
  const profilePictureUrl = `${profileService.getProfilePictureUrl()}?pid=${profilePersonId ?? 'me'}&v=${avatarCacheBuster}`;
  const logoSrc = theme === 'dark' ? '/AppLogoFrameWhite.webp' : '/AppLogoFrameBlack.webp';
  const collapsedText = collapsed ? 'md:max-w-0 md:opacity-0' : 'md:max-w-[180px] md:opacity-100';

  const renderNavLink = (item: NavItem) => {
    const Icon = item.icon;

    return (
      <NavLink
        key={item.key}
        to={item.path}
        onClick={closeMobile}
        className={({ isActive }) => {
          const isSchedulerRoute =
            item.key === 'scheduler'
            && (location.pathname === '/' || location.pathname === '/scheduler' || location.pathname === '/dashboard');
          const active = isActive || isSchedulerRoute;

          return `group flex items-center rounded-xl border text-sm font-medium transition-all duration-200 ${
            active
              ? 'border-arsm-accent/40 bg-arsm-toggle-bg text-arsm-primary dark:border-arsm-accent-dark/50 dark:bg-arsm-toggle-bg-dark dark:text-arsm-hover'
              : 'border-transparent text-arsm-label dark:text-arsm-label-dark hover:border-arsm-border hover:bg-arsm-accent-subtle hover:-translate-y-px dark:hover:border-arsm-border-dark dark:hover:bg-arsm-hover-dark'
          }`;
        }}
        title={collapsed ? t(item.labelKey) : undefined}
      >
        <span className={sidebarIconSlotClass}>
          <Icon className="h-5 w-5" />
        </span>
        <span className={`${TEXT_TRANSITION} ${collapsedText}`}>{t(item.labelKey)}</span>
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-[73px] items-center border-b border-arsm-border bg-[linear-gradient(180deg,rgba(255,255,255,0.6)_0%,rgba(255,255,255,0)_100%)] px-2 dark:border-arsm-border-dark dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0)_100%)]">
        <span className={sidebarIconSlotClass}>
          <img src={logoSrc} alt="AutoService" className="h-8 w-8 select-none object-contain pointer-events-none" />
        </span>
        <span className={`${TEXT_TRANSITION} ${collapsedText} text-lg font-bold text-arsm-primary dark:text-arsm-primary-dark`}>ARSM</span>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3">{navItems.map(renderNavLink)}</nav>

      <div className="hidden px-2 py-1 md:block">
        <button
          type="button"
          onClick={toggleCollapse}
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          aria-label={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          className="flex w-full items-center rounded-xl border border-transparent text-arsm-label transition-colors duration-200 hover:border-arsm-border hover:bg-arsm-accent-subtle dark:text-arsm-label-dark dark:hover:border-arsm-border-dark dark:hover:bg-arsm-hover-dark"
        >
          <span className={sidebarIconSlotClass}>
            <ChevronsLeft className={`h-5 w-5 transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${collapsed ? 'rotate-180' : ''}`} />
          </span>
          <span className={`${TEXT_TRANSITION} ${collapsedText} text-sm font-medium`}>{t('sidebar.collapse')}</span>
        </button>
      </div>

      <div className="space-y-1 border-t border-arsm-border bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.42)_100%)] px-2 py-3 dark:border-arsm-border-dark dark:bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.03)_100%)]">
        <div className="flex items-center">
          <span className={`${sidebarIconSlotClass} select-none pointer-events-none`}>
            {showProfilePicture ? (
              <img
                src={profilePictureUrl}
                alt={t('settings.profilePictureAlt')}
                className="h-8 w-8 rounded-full border-2 border-arsm-accent/40 object-cover ring-2 ring-arsm-accent/15 dark:border-arsm-accent-dark/50 dark:ring-arsm-accent-dark/15"
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${fallbackAvatarColorClass}`}>
                {initials}
              </div>
            )}
          </span>
          <div className={`${TEXT_TRANSITION} ${collapsedText} min-w-0`}>
            {profileFirstName && profileLastName && (
              <p className="truncate text-sm font-medium text-arsm-primary dark:text-arsm-primary-dark">
                {profileFirstName} {profileLastName}
              </p>
            )}
            {profileEmail && <p className="truncate text-xs text-arsm-label dark:text-arsm-label-dark">{profileEmail}</p>}
          </div>
        </div>

        {user?.isAdmin && renderNavLink(ADMIN_NAV_ITEM)}
        {renderNavLink(SETTINGS_NAV_ITEM)}

        <button
          type="button"
          onClick={() => {
            void handleLogout();
          }}
          title={t('layout.logout')}
          aria-label={t('layout.logout')}
          className="flex w-full items-center rounded-xl border border-transparent text-arsm-error-active transition-colors duration-200 hover:border-arsm-error-border-light hover:bg-arsm-error-bg dark:text-arsm-error-soft dark:hover:border-arsm-error-dark dark:hover:bg-arsm-error-bg-dark"
        >
          <span className={sidebarIconSlotClass}>
            <LogOut className="h-5 w-5" />
          </span>
          <span className={`${TEXT_TRANSITION} ${collapsedText} text-sm font-medium`}>{t('layout.logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative flex h-screen h-dvh overflow-hidden bg-arsm-surface dark:bg-arsm-surface-dark">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_10%_8%,rgba(190,166,250,0.18)_0%,rgba(190,166,250,0)_34%),radial-gradient(circle_at_90%_14%,rgba(229,214,255,0.22)_0%,rgba(229,214,255,0)_38%)] dark:bg-[radial-gradient(circle_at_10%_8%,rgba(142,121,216,0.24)_0%,rgba(142,121,216,0)_36%),radial-gradient(circle_at_90%_14%,rgba(48,42,85,0.34)_0%,rgba(48,42,85,0)_42%)]"
      />

      {mobileOpen && (
        <button
          type="button"
          aria-label={t('sidebar.closeOverlay')}
          className="fixed inset-0 z-40 bg-[radial-gradient(circle_at_30%_20%,rgba(12,14,24,0.36)_0%,rgba(12,14,24,0.62)_52%,rgba(6,8,16,0.76)_100%)] md:hidden"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[calc(100vw-1rem)] max-w-72 border-r border-arsm-border bg-arsm-input transform transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] will-change-transform dark:border-arsm-border-dark dark:bg-arsm-card-dark md:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        {sidebarContent}
      </aside>

      <aside
        className={`hidden overflow-hidden border-r border-arsm-border bg-arsm-input transition-[width] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] will-change-[width] dark:border-arsm-border-dark dark:bg-arsm-card-dark md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:flex-col ${collapsed ? 'md:w-[68px]' : 'md:w-64'}`}
      >
        {sidebarContent}
      </aside>

      <div className={`flex min-h-0 min-w-0 flex-1 flex-col transition-[padding-left] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${collapsed ? 'md:pl-[68px]' : 'md:pl-64'}`}>
        <header className="flex h-[73px] shrink-0 items-center justify-between border-b border-arsm-border bg-arsm-input/90 px-4 backdrop-blur-xl dark:border-arsm-border-dark dark:bg-arsm-card-dark/85">
          <button
            type="button"
            onClick={toggleMobile}
            title={t('sidebar.openMenu')}
            aria-label={t('sidebar.openMenu')}
            className="min-w-[44px] rounded-lg p-2 text-arsm-label transition-colors hover:bg-arsm-accent-subtle hover:text-arsm-accent-deep dark:text-arsm-label-dark dark:hover:bg-arsm-hover-dark dark:hover:text-arsm-primary-dark md:hidden"
          >
            <Menu className="h-5 w-5" />
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
export const SidebarLayout = SidebarLayoutComponent;
