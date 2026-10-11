/** Grouped customer-list props shared by the list and card components. */

import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import type { CustomerListItem, VehicleDetailDto } from '../../../types/customers/customers.types';
import type { CustomerDetailsPanelTarget } from '../hooks/useCustomerDetailsPanel';
import type { SortDirection } from '../page.types';

/** Read-side list state: the filtered customers, expansion and the details panel target. */
export interface CustomerListData {
  readonly searchTerm: string;
  readonly filteredCustomers: CustomerListItem[];
  readonly isLoadingCustomers: boolean;
  readonly expandedCustomerIds: Set<number>;
  readonly detailsTarget: CustomerDetailsPanelTarget | null;
  readonly locale: string;
}

/** Customer and vehicle row callbacks: expansion, details, modals and quote creation. */
export interface CustomerListActions {
  readonly onToggleCustomerExpanded: (customerId: number) => void;
  readonly onOpenCustomerDetails: (customerId: number) => void;
  readonly onOpenEditCustomerModal: (customer: CustomerListItem) => void;
  readonly onOpenDeleteCustomerModal: (customer: CustomerListItem) => void;
  readonly onOpenCreateVehicleModal: (customerId: number) => void;
  readonly onOpenEditVehicleModal: (customerId: number, vehicle: VehicleDetailDto) => void;
  readonly onOpenDeleteVehicleModal: (customerId: number, vehicle: VehicleDetailDto) => void;
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
