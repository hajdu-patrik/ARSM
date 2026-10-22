/** Grouped customer-list props shared by the list and card components. */

import type { RefObject } from 'react';
import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import type { CustomerListItem, VehicleDetailDto } from '../../../types/customers/customers.types';
import type { CustomerDetailsPanelTarget } from '../hooks/useCustomerDetailsPanel';
import type { SortDirection } from '../page.types';

/** Paging of the customer list: the effective page, the fitted page size, the total and the page callback. */
export interface CustomerListPaging {
  readonly page: number;
  readonly pageSize: number;
  readonly totalCount: number;
  readonly isLoading: boolean;
  readonly onPageChange: (page: number) => void;
}

/** Read-side list state: the current page of customers, paging, expansion and the details panel target. */
export interface CustomerListData {
  /** The search term the shown results were fetched for; matches are highlighted with it. */
  readonly searchTerm: string;
  readonly customers: CustomerListItem[];
  readonly listRef: RefObject<HTMLDivElement | null>;
  readonly paging: CustomerListPaging;
  readonly isLoadingCustomers: boolean;
  /** True when the read failed and there is no data to show; the toast already says so. */
  readonly hasLoadFailed: boolean;
  readonly expandedCustomerIds: Set<number>;
  readonly detailsTarget: CustomerDetailsPanelTarget | null;
  readonly locale: string;
}

/** Customer and vehicle row callbacks: expansion, details, modals and quote creation. The two delete callbacks
 * are undefined unless the viewer is an admin, the only role the API lets delete, and their buttons then stay away. */
export interface CustomerListActions {
  readonly onToggleCustomerExpanded: (customerId: number) => void;
  readonly onOpenCustomerDetails: (customerId: number) => void;
  readonly onOpenEditCustomerModal: (customer: CustomerListItem) => void;
  readonly onOpenDeleteCustomerModal: ((customer: CustomerListItem) => void) | undefined;
  readonly onOpenCreateVehicleModal: (customerId: number) => void;
  readonly onOpenEditVehicleModal: (customerId: number, vehicle: VehicleDetailDto) => void;
  readonly onOpenDeleteVehicleModal: ((customerId: number, vehicle: VehicleDetailDto) => void) | undefined;
  readonly onOpenVehicleDetails: (customerId: number, vehicleId: number) => void;
  readonly onCreateQuoteForVehicle: (vehicleId: number) => void;
}

/** Per-customer and per-vehicle history sort directions, their toggles and the appointment opener. */
export interface CustomerHistoryState {
  readonly customerHistorySortByCustomerId: Record<number, SortDirection>;
  readonly vehicleHistorySortByVehicleId: Record<number, SortDirection>;
  readonly onToggleCustomerHistorySort: (customerId: number) => void;
  readonly onToggleVehicleHistorySort: (vehicleId: number) => void;
  readonly onOpenHistoryAppointment: (appointment: AppointmentDto) => void;
}
