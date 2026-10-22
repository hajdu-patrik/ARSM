/** Sidebar chrome and navigation content for authenticated layouts. */
import { memo, type ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation } from 'react-router';
import { CalendarDays, ChevronsLeft, FileText, LogOut, Package, Settings, Shield, TrendingUp, Users } from 'lucide-react';
import { APP_ROUTE_PATHS } from '../../router/appRoutes';
import {
  compactListPrimaryTextClass,
  compactListSecondaryTextClass,
  largeIconClass,
  rowHoverMotionClass,
  sidebarIconSlotClass,
} from '../../utils/formStyles';

/** One sidebar navigation entry: stable key, translated label key, icon and target path. */
export interface NavItem {
  readonly key: string;
  readonly labelKey: string;
  readonly icon: ComponentType<{ className?: string }>;
  readonly path: string;
}

/** What the sidebar shows about the signed-in person: avatar (picture or initials), name and email. */
export interface SidebarProfileViewModel {
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
  /** Id of the sidebar region that the collapse toggle collapses and expands (`aria-controls`). */
  readonly collapseControlsId: string;
  readonly logoSrc: string;
  readonly navItems?: readonly NavItem[] | undefined;
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
  { key: 'scheduler', labelKey: 'nav.scheduler', icon: CalendarDays, path: APP_ROUTE_PATHS.schedulerAlias },
  { key: 'customers', labelKey: 'nav.customers', icon: Users, path: APP_ROUTE_PATHS.customers },
  { key: 'quotes', labelKey: 'nav.quotes', icon: FileText, path: APP_ROUTE_PATHS.quotes },
  { key: 'inventory', labelKey: 'nav.inventory', icon: Package, path: APP_ROUTE_PATHS.inventory },
  { key: 'company-results', labelKey: 'nav.companyResults', icon: TrendingUp, path: APP_ROUTE_PATHS.companyResults },
];

const ADMIN_NAV_ITEM: NavItem = { key: 'admin', labelKey: 'nav.admin', icon: Shield, path: APP_ROUTE_PATHS.adminRegister };
const SETTINGS_NAV_ITEM: NavItem = { key: 'settings', labelKey: 'nav.settings', icon: Settings, path: APP_ROUTE_PATHS.settings };
const TEXT_CLIP_TRANSITION = 'overflow-hidden transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]';
const TEXT_TRANSITION = `${TEXT_CLIP_TRANSITION} whitespace-nowrap`;
/** Wrapping label box: its own max width (the 180px of `collapsedText`) keeps line breaks
 * independent of the animated clip box. */
const WRAPPING_LABEL_CLASS = 'block w-max max-w-[180px] text-left';
const SIDEBAR_ICON_MOTION_CLASS = 'transition-[color,transform] duration-150 ease-out hover:scale-105 motion-reduce:transform-none motion-reduce:transition-colors';
const NAV_LINK_BASE_CLASS = `group flex min-h-11 min-w-0 items-center rounded-xl border text-sm font-medium ${rowHoverMotionClass}`;
const NAV_LINK_ACTIVE_CLASS = 'border-arsm-accent/40 bg-ui-toggle text-arsm-primary dark:border-arsm-accent-dark/50 dark:text-arsm-hover';
const NAV_LINK_IDLE_CLASS = 'border-transparent text-ui-label hover:border-ui-border hover:bg-arsm-accent-subtle hover:-translate-y-px active:translate-y-0 dark:hover:bg-arsm-hover-dark';
const SIDEBAR_ACTION_ROW_CLASS = `flex min-h-11 w-full min-w-0 items-center rounded-xl border border-transparent text-ui-label hover:-translate-y-px hover:border-ui-border hover:bg-arsm-accent-subtle active:translate-y-0 dark:hover:bg-arsm-hover-dark ${rowHoverMotionClass}`;
const SIDEBAR_DANGER_ACTION_ROW_CLASS = `flex min-h-11 w-full min-w-0 items-center rounded-xl border border-transparent text-arsm-error-active hover:-translate-y-px hover:border-arsm-error-border-light hover:bg-ui-error-bg active:translate-y-0 dark:text-arsm-error-soft dark:hover:border-arsm-error-dark ${rowHoverMotionClass}`;
const SIDEBAR_COLLAPSED_ACTION_CLASS = `flex min-h-11 w-full min-w-0 items-center rounded-xl border border-transparent text-ui-label hover:text-arsm-accent-deep dark:hover:text-arsm-primary-dark ${SIDEBAR_ICON_MOTION_CLASS}`;
const SIDEBAR_COLLAPSED_DANGER_ACTION_CLASS = `flex min-h-11 w-full min-w-0 items-center rounded-xl border border-transparent text-arsm-error-active hover:text-arsm-error-text dark:text-arsm-error-soft dark:hover:text-arsm-error-text-light ${SIDEBAR_ICON_MOTION_CLASS}`;

