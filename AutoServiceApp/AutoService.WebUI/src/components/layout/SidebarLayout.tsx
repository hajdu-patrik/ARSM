import { memo, useState, useCallback, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, ChevronsLeft, LogOut, Menu, Package, Settings, Shield, Wrench } from 'lucide-react';
import { useAuthStore } from '../../store/auth.store';
import { useThemeStore } from '../../store/theme.store';
import { authService } from '../../services/auth.service';
import { profileService } from '../../services/profile.service';
import { PROFILE_PICTURE_UPDATED_EVENT, startProfilePictureLiveUpdates } from '../../services/profile-picture-live.service';
import { ThemeLanguageControls } from './ThemeLanguageControls';
import { getAvatarInitials, getDeterministicAvatarColor } from '../../utils/avatar';

interface NavItem {
  key: string;
  labelKey: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const DEFAULT_NAV_ITEMS: NavItem[] = [
  { key: 'scheduler', labelKey: 'nav.scheduler', icon: CalendarDays, path: '/scheduler' },
  { key: 'tools', labelKey: 'nav.tools', icon: Wrench, path: '/tools' },
  { key: 'inventory', labelKey: 'nav.inventory', icon: Package, path: '/inventory' },
];

const ADMIN_NAV_ITEM: NavItem = { key: 'admin', labelKey: 'nav.admin', icon: Shield, path: '/admin/register' };
const SETTINGS_NAV_ITEM: NavItem = { key: 'settings', labelKey: 'nav.settings', icon: Settings, path: '/settings' };

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

/* Shared transition class for text reveal/hide */
const TEXT_TRANSITION = 'overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]';

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
    const stopLiveUpdates = startProfilePictureLiveUpdates();
    return () => {
      stopLiveUpdates();
    };
  }, []);

  useEffect(() => {
    const handleProfilePictureUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ personId?: number; hasProfilePicture?: boolean; cacheBuster?: number }>;
      const currentPersonId = profilePersonId ?? user?.personId;
      if (
        typeof customEvent.detail?.personId === 'number' &&
        typeof currentPersonId === 'number' &&
        customEvent.detail.personId !== currentPersonId
      ) {
        return;
      }

      const nextHasProfilePicture = customEvent.detail?.hasProfilePicture ?? hasProfilePicture;
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

    globalThis.addEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated as EventListener);
    return () => {
      globalThis.removeEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated as EventListener);
    };
  }, [hasProfilePicture, profileFirstName, profileLastName, profilePersonId, user?.email, user?.personId]);

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

  /* Collapsed text class — applied only on md+ to hide text */
  const collapsedText = collapsed ? 'md:max-w-0 md:opacity-0' : 'md:max-w-[180px] md:opacity-100';

  const renderNavLink = (item: NavItem) => {
    const Icon = item.icon;

    return (
      <NavLink
        key={item.key}
        to={item.path}
        onClick={closeMobile}
        className={({ isActive }) =>
          `flex items-center rounded-xl text-sm font-medium transition-colors duration-200 ${
            isActive
              ? 'bg-[#EFEBFA] dark:bg-[#241F33] text-[#2C2440] dark:text-[#F5F2FF]'
              : 'text-[#5E5672] dark:text-[#CFC5EA] hover:bg-[#E6DCF8] dark:hover:bg-[#322B47]'
          }`
        }
        title={collapsed ? t(item.labelKey) : undefined}
      >
        <span className="inline-flex w-[52px] h-10 items-center justify-center flex-shrink-0">
          <Icon className="h-5 w-5" />
        </span>
        <span className={`${TEXT_TRANSITION} ${collapsedText}`}>
          {t(item.labelKey)}
        </span>
      </NavLink>
    );
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex h-[73px] items-center border-b border-[#D8D2E9] dark:border-[#3A3154] px-2">
        <span className="inline-flex w-[52px] h-10 items-center justify-center flex-shrink-0">
          <img
            src={logoSrc}
            alt="AutoService"
            className="h-8 w-8 object-contain select-none pointer-events-none"
          />
        </span>
        <span
          className={`${TEXT_TRANSITION} text-lg font-bold text-[#2C2440] dark:text-[#EDE8FA] ${collapsedText}`}
        >
          ARSM
        </span>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-2 py-3 space-y-1">
        {navItems.map(renderNavLink)}
      </nav>

      {/* Admin nav (admins only) */}
      {user?.isAdmin && (
        <div className="px-2 pb-1">
          {renderNavLink(ADMIN_NAV_ITEM)}
        </div>
      )}

      {/* Collapse toggle (desktop only) */}
      <div className="hidden md:block px-2 py-1">
        <button
          onClick={toggleCollapse}
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          className="flex items-center w-full rounded-xl text-[#5E5672] dark:text-[#CFC5EA] hover:bg-[#E6DCF8] dark:hover:bg-[#322B47] transition-colors duration-200"
        >
          <span className="inline-flex w-[52px] h-10 items-center justify-center flex-shrink-0">
            <ChevronsLeft
              className={`h-5 w-5 transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${collapsed ? 'rotate-180' : ''}`}
            />
          </span>
          <span
            className={`${TEXT_TRANSITION} text-sm font-medium ${collapsedText}`}
          >
            {t('sidebar.collapse')}
          </span>
        </button>
      </div>

      {/* Bottom section: Profile → Settings → Logout */}
      <div className="border-t border-[#D8D2E9] dark:border-[#3A3154] px-2 py-3 space-y-1">
        {/* Profile */}
        <div className="flex items-center ">
          <span className="inline-flex w-[52px] h-10 items-center justify-center flex-shrink-0 select-none pointer-events-none">
            {shouldShowProfilePicture ? (
              <img
                src={profilePictureUrl}
                alt={t('settings.profilePictureAlt')}
                className="w-8 h-8 rounded-full object-cover border border-[#D8D2E9] dark:border-[#3A3154]"
                onError={() => setAvatarLoadFailed(true)}
              />
            ) : (
              <div className={`w-8 h-8 rounded-full text-xs flex items-center justify-center font-bold ${fallbackAvatarColorClass}`}>
                {initials}
              </div>
            )}
          </span>
          <div
            className={`${TEXT_TRANSITION} min-w-0 ${collapsedText}`}
          >
            {profileFirstName && profileLastName && (
              <p className="text-sm font-medium text-[#2C2440] dark:text-[#EDE8FA] truncate">
                {profileFirstName} {profileLastName}
              </p>
            )}
            <p className="text-xs text-[#5E5672] dark:text-[#CFC5EA] truncate">{user?.email}</p>
          </div>
        </div>

        {/* Settings */}
        {renderNavLink(SETTINGS_NAV_ITEM)}

        {/* Logout */}
        <button
          onClick={() => { void handleLogout(); }}
          title={t('layout.logout')}
          className="flex items-center w-full rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
        >
          <span className="inline-flex w-[52px] h-10 items-center justify-center flex-shrink-0">
            <LogOut className="h-5 w-5" />
          </span>
          <span
            className={`${TEXT_TRANSITION} text-sm font-medium ${collapsedText}`}
          >
            {t('layout.logout')}
          </span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#ECECEF] dark:bg-[#09090F]">
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
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#F6F4FB] dark:bg-[#13131B] border-r border-[#D8D2E9] dark:border-[#3A3154] transform transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] will-change-transform md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Sidebar — desktop */}
      <aside
        className={`hidden md:fixed md:inset-y-0 md:left-0 md:z-30 md:flex md:flex-col bg-[#F6F4FB] dark:bg-[#13131B] border-r border-[#D8D2E9] dark:border-[#3A3154] will-change-[width] transition-[width] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] overflow-hidden ${
          collapsed ? 'md:w-[68px]' : 'md:w-64'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main content */}
      <div
        className={`flex-1 min-h-0 flex flex-col min-w-0 transition-[padding-left] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
          collapsed ? 'md:pl-[68px]' : 'md:pl-64'
        }`}
      >
        {/* Top bar */}
        <header className="flex h-[73px] items-center justify-between px-4 bg-[#F6F4FB] dark:bg-[#13131B] border-b border-[#D8D2E9] dark:border-[#3A3154]">
          {/* Mobile hamburger */}
          <button
            onClick={toggleMobile}
            title={t('sidebar.openMenu')}
            className="md:hidden p-2 rounded-lg hover:bg-[#E6DCF8] dark:hover:bg-[#322B47] text-[#5E5672] dark:text-[#CFC5EA] min-w-[44px]"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <ThemeLanguageControls className="flex items-center gap-1.5 sm:gap-3" />
        </header>

        {/* Page content */}
        <main className="flex-1 min-h-0 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
});

SidebarLayoutComponent.displayName = 'SidebarLayout';

export const SidebarLayout = SidebarLayoutComponent;
