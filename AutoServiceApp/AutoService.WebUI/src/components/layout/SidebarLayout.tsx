import { memo, useState, useCallback, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';
import { authService } from '../../services/auth.service';
import { profileService } from '../../services/profile.service';
import { ThemeLanguageControls } from './ThemeLanguageControls';
import { getAvatarInitials, getDeterministicAvatarColor } from '../../utils/avatar';

interface NavItem {
  key: string;
  labelKey: string;
  icon: React.ReactNode;
  path: string;
}

const WrenchIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75a4.5 4.5 0 01-4.884 4.484c-1.076-.091-2.264.071-2.95.904l-7.152 8.684a2.548 2.548 0 11-3.586-3.586l8.684-7.152c.833-.686.995-1.874.904-2.95a4.5 4.5 0 016.336-4.486l-3.276 3.276a3.004 3.004 0 002.25 2.25l3.276-3.276c.256.565.398 1.192.398 1.852z" />
  </svg>
);

const CalendarIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
  </svg>
);

const BoxIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
  </svg>
);

const GearIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
  </svg>
);

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { key: 'tools', labelKey: 'nav.tools', icon: <WrenchIcon />, path: '/tools' },
  { key: 'scheduler', labelKey: 'nav.scheduler', icon: <CalendarIcon />, path: '/scheduler' },
  { key: 'inventory', labelKey: 'nav.inventory', icon: <BoxIcon />, path: '/inventory' },
];

const ADMIN_NAV_ITEM: NavItem = { key: 'admin', labelKey: 'nav.admin', icon: <ShieldIcon />, path: '/admin/register' };
const SETTINGS_NAV_ITEM: NavItem = { key: 'settings', labelKey: 'nav.settings', icon: <GearIcon />, path: '/settings' };

interface SidebarLayoutProps {
  readonly children: React.ReactNode;
  readonly navItems?: NavItem[];
}

interface AvatarSnapshot {
  personId: number | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  hasProfilePicture: boolean;
  cacheBuster: number;
}

type SidebarUserIdentity = {
  personId: number;
  email: string;
} | null | undefined;

let latestAvatarSnapshot: AvatarSnapshot | null = null;

function snapshotMatchesUser(snapshot: AvatarSnapshot | null, user: SidebarUserIdentity): boolean {
  if (!snapshot || !user) {
    return false;
  }

  if (snapshot.personId !== null) {
    return snapshot.personId === user.personId;
  }

  return snapshot.email !== null && snapshot.email === user.email;
}

const COLLAPSED_KEY = 'preferred-sidebar-collapsed';