/** Keeps scheduler aliases highlighted with the scheduler nav item. */
function isSidebarNavItemActive(item: NavItem, pathname: string, isActiveRoute: boolean): boolean {
  return isActiveRoute
    || (item.key === 'scheduler' && (
      pathname === APP_ROUTE_PATHS.scheduler
      || pathname === APP_ROUTE_PATHS.schedulerAlias
      || pathname === APP_ROUTE_PATHS.dashboardAlias
    ));
}

function getSidebarNavLinkClassName(item: NavItem, pathname: string, isActiveRoute: boolean): string {
  const stateClass = isSidebarNavItemActive(item, pathname, isActiveRoute)
    ? NAV_LINK_ACTIVE_CLASS
    : NAV_LINK_IDLE_CLASS;

  return `${NAV_LINK_BASE_CLASS} ${stateClass}`;
}

/** One navigation link with its icon slot and the label that clips away when collapsed. */
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

/** Avatar (picture or initials) beside the signed-in person's name and email. */
const SidebarProfileSummary = memo(function SidebarProfileSummary({ collapsedText, profile }: SidebarProfileSummaryProps) {
  const { t: translate } = useTranslation();

  return (
    <div className="flex min-w-0 items-center">
      <span className={`${sidebarIconSlotClass} select-none pointer-events-none`}>
        {profile.showProfilePicture ? (
          <img
            src={profile.profilePictureUrl}
            alt={translate('settings.profilePicture')}
            className="h-8 w-8 rounded-full border-2 border-arsm-accent/40 object-cover outline-2 outline-ui-accent/15 dark:border-arsm-accent-dark/50"
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

/** Sidebar body: logo, navigation, collapse toggle, profile summary, admin/settings links and logout. */
export const SidebarContent = memo(function SidebarContent({
  collapsed,
  collapseControlsId,
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
      <div className="flex min-w-0 h-[73px] items-center border-b border-ui-border px-2">
        <span className={sidebarIconSlotClass}>
          <img
            src={logoSrc}
            alt={translate('login.logoAlt')}
            width={789}
            height={662}
            className="h-8 w-8 select-none object-contain pointer-events-none"
          />
        </span>
        <span className={`${TEXT_TRANSITION} ${collapsedText} truncate text-lg font-bold text-ui-text`}>ARSM</span>
      </div>

      <nav aria-label={translate('nav.main')} className="flex-1 space-y-1 px-2 py-3">{navItems.map(renderNavLink)}</nav>

      <div className="hidden px-2 py-1 md:block">
        <button
          type="button"
          onClick={onToggleCollapse}
          title={collapsed ? translate('sidebar.expand') : translate('sidebar.collapse')}
          aria-label={collapsed ? translate('sidebar.expand') : translate('sidebar.collapse')}
          aria-expanded={!collapsed}
          aria-controls={collapseControlsId}
          className={collapsed ? SIDEBAR_COLLAPSED_ACTION_CLASS : SIDEBAR_ACTION_ROW_CLASS}
        >
          <span className={sidebarIconSlotClass}>
            <ChevronsLeft className={`${largeIconClass} transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${collapsed ? 'rotate-180' : ''}`} />
          </span>
          <span className={`${TEXT_CLIP_TRANSITION} ${collapsedText} text-sm font-medium`}>
            <span className={WRAPPING_LABEL_CLASS}>{translate('sidebar.collapse')}</span>
          </span>
        </button>
      </div>

      <div className="space-y-1 border-t border-ui-border px-2 py-3">
        <SidebarProfileSummary collapsedText={collapsedText} profile={profile} />

        {canShowAdminNav && renderNavLink(ADMIN_NAV_ITEM)}
        {renderNavLink(SETTINGS_NAV_ITEM)}

        <button
          type="button"
          onClick={onLogout}
          title={translate('layout.logout')}
          aria-label={translate('layout.logout')}
          className={collapsed ? SIDEBAR_COLLAPSED_DANGER_ACTION_CLASS : SIDEBAR_DANGER_ACTION_ROW_CLASS}
        >
          <span className={sidebarIconSlotClass}>
            <LogOut className={largeIconClass} />
          </span>
          <span className={`${TEXT_TRANSITION} ${collapsedText} truncate text-sm font-medium`}>{translate('layout.logout')}</span>
        </button>
      </div>
    </div>
  );
});
