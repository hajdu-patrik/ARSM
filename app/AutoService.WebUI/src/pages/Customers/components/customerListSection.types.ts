/**
 * Grouped customer-list props shared by the list and card components.
 * @module pages/Customers/components/customerListSection.types
 */

import type { AppointmentDto } from '../../../types/scheduler/scheduler.types';
import type { CustomerListItem, VehicleDetailDto } from '../../../types/customers/customers.types';
import type { SortDirection } from '../page.types';
import type { ResolvedCustomerDetailsPanelTarget } from './CustomerDetailsPanel';

export interface CustomerListData {
  readonly searchTerm: string;
  readonly filteredCustomers: CustomerListItem[];
  readonly isLoadingCustomers: boolean;
  readonly expandedCustomerIds: Set<number>;
  readonly vehiclesByCustomerId: Record<number, VehicleDetailDto[]>;
  readonly isLoadingVehiclesByCustomerId: Record<number, boolean>;
  readonly resolvedDetailsTarget: ResolvedCustomerDetailsPanelTarget | null;
  readonly locale: string;
}

export interface CustomerListActions {
  readonly onToggleCustomerExpanded: (customerId: number) => void;
  readonly onOpenCustomerDetails: (customerId: number) => void;
  readonly onOpenEditCustomerModal: (customer: CustomerListItem) => void;
  readonly onOpenDeleteCustomerModal: (customer: CustomerListItem) => void;
  readonly onOpenCreateVehicleModal: (customerId: number) => void;
  readonly onOpenEditVehicleModal: (customerId: number, vehicle: VehicleDetailDto) => void;
  readonly onOpenDeleteVehicleModal: (customerId: number, vehicle: VehicleDetailDto) => void;
  readonly onOpenVehicleDetails: (customerId: number, vehicleId: number) => void;
}

export interface CustomerHistoryState {
  readonly customerHistoryByCustomerId: Record<number, AppointmentDto[]>;
  readonly isLoadingCustomerHistoryByCustomerId: Record<number, boolean>;
  readonly customerHistorySortByCustomerId: Record<number, SortDirection>;
  readonly vehicleHistoryByVehicleId: Record<number, AppointmentDto[]>;
  readonly isLoadingVehicleHistoryByVehicleId: Record<number, boolean>;
  readonly vehicleHistorySortByVehicleId: Record<number, SortDirection>;
  readonly onToggleCustomerHistorySort: (customerId: number) => void;
  readonly onToggleVehicleHistorySort: (vehicleId: number) => void;
  readonly onOpenHistoryAppointment: (appointment: AppointmentDto) => void;
}
