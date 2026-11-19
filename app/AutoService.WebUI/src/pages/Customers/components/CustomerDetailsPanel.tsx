import { memo } from 'react';
import type { TFunction } from 'i18next';
import type { CustomerListItem, VehicleDetailDto } from '../../../types/customers/customers.types';
import type { CustomerHistoryState } from './customerListSection.types';
import { CustomerRepairHistory, VehicleRepairHistory } from './RepairHistorySections';

/** Details panel target with the customer and, for a vehicle target, the vehicle already looked up. */
export type ResolvedCustomerDetailsPanelTarget =
  | { readonly kind: 'customer'; readonly customer: CustomerListItem }
  | { readonly kind: 'vehicle'; readonly customer: CustomerListItem; readonly vehicle: VehicleDetailDto };

interface CustomerDetailsPanelProps {
  readonly target: ResolvedCustomerDetailsPanelTarget;
  readonly locale: string;
  readonly history: CustomerHistoryState;
  readonly t: TFunction;
}

/** Displays selected customer or vehicle context with its lazily read repair history. */
export const CustomerDetailsPanel = memo(function CustomerDetailsPanel({
  target,
  locale,
  history,
  t,
}: CustomerDetailsPanelProps) {
  const { customer } = target;

  return (
    <section aria-label={t('customers.detailsPanelTitle')} className="min-w-0">
      {/* On a phone the history grows with the page: a nested scroll box there clips its end and traps the swipe. */}
      <div className="arsm-scroll-no-bar min-w-0 sm:max-h-[30rem] sm:overflow-y-auto">
        <div className="min-w-0 space-y-3">
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
        </div>
      </div>
    </section>
  );
});