const SidebarLayoutComponent = memo(function SidebarLayout({
  children,
  navItems = DEFAULT_NAV_ITEMS,
}: SidebarLayoutProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const theme = useThemeStore((state) => state.theme);
  const initialSnapshot = snapshotMatchesUser(latestAvatarSnapshot, user) ? latestAvatarSnapshot : null;

  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem(COLLAPSED_KEY) === 'true';
  });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profilePersonId, setProfilePersonId] = useState<number | null>(initialSnapshot?.personId ?? user?.personId ?? null);
  const [profileFirstName, setProfileFirstName] = useState<string | null>(initialSnapshot?.firstName ?? null);
  const [profileLastName, setProfileLastName] = useState<string | null>(initialSnapshot?.lastName ?? null);
  const [hasProfilePicture, setHasProfilePicture] = useState(initialSnapshot?.hasProfilePicture ?? false);
  const [avatarCacheBuster, setAvatarCacheBuster] = useState(initialSnapshot?.cacheBuster ?? 0);
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false);

  useEffect(() => {
    localStorage.setItem(COLLAPSED_KEY, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (!user) {
      return;
    }

    latestAvatarSnapshot = {
      personId: profilePersonId ?? user.personId,
      email: user.email,
      firstName: profileFirstName,
      lastName: profileLastName,
      hasProfilePicture,
      cacheBuster: avatarCacheBuster,
    };
  }, [avatarCacheBuster, hasProfilePicture, profileFirstName, profileLastName, profilePersonId, user]);

  useEffect(() => {
    let isCancelled = false;

    const loadProfileForAvatar = async () => {
      try {
        const profile = await profileService.getProfile();
        if (isCancelled) {
          return;
        }

        setProfilePersonId(profile.personId);
        setProfileFirstName(profile.firstName ?? null);
        setProfileLastName(profile.lastName ?? null);
        setHasProfilePicture(profile.hasProfilePicture);
        latestAvatarSnapshot = {
          personId: profile.personId,
          email: user?.email ?? null,
          firstName: profile.firstName ?? null,
          lastName: profile.lastName ?? null,
          hasProfilePicture: profile.hasProfilePicture,
          cacheBuster: avatarCacheBuster,
        };
      } catch {
        // Keep last known state to avoid avatar flicker on transient fetch failures.
      }
    };

    void loadProfileForAvatar();

    return () => {
      isCancelled = true;
    };
  }, [avatarCacheBuster, user?.email]);

  useEffect(() => {
    const handleProfilePictureUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ hasProfilePicture?: boolean; cacheBuster?: number }>;
      const nextHasProfilePicture = Boolean(customEvent.detail?.hasProfilePicture);
      const nextCacheBuster = customEvent.detail?.cacheBuster ?? Date.now();

      setHasProfilePicture(nextHasProfilePicture);
      setAvatarCacheBuster(nextCacheBuster);
      setAvatarLoadFailed(false);

      latestAvatarSnapshot = {
        personId: profilePersonId,
        email: user?.email ?? null,
        firstName: profileFirstName,
        lastName: profileLastName,
        hasProfilePicture: nextHasProfilePicture,
        cacheBuster: nextCacheBuster,
      };
    };

    globalThis.addEventListener('autoservice:profile-picture-updated', handleProfilePictureUpdated as EventListener);
    return () => {
      globalThis.removeEventListener('autoservice:profile-picture-updated', handleProfilePictureUpdated as EventListener);
    };
  }, [profileFirstName, profileLastName, profilePersonId, user?.email]);

  const handleLogout = useCallback(async () => {
    await authService.logout();
    navigate('/login');
  }, [navigate]);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const toggleMobile = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const initials = getAvatarInitials(profileFirstName, profileLastName, user?.email);
  const fallbackAvatarColorClass = getDeterministicAvatarColor(profilePersonId ?? user?.personId ?? user?.email);
  const shouldShowProfilePicture = hasProfilePicture && !avatarLoadFailed;
  const profilePictureUrl = `${profileService.getProfilePictureUrl()}?v=${avatarCacheBuster}`;
  const logoSrc = theme === 'dark' ? '/AppLogoFrameWhite.webp' : '/AppLogoFrameBlack.webp';

  const renderNavLink = (item: NavItem) => (
    <NavLink
      key={item.key}
      to={item.path}
      onClick={closeMobile}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          isActive
            ? 'bg-[#EFEBFA] dark:bg-[#241F33] text-[#2C2440] dark:text-[#F5F2FF]'
            : 'text-[#5E5672] dark:text-[#CFC5EA] hover:bg-[#E6DCF8] dark:hover:bg-[#322B47]'
        } ${collapsed ? 'md:justify-center' : ''}`
      }
      title={collapsed ? t(item.labelKey) : undefined}
    >
      <span className="inline-flex h-5 w-5 items-center justify-center flex-shrink-0">
        {item.icon}
      </span>
      <span className={collapsed ? 'md:hidden' : ''}>{t(item.labelKey)}</span>
    </NavLink>
  );

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex h-[73px] items-center px-4 border-b border-[#D8D2E9] dark:border-[#3A3154] justify-start gap-3 ${collapsed ? 'md:justify-center md:gap-0' : ''}`}>
        <img
          src={logoSrc}
          alt="AutoService"
          className="h-8 w-10 min-h-8 min-w-10 max-h-8 max-w-10 object-contain flex-shrink-0"
        />
        <span className={`text-lg font-bold text-[#2C2440] dark:text-[#EDE8FA] whitespace-nowrap ${collapsed ? 'md:hidden' : ''}`}>
          ARSM
        </span>
      </div>

      {/* Main nav items */}
      <nav className="flex-1 px-2 py-2 space-y-1">
        {navItems.map(renderNavLink)}
      </nav>

      {/* Admin nav item (visible to admins only) */}
      {user?.isAdmin && (
        <div className="px-2 pb-1">
          {renderNavLink(ADMIN_NAV_ITEM)}
        </div>
      )}

      {/* Collapse toggle (desktop only) */}
      <div className="hidden md:block px-2 py-2">
        <button
          onClick={toggleCollapse}
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          className="flex items-center w-full pl-3.5 py-2 rounded-lg text-[#5E5672] dark:text-[#CFC5EA] hover:bg-[#E6DCF8] dark:hover:bg-[#322B47] transition-colors gap-2"
        >
          <svg className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
          </svg>
          <span className={`text-sm font-medium ${collapsed ? 'md:hidden' : ''}`}>{t('sidebar.collapse')}</span>
        </button>
      </div>

      {/* Bottom section: Profile → Settings → Logout */}
      <div className="border-t border-[#D8D2E9] dark:border-[#3A3154] px-3 py-3 space-y-2">
        {/* 1. Profile */}
        <div className={`flex items-center gap-3 pl-1 ${collapsed ? 'md:justify-center md:gap-0 md:pl-0' : ''}`}>
          {shouldShowProfilePicture ? (
            <img
              src={profilePictureUrl}
              alt={t('settings.profilePictureAlt')}
              className="w-7 h-7 rounded-full object-cover border border-[#D8D2E9] dark:border-[#3A3154] flex-shrink-0"
              onError={() => setAvatarLoadFailed(true)}
            />
          ) : (
            <div className={`w-7 h-7 rounded-full text-xs flex items-center justify-center font-bold flex-shrink-0 ${fallbackAvatarColorClass}`}>
              {initials}
            </div>
          )}
          <div className={`min-w-0 flex-1 ${collapsed ? 'md:hidden' : ''}`}>
            <p className="text-xs text-[#5E5672] dark:text-[#CFC5EA] truncate">{user?.email}</p>
          </div>
        </div>

        {/* 2. Settings */}
        <div className="-mx-1">
          {renderNavLink(SETTINGS_NAV_ITEM)}
        </div>

        {/* 3. Logout */}
        {/* Icon-only: desktop collapsed only */}
        <button
          onClick={() => { void handleLogout(); }}
          title={t('layout.logout')}
          className={`w-full justify-center py-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors hidden ${collapsed ? 'md:flex' : ''}`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>
        {/* Text: mobile always + desktop expanded */}
        <button
          onClick={() => { void handleLogout(); }}
          className={`w-full py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-white text-xs font-medium transition-colors ${collapsed ? 'md:hidden' : ''}`}
        >
          {t('layout.logout')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#ECECEF] dark:bg-[#09090F]">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label={t('sidebar.closeOverlay')}
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar — mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#F6F4FB] dark:bg-[#13131B] border-r border-[#D8D2E9] dark:border-[#3A3154] transform transition-transform duration-200 ease-out md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Sidebar ��� desktop */}
      <aside
        className={`hidden md:flex md:flex-col bg-[#F6F4FB] dark:bg-[#13131B] border-r border-[#D8D2E9] dark:border-[#3A3154] transition-[width] duration-200 ease-out overflow-hidden ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex h-[73px] items-center justify-between px-4 bg-[#F6F4FB] dark:bg-[#13131B] border-b border-[#D8D2E9] dark:border-[#3A3154]">
          {/* Mobile hamburger */}
          <button
            onClick={toggleMobile}
            title={t('sidebar.openMenu')}
            className="md:hidden p-2 rounded-lg hover:bg-[#E6DCF8] dark:hover:bg-[#322B47] text-[#5E5672] dark:text-[#CFC5EA] min-w-[44px]"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>

          <div className="flex-1" />

          <ThemeLanguageControls className="flex items-center gap-1.5 sm:gap-3" />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
});

SidebarLayoutComponent.displayName = 'SidebarLayout';

export const SidebarLayout = SidebarLayoutComponent;
