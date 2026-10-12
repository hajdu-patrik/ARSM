/** Expanded part of a customer card: the customer's vehicles, read once it mounts, and the inline details panel. */

import { memo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { TFunction } from 'i18next';
import { CarFront, Plus } from 'lucide-react';
import type { CustomerListItem, VehicleDetailDto } from '../../../types/customers/customers.types';
import { Pagination } from '../../../components/common/Pagination';
import { useReadFailureToast } from '../../../hooks/useReadFailureToast';
import { customersQueries } from '../../../services/queries/customers.queries';
import { useAuthQueryScope } from '../../../services/queries/useAuthQueryScope';
import { useToastStore } from '../../../store/toast.store';
import {
  compactChipPrimaryButtonClass,
  compactHeaderRowClass,
  defaultIconClass,
  inlineSectionTitleClass,
  mutedSecondaryTextClass,
  smallIconClass,
} from '../../../utils/formStyles';
import type { CustomerDetailsPanelTarget } from '../hooks/useCustomerDetailsPanel';
import { CustomerDetailsPanel, type ResolvedCustomerDetailsPanelTarget } from './CustomerDetailsPanel';
import { VehicleItem } from './VehicleItem';
import type { CustomerHistoryState, CustomerListActions } from './customerListSection.types';

interface CustomerCardDetailsProps {
  readonly id: string;
  readonly t: TFunction;
  readonly customer: CustomerListItem;
  readonly searchTerm: string;
  readonly detailsTarget: CustomerDetailsPanelTarget | null;
  readonly locale: string;
  readonly actions: CustomerListActions;
  readonly history: CustomerHistoryState;
}

/** Vehicles shown per page inside an expanded customer card. */
const VEHICLES_PAGE_SIZE = 5;

/** Stable empty list for the render before the vehicles read has data. */
const NO_VEHICLES: VehicleDetailDto[] = [];

/** Finds the vehicle the details panel is set to, or null when it shows the customer or the vehicle is gone. */
function findTargetVehicle(
  detailsTarget: CustomerDetailsPanelTarget | null,
  vehicles: VehicleDetailDto[],
): VehicleDetailDto | null {
  if (detailsTarget?.kind !== 'vehicle') {
    return null;
  }

  const { vehicleId } = detailsTarget;
  return vehicles.find((vehicle) => vehicle.id === vehicleId) ?? null;
}

/** Renders the customer's vehicle list beside the inline details panel for the resolved target. */
const CustomerCardDetailsComponent = memo(function CustomerCardDetails({
  id,
  t,
  customer,
  searchTerm,
  detailsTarget,
  locale,
  actions,
  history,
}: CustomerCardDetailsProps) {
  const {
    onOpenCreateVehicleModal,
    onOpenEditVehicleModal,
    onOpenDeleteVehicleModal,
    onOpenVehicleDetails,
    onCreateQuoteForVehicle,
  } = actions;
  const scope = useAuthQueryScope();
  const [requestedPage, setRequestedPage] = useState(1);
  const vehiclesQuery = useQuery(
    customersQueries.vehiclesPage(scope, customer.id, { page: requestedPage, pageSize: VEHICLES_PAGE_SIZE }),
  );
  const showErrorToast = useToastStore((state) => state.showError);
  useReadFailureToast({
    failureMessageKey: vehiclesQuery.isError && vehiclesQuery.data === undefined ? 'customers.errors.vehiclesLoadFailed' : null,
    errorUpdatedAt: vehiclesQuery.errorUpdatedAt,
    isSuccess: vehiclesQuery.isSuccess,
    showErrorToast,
  });

  const vehicles = vehiclesQuery.data?.items ?? NO_VEHICLES;
  const totalVehicles = vehiclesQuery.data?.totalCount ?? 0;
  const lastPage = Math.max(1, Math.ceil(totalVehicles / VEHICLES_PAGE_SIZE));
  // A deleted last vehicle of the last page leaves an empty page: step back to the new last one.
  if (vehiclesQuery.isSuccess && !vehiclesQuery.isPlaceholderData && requestedPage > lastPage) {
    setRequestedPage(lastPage);
  }
  const targetVehicle = findTargetVehicle(detailsTarget, vehicles);
  const panelTarget: ResolvedCustomerDetailsPanelTarget = targetVehicle
    ? { kind: 'vehicle', customer, vehicle: targetVehicle }
    : { kind: 'customer', customer };
  const isLoadingVehicles = vehiclesQuery.isLoading;
  const hasLoadFailed = vehiclesQuery.isError && vehiclesQuery.data === undefined;

  return (
    <div id={id} className="min-w-0 border-t border-ui-border/85 px-4 pb-4 pt-4 sm:px-5">
      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <section className="min-w-0 space-y-3">
          <div className={compactHeaderRowClass}>
            <h3 className={inlineSectionTitleClass}>
              <CarFront className={defaultIconClass} />
              <span className="min-w-0 [overflow-wrap:anywhere]">{t('customers.vehiclesTitle')}</span>
            </h3>
            <button
              type="button"
              onClick={() => {
                onOpenCreateVehicleModal(customer.id);
              }}
              className={`${compactChipPrimaryButtonClass} w-full sm:w-auto`}
            >
              <Plus className={smallIconClass} />
              <span className="min-w-0 whitespace-normal text-center">{t('customers.createVehicle')}</span>
            </button>
          </div>

          {isLoadingVehicles && <p className={`text-center ${mutedSecondaryTextClass}`}>{t('customers.loadingVehicles')}</p>}
          {!isLoadingVehicles && !hasLoadFailed && vehicles.length === 0 && <p className={`text-center ${mutedSecondaryTextClass}`}>{t('customers.emptyVehicles')}</p>}
          {!isLoadingVehicles && vehicles.length > 0 && (
            <div className="min-w-0 divide-y divide-ui-border/80">
              {vehicles.map((vehicle) => (
                <VehicleItem
                  key={vehicle.id}
                  t={t}
                  locale={locale}
                  customerId={customer.id}
                  vehicle={vehicle}
                  searchTerm={searchTerm}
                  onOpenEditVehicleModal={onOpenEditVehicleModal}
                  onOpenDeleteVehicleModal={onOpenDeleteVehicleModal}
                  onOpenVehicleDetails={onOpenVehicleDetails}
                  onCreateQuoteForVehicle={onCreateQuoteForVehicle}
                  isDetailsOpen={targetVehicle?.id === vehicle.id}
                />
              ))}
            </div>
          )}
          <Pagination
            compact
            page={Math.min(requestedPage, lastPage)}
            pageSize={VEHICLES_PAGE_SIZE}
            totalCount={totalVehicles}
            isLoading={vehiclesQuery.isPlaceholderData}
            onPageChange={setRequestedPage}
            testIdPrefix="customer-vehicles-pagination"
          />
        </section>

        <div className="min-w-0 border-t border-ui-border/65 pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <CustomerDetailsPanel
            target={panelTarget}
            variant="inline"
            locale={locale}
            history={history}
            t={t}
          />
        </div>
      </div>
    </div>
  );
});

CustomerCardDetailsComponent.displayName = 'CustomerCardDetails';

export const CustomerCardDetails = CustomerCardDetailsComponent;
