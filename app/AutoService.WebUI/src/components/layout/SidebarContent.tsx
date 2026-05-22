/**
 * Sidebar chrome and navigation content for authenticated layouts.
 * @module components/layout/SidebarContent
 */
import { memo, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router-dom';
import { CalendarDays, ChevronsLeft, LogOut, Settings, Shield, Users } from 'lucide-react';
import { compactListPrimaryTextClass, compactListSecondaryTextClass, sidebarIconSlotClass } from '../../utils/formStyles';

export interface NavItem {
  readonly key: string;
  readonly labelKey: string;
  readonly icon: ComponentType<{ className?: string }>;
  readonly path: string;
}

interface SidebarProfileViewModel {
  readonly initials: string;
  readonly fallbackAvatarColorClass: string;
  readonly showProfilePicture: boolean;
  readonly profilePictureUrl: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly email: string | null;
  readonly onAvatarLoadFailed: () => void;
}

interface SidebarContentProps {
  readonly collapsed: boolean;
  readonly logoSrc: string;
  readonly navItems?: readonly NavItem[];
  readonly profile: SidebarProfileViewModel;
  readonly canShowAdminNav: boolean;
  readonly onCloseMobile: () => void;
  readonly onToggleCollapse: () => void;
  readonly onLogout: () => void;
}

interface SidebarNavLinkProps {
  readonly item: NavItem;
  readonly collapsed: boolean;
  readonly collapsedText: string;
  readonly pathname: string;
  readonly onCloseMobile: () => void;
}

interface SidebarProfileSummaryProps {
  readonly collapsedText: string;
  readonly profile: SidebarProfileViewModel;
}

const DEFAULT_NAV_ITEMS: readonly NavItem[] = [
  { key: 'scheduler', labelKey: 'nav.scheduler', icon: CalendarDays, path: '/scheduler' },
  { key: 'customers', labelKey: 'nav.customers', icon: Users, path: '/customers' },
];

const ADMIN_NAV_ITEM: NavItem = { key: 'admin', labelKey: 'nav.admin', icon: Shield, path: '/admin/register' };
const SETTINGS_NAV_ITEM: NavItem = { key: 'settings', labelKey: 'nav.settings', icon: Settings, path: '/settings' };
const TEXT_TRANSITION = 'overflow-hidden whitespace-nowrap transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]';
const NAV_LINK_BASE_CLASS = 'group flex min-h-11 min-w-0 items-center rounded-xl border text-sm font-medium transition-all duration-200';
const NAV_LINK_ACTIVE_CLASS = 'border-arsm-accent/40 bg-arsm-toggle-bg text-arsm-primary dark:border-arsm-accent-dark/50 dark:bg-arsm-toggle-bg-dark dark:text-arsm-hover';
const NAV_LINK_IDLE_CLASS = 'border-transparent text-arsm-label dark:text-arsm-label-dark hover:border-arsm-border hover:bg-arsm-accent-subtle hover:-translate-y-px active:translate-y-0 dark:hover:border-arsm-border-dark dark:hover:bg-arsm-hover-dark';

/** Keeps scheduler aliases highlighted with the scheduler nav item. */
function isSidebarNavItemActive(item: NavItem, pathname: string, isActiveRoute: boolean): boolean {
  return isActiveRoute
    || (item.key === 'scheduler' && (pathname === '/' || pathname === '/scheduler' || pathname === '/dashboard'));
}

function getSidebarNavLinkClassName(item: NavItem, pathname: string, isActiveRoute: boolean): string {
  const stateClass = isSidebarNavItemActive(item, pathname, isActiveRoute)
    ? NAV_LINK_ACTIVE_CLASS
    : NAV_LINK_IDLE_CLASS;

  return `${NAV_LINK_BASE_CLASS} ${stateClass}`;
}

const SidebarNavLink = memo(function SidebarNavLink({
  item,
  collapsed,
  collapsedText,
  pathname,
  onCloseMobile,
}: SidebarNavLinkProps) {
  const { t: translate } = useTranslation();
  const Icon = item.icon;

  return (
    <NavLink
      to={item.path}
      onClick={onCloseMobile}
      className={({ isActive }) => getSidebarNavLinkClassName(item, pathname, isActive)}
      title={collapsed ? translate(item.labelKey) : undefined}
    >
      <span className={sidebarIconSlotClass}>
        <Icon className="h-5 w-5 shrink-0" />
      </span>
      <span className={`${TEXT_TRANSITION} ${collapsedText} truncate`}>{translate(item.labelKey)}</span>
    </NavLink>
  );
});

SidebarNavLink.displayName = 'SidebarNavLink';

const SidebarProfileSummary = memo(function SidebarProfileSummary({ collapsedText, profile }: SidebarProfileSummaryProps) {
  const { t: translate } = useTranslation();

  return (
    <div className="flex min-w-0 items-center">
      <span className={`${sidebarIconSlotClass} select-none pointer-events-none`}>
        {profile.showProfilePicture ? (
          <img
            src={profile.profilePictureUrl}
            alt={translate('settings.profilePictureAlt')}
            className="h-8 w-8 rounded-full border-2 border-arsm-accent/40 object-cover ring-2 ring-arsm-accent/15 dark:border-arsm-accent-dark/50 dark:ring-arsm-accent-dark/15"
            onError={profile.onAvatarLoadFailed}
          />
        ) : (
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${profile.fallbackAvatarColorClass}`}>
            {profile.initials}
          </div>
        )}
      </span>
      <div className={`${TEXT_TRANSITION} ${collapsedText} min-w-0`}>
        {profile.firstName && profile.lastName && (
          <p className={compactListPrimaryTextClass}>
            {profile.firstName} {profile.lastName}
          </p>
        )}
        {profile.email && <p className={compactListSecondaryTextClass}>{profile.email}</p>}
      </div>
    </div>
  );
});

SidebarProfileSummary.displayName = 'SidebarProfileSummary';

const SidebarContentComponent = memo(function SidebarContent({
  collapsed,
  logoSrc,
  navItems = DEFAULT_NAV_ITEMS,
  profile,
  canShowAdminNav,
  onCloseMobile,
  onToggleCollapse,
  onLogout,
}: SidebarContentProps) {
  const { t: translate } = useTranslation();
  const location = useLocation();
  const collapsedText = collapsed ? 'md:max-w-0 md:opacity-0' : 'md:max-w-[180px] md:opacity-100';

  const renderNavLink = (item: NavItem) => (
    <SidebarNavLink
      key={item.key}
      item={item}
      collapsed={collapsed}
      collapsedText={collapsedText}
      pathname={location.pathname}
      onCloseMobile={onCloseMobile}
    />
  );

  return (
    <div className="flex h-full flex-col">
      <div className="arsm-sidebar-top-sheen flex min-w-0 h-[73px] items-center border-b border-arsm-border px-2 dark:border-arsm-border-dark">
        <span className={sidebarIconSlotClass}>
          <img src={logoSrc} alt="AutoService" className="h-8 w-8 select-none object-contain pointer-events-none" />
        </span>
        <span className={`${TEXT_TRANSITION} ${collapsedText} truncate text-lg font-bold text-arsm-primary dark:text-arsm-primary-dark`}>ARSM</span>
      </div>

      <nav className="flex-1 space-y-1 px-2 py-3">{navItems.map(renderNavLink)}</nav>

      <div className="hidden px-2 py-1 md:block">
        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? translate('sidebar.expand') : translate('sidebar.collapse')}
          aria-label={collapsed ? translate('sidebar.expand') : translate('sidebar.collapse')}
          className="flex min-h-11 w-full min-w-0 items-center rounded-xl border border-transparent text-arsm-label transition-all duration-200 hover:-translate-y-px hover:border-arsm-border hover:bg-arsm-accent-subtle active:translate-y-0 dark:text-arsm-label-dark dark:hover:border-arsm-border-dark dark:hover:bg-arsm-hover-dark"
        >
          <span className={sidebarIconSlotClass}>
            <ChevronsLeft className={`h-5 w-5 shrink-0 transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${collapsed ? 'rotate-180' : ''}`} />
          </span>
          <span className={`${TEXT_TRANSITION} ${collapsedText} truncate text-sm font-medium`}>{translate('sidebar.collapse')}</span>
        </button>
      </div>

      <div className="arsm-sidebar-bottom-sheen space-y-1 border-t border-arsm-border px-2 py-3 dark:border-arsm-border-dark">
        <SidebarProfileSummary collapsedText={collapsedText} profile={profile} />

        {canShowAdminNav && renderNavLink(ADMIN_NAV_ITEM)}
        {renderNavLink(SETTINGS_NAV_ITEM)}

        <button
          type="button"
          onClick={onLogout}
          title={translate('layout.logout')}
          aria-label={translate('layout.logout')}
          className="flex min-h-11 w-full min-w-0 items-center rounded-xl border border-transparent text-arsm-error-active transition-all duration-200 hover:-translate-y-px hover:border-arsm-error-border-light hover:bg-arsm-error-bg active:translate-y-0 dark:text-arsm-error-soft dark:hover:border-arsm-error-dark dark:hover:bg-arsm-error-bg-dark"
        >
          <span className={sidebarIconSlotClass}>
            <LogOut className="h-5 w-5 shrink-0" />
          </span>
          <span className={`${TEXT_TRANSITION} ${collapsedText} truncate text-sm font-medium`}>{translate('layout.logout')}</span>
        </button>
      </div>
    </div>
  );
});

SidebarContentComponent.displayName = 'SidebarContent';

export const SidebarContent = SidebarContentComponent;