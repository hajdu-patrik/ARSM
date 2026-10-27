import { memo } from 'react';
import type { TFunction } from 'i18next';
import { CarFront, UserRound, X } from 'lucide-react';
import type { CustomerListItem, VehicleDetailDto } from '../../../types/customers/customers.types';
import {
  baseSectionHeadingTextClass,
  defaultIconClass,
  modalConfirmCloseButtonClass,
  mutedMetaTextClass,
  uppercaseMetaLabelTextClass,
} from '../../../utils/formStyles';
import { buildCustomerDisplayName } from '../helpers';
import type { CustomerHistoryState } from './customerListSection.types';
import { CustomerRepairHistory, VehicleRepairHistory } from './RepairHistorySections';
import { VehicleSpecsGrid } from './VehicleSpecsGrid';

/** Details panel target with the customer and, for a vehicle target, the vehicle already looked up. */
export type ResolvedCustomerDetailsPanelTarget =
  | { readonly kind: 'customer'; readonly customer: CustomerListItem }
  | { readonly kind: 'vehicle'; readonly customer: CustomerListItem; readonly vehicle: VehicleDetailDto };

interface CustomerDetailsPanelProps {
  readonly target: ResolvedCustomerDetailsPanelTarget | null;
  readonly locale: string;
  readonly history: CustomerHistoryState;
  readonly t: TFunction;
  readonly onClose?: () => void;
  readonly variant?: 'overlay' | 'inline';
}

/** Displays selected customer or vehicle context with its lazily read repair history. */
export const CustomerDetailsPanel = memo(function CustomerDetailsPanel({
  target,
  locale,
  history,
  t,
  onClose,
  variant = 'overlay',
}: CustomerDetailsPanelProps) {
  if (!target) {
    return null;
  }

  const isInline = variant === 'inline';

  const { customer } = target;

  return (
    <aside
      aria-label={t('customers.detailsPanelTitle')}
      className={isInline
        ? 'min-w-0'
        : 'fixed inset-x-0 bottom-0 z-[90] max-h-[82dvh] min-w-0 overflow-hidden rounded-t-2xl border border-ui-border bg-ui-card lg:sticky lg:top-6 lg:z-auto lg:max-h-[calc(100vh-7rem)] lg:rounded-2xl'}
    >
      {!isInline && (
        <div className="flex min-w-0 items-start justify-between gap-3 border-b border-ui-border px-4 py-3">
          <div className="min-w-0">
            <p className={`flex min-w-0 items-center gap-2 ${uppercaseMetaLabelTextClass}`}>
              {target.kind === 'customer' ? <UserRound className={defaultIconClass} /> : <CarFront className={defaultIconClass} />}
              <span className="min-w-0 [overflow-wrap:anywhere]">
                {target.kind === 'customer' ? t('customers.customerDetailsTitle') : t('common.fields.vehicleDetails')}
              </span>
            </p>
            <h2 className={`mt-1 [overflow-wrap:anywhere] ${baseSectionHeadingTextClass}`}>
              {target.kind === 'customer' ? buildCustomerDisplayName(customer) : target.vehicle.licensePlate}
            </h2>
            <p className={`[overflow-wrap:anywhere] ${mutedMetaTextClass}`}>
              {target.kind === 'customer'
                ? customer.email
                : `${target.vehicle.brand} ${target.vehicle.model} (${String(target.vehicle.year)})`}
            </p>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className={modalConfirmCloseButtonClass}
              aria-label={t('customers.closeDetailsPanel')}
              title={t('customers.closeDetailsPanel')}
            >
              <X className={defaultIconClass} />
            </button>
          )}
        </div>
      )}

      {/* Inline on a phone the history grows with the page: a nested scroll box there clips its end and traps the swipe. */}
      <div className={isInline ? 'arsm-scroll-no-bar min-w-0 sm:max-h-[30rem] sm:overflow-y-auto' : 'arsm-scroll-no-bar max-h-[calc(82dvh-4.5rem)] min-w-0 overflow-y-auto px-4 py-3 lg:max-h-[calc(100vh-12rem)]'}>
        {!isInline && target.kind === 'vehicle' && (
          <VehicleSpecsGrid
            t={t}
            locale={locale}
            vehicle={target.vehicle}
            className="pb-3"
          />
        )}

        <section className={isInline ? 'min-w-0 space-y-3' : 'min-w-0 space-y-3 pt-2'}>
          {target.kind === 'vehicle' ? (
            <VehicleRepairHistory
              t={t}
              locale={locale}
              vehicle={target.vehicle}
              sortDirection={history.vehicleHistorySortByVehicleId[target.vehicle.id] ?? 'asc'}
              onToggleSort={history.onToggleVehicleHistorySort}
              onOpenAppointment={history.onOpenHistoryAppointment}
            />
          ) : (
            <CustomerRepairHistory
              t={t}
              locale={locale}
              customerId={customer.id}
              sortDirection={history.customerHistorySortByCustomerId[customer.id] ?? 'asc'}
              onToggleSort={history.onToggleCustomerHistorySort}
              onOpenAppointment={history.onOpenHistoryAppointment}
            />
          )}
        </section>
      </div>
    </aside>
  );
});
