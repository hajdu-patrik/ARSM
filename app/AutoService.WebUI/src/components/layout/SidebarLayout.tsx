import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu } from 'lucide-react';
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
import { SidebarContent, type NavItem } from './SidebarContent';

interface SidebarLayoutProps {
  readonly children: React.ReactNode;
  readonly navItems?: readonly NavItem[];
}

const COLLAPSED_KEY = 'preferred-sidebar-collapsed';

const SidebarLayoutComponent = memo(function SidebarLayout({ children, navItems }: SidebarLayoutProps) {
  const { t: translate } = useTranslation();
  const navigate = useNavigate();
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

  const requestLogout = useCallback(() => {
    void handleLogout();
  }, [handleLogout]);

  const toggleCollapse = useCallback(() => setCollapsed((prev) => !prev), []);
  const toggleMobile = useCallback(() => setMobileOpen((prev) => !prev), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const markAvatarLoadFailed = useCallback(() => setAvatarLoadFailed(true), []);

  const initials = getAvatarInitials(profileFirstName, profileLastName, profileEmail);
  const fallbackAvatarColorClass = getDeterministicAvatarColor(profilePersonId ?? user?.personId ?? profileEmail);
  const showProfilePicture = hasProfilePicture && !avatarLoadFailed;
  const profilePictureUrl = `${profileService.getProfilePictureUrl()}?pid=${profilePersonId ?? 'me'}&v=${avatarCacheBuster}`;
  const logoSrc = theme === 'dark' ? '/AppLogoFrameWhite.webp' : '/AppLogoFrameBlack.webp';

  const profileViewModel = useMemo(() => ({
    initials,
    fallbackAvatarColorClass,
    showProfilePicture,
    profilePictureUrl,
    firstName: profileFirstName,
    lastName: profileLastName,
    email: profileEmail,
    onAvatarLoadFailed: markAvatarLoadFailed,
  }), [
    fallbackAvatarColorClass,
    initials,
    markAvatarLoadFailed,
    profileEmail,
    profileFirstName,
    profileLastName,
    profilePictureUrl,
    showProfilePicture,
  ]);

  const sidebarContent = (
    <SidebarContent
      collapsed={collapsed}
      logoSrc={logoSrc}
      navItems={navItems}
      profile={profileViewModel}
      canShowAdminNav={Boolean(user?.isAdmin)}
      onCloseMobile={closeMobile}
      onToggleCollapse={toggleCollapse}
      onLogout={requestLogout}
    />
  );

  return (
    <div className="relative flex h-screen h-dvh overflow-hidden bg-arsm-surface dark:bg-arsm-surface-dark">
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
            title={translate('sidebar.openMenu')}
            aria-label={translate('sidebar.openMenu')}
            className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2 text-arsm-label transition-colors hover:bg-arsm-accent-subtle hover:text-arsm-accent-deep dark:text-arsm-label-dark dark:hover:bg-arsm-hover-dark dark:hover:text-arsm-primary-dark md:hidden"
          >
            <Menu className="h-5 w-5 shrink-0" />
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
