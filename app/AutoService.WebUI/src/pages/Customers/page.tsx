/**
 * Customers registry page.
 *
 * Provides customer and vehicle CRUD operations together with customer-level
 * and vehicle-level repair history panels.
 * @module pages/Customers/page
 */

import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import {
  ArrowUpDown,
  CarFront,
  ChevronDown,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import { Modal } from '../../components/common/Modal';
import { FormErrorMessage } from '../../components/common/FormErrorMessage';
import { useToastStore } from '../../store/toast.store';
import { customerRegistryService } from '../../services/customers/customer-registry.service';
import {
  extractServerFieldErrors,
  getServerFieldError,
  normalizeServerFieldErrors,
  type ServerFieldErrors,
} from '../../utils/serverValidation';
import { filterNameInput, filterPhoneInput } from '../../utils/validation';
import { buttonClass, cardClass, inputClass, labelClass } from '../../utils/formStyles';
import type {
  CustomerListItem,
  CreateCustomerRequest,
  CreateVehicleRequest,
  UpdateCustomerRequest,
  UpdateVehicleRequest,
  VehicleDetailDto,
} from '../../types/customers/customers.types';
import type { AppointmentDto } from '../../types/scheduler/scheduler.types';

type SortDirection = 'asc' | 'desc';
type CustomerModalMode = 'create' | 'edit';
type VehicleModalMode = 'create' | 'edit';

interface CustomerFormState {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

interface VehicleFormState {
  licensePlate: string;
  brand: string;
  model: string;
  year: string;
  mileageKm: string;
  enginePowerHp: string;
  engineTorqueNm: string;
}

interface DeleteVehicleTarget {
  customerId: number;
  vehicle: VehicleDetailDto;
}

const EMPTY_CUSTOMER_FORM: CustomerFormState = {
  firstName: '',
  middleName: '',
  lastName: '',
  email: '',
  phoneNumber: '',
};

const EMPTY_VEHICLE_FORM: VehicleFormState = {
  licensePlate: '',
  brand: '',
  model: '',
  year: '',
  mileageKm: '',
  enginePowerHp: '',
  engineTorqueNm: '',
};

/**
 * Returns a stable full-name representation used for sorting and display.
 *
 * @param customer Customer row data.
 * @returns Full name in last-first-middle order.
 */
function buildCustomerDisplayName(customer: CustomerListItem): string {
  return [customer.lastName, customer.firstName, customer.middleName]
    .filter((value) => value && value.trim().length > 0)
    .join(' ');
}

/**
 * Removes accents and lowercases input to support accent-insensitive search.
 *
 * @param value Raw input value.
 * @returns Normalized value suitable for contains matching.
 */
function normalizeSearchValue(value: string): string {
  return value
    .normalize('NFD')
    .replaceAll(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Formats a timestamp string to locale-aware date-time text.
 *
 * @param value ISO timestamp.
 * @param locale Current i18n locale.
 * @returns Human-readable date-time text.
 */
function formatDateTime(value: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

/**
 * Maps customer-validation messages to i18n keys.
 *
 * @param message Backend error detail.
 * @returns Customer page i18n key.
 */
function mapCustomerValidationMessageToKey(message: string): string {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes('already exists') && normalized.includes('email')) {
    return 'customers.errors.emailExists';
  }

  if (normalized.includes('already exists') && normalized.includes('phone')) {
    return 'customers.errors.phoneExists';
  }

  if (normalized.includes('email must be a valid email address')) {
    return 'customers.errors.invalidEmail';
  }

  if (normalized.includes('phone number must be a valid european number')) {
    return 'customers.errors.invalidPhone';
  }

  if (normalized.includes('may only contain letters and hyphens')) {
    return 'customers.errors.invalidName';
  }

  if (normalized.includes('required') || normalized.includes('must not be blank')) {
    return 'customers.errors.fieldRequired';
  }

  if (normalized.includes('customer not found')) {
    return 'customers.errors.customerNotFound';
  }

  return 'customers.errors.saveFailed';
}

/**
 * Maps vehicle-validation messages to i18n keys.
 *
 * @param message Backend error detail.
 * @returns Vehicle-related i18n key.
 */
function mapVehicleValidationMessageToKey(message: string): string {
  const normalized = message.trim().toLowerCase();

  if (normalized.includes('license plate format is invalid')) {
    return 'customers.errors.vehicleLicensePlateInvalid';
  }

  if (normalized.includes('vehicle with this license plate already exists')) {
    return 'customers.errors.vehicleLicensePlateExists';
  }

  if (normalized.includes('year must be between')) {
    return 'customers.errors.vehicleYearInvalid';
  }

  if (normalized.includes('must be non-negative')) {
    return 'customers.errors.vehicleNumberInvalid';
  }

  if (normalized.includes('vehicle not found')) {
    return 'customers.errors.vehicleNotFound';
  }

  if (normalized.includes('customer not found')) {
    return 'customers.errors.customerNotFound';
  }

  if (normalized.includes('required') || normalized.includes('must not be blank')) {
    return 'customers.errors.fieldRequired';
  }

  return 'customers.errors.vehicleSaveFailed';
}

/**
 * Status badge style mapper for repair history rows.
 *
 * @param status Appointment status string.
 * @returns Tailwind class name for badge appearance.
 */
function getStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Completed':
      return 'bg-arsm-success-bg text-arsm-success-text dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark';
    case 'Cancelled':
      return 'bg-arsm-error-bg text-arsm-error-text dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light';
    default:
      return 'bg-arsm-warning-bg text-arsm-warning-text dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark';
  }
}

interface RepairHistoryListProps {
  readonly appointments: AppointmentDto[];
  readonly locale: string;
  readonly emptyMessage: string;
}

/** Renders a compact repair-history list. */
const RepairHistoryList = memo(function RepairHistoryList({
  appointments,
  locale,
  emptyMessage,
}: RepairHistoryListProps) {
  const { t } = useTranslation();

  if (appointments.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-arsm-border bg-arsm-input px-4 py-3 text-sm text-arsm-muted dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:text-arsm-muted-dark">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {appointments.map((appointment) => (
        <article
          key={appointment.id}
          className="rounded-xl border border-arsm-border bg-white px-4 py-3 shadow-[0_4px_12px_rgba(28,22,46,0.06)] dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:shadow-[0_4px_12px_rgba(3,5,14,0.24)]"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">
              {formatDateTime(appointment.scheduledDate, locale)}
            </p>
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(appointment.status)}`}>
              {t(`scheduler.status.${appointment.status.toLowerCase()}`)}
            </span>
          </div>

          <p className="mt-2 text-sm text-arsm-label dark:text-arsm-label-dark">{appointment.taskDescription}</p>
          <p className="mt-2 text-xs text-arsm-muted dark:text-arsm-muted-dark">
            {appointment.vehicle.licensePlate} - {appointment.vehicle.brand} {appointment.vehicle.model}
          </p>
        </article>
      ))}
    </div>
  );
});

/**
 * Customers registry page container that coordinates customer and vehicle CRUD,
 * search/sort state, and repair-history panels.
 */
const CustomersPageComponent = memo(function CustomersPage() {
  const { t, i18n } = useTranslation();
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);

  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedCustomerIds, setExpandedCustomerIds] = useState<Set<number>>(new Set());

  const [vehiclesByCustomerId, setVehiclesByCustomerId] = useState<Record<number, VehicleDetailDto[]>>({});
  const [isLoadingVehiclesByCustomerId, setIsLoadingVehiclesByCustomerId] = useState<Record<number, boolean>>({});

  const [customerHistoryByCustomerId, setCustomerHistoryByCustomerId] = useState<Record<number, AppointmentDto[]>>({});
  const [isLoadingCustomerHistoryByCustomerId, setIsLoadingCustomerHistoryByCustomerId] = useState<Record<number, boolean>>({});
  const [customerHistorySortByCustomerId, setCustomerHistorySortByCustomerId] = useState<Record<number, SortDirection>>({});

  const [vehicleHistoryByVehicleId, setVehicleHistoryByVehicleId] = useState<Record<number, AppointmentDto[]>>({});
  const [isLoadingVehicleHistoryByVehicleId, setIsLoadingVehicleHistoryByVehicleId] = useState<Record<number, boolean>>({});
  const [vehicleHistorySortByVehicleId, setVehicleHistorySortByVehicleId] = useState<Record<number, SortDirection>>({});
  const [activeVehicleHistoryByCustomerId, setActiveVehicleHistoryByCustomerId] = useState<Record<number, number | null>>({});

  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerModalMode, setCustomerModalMode] = useState<CustomerModalMode>('create');
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [customerForm, setCustomerForm] = useState<CustomerFormState>(EMPTY_CUSTOMER_FORM);
  const [customerFieldErrors, setCustomerFieldErrors] = useState<ServerFieldErrors>({});
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const [deleteCustomerTarget, setDeleteCustomerTarget] = useState<CustomerListItem | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);

  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [vehicleModalMode, setVehicleModalMode] = useState<VehicleModalMode>('create');
  const [vehicleModalCustomerId, setVehicleModalCustomerId] = useState<number | null>(null);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [vehicleForm, setVehicleForm] = useState<VehicleFormState>(EMPTY_VEHICLE_FORM);
  const [vehicleFieldErrors, setVehicleFieldErrors] = useState<ServerFieldErrors>({});
  const [isSavingVehicle, setIsSavingVehicle] = useState(false);

  const [deleteVehicleTarget, setDeleteVehicleTarget] = useState<DeleteVehicleTarget | null>(null);
  const [isDeletingVehicle, setIsDeletingVehicle] = useState(false);

  const collator = useMemo(() => new Intl.Collator(i18n.language, { sensitivity: 'base' }), [i18n.language]);

  /** Loads all customer rows. */
  const loadCustomers = useCallback(async () => {
    setIsLoadingCustomers(true);

    try {
      const data = await customerRegistryService.listCustomers();
      setCustomers(data);
    } catch {
      showErrorToast('customers.errors.loadFailed');
    } finally {
      setIsLoadingCustomers(false);
    }
  }, [showErrorToast]);

  /** Loads vehicles for a customer with optional cache bypass. */
  const loadVehicles = useCallback(async (customerId: number, force = false) => {
    if (!force && vehiclesByCustomerId[customerId]) {
      return;
    }

    setIsLoadingVehiclesByCustomerId((prev) => ({ ...prev, [customerId]: true }));

    try {
      const data = await customerRegistryService.listVehicles(customerId);
      setVehiclesByCustomerId((prev) => ({ ...prev, [customerId]: data }));
      setCustomers((prev) => prev.map((item) => (
        item.id === customerId ? { ...item, vehicleCount: data.length } : item
      )));
    } catch {
      showErrorToast('customers.errors.vehiclesLoadFailed');
    } finally {
      setIsLoadingVehiclesByCustomerId((prev) => ({ ...prev, [customerId]: false }));
    }
  }, [showErrorToast, vehiclesByCustomerId]);

  /** Loads repair history for a customer with optional cache bypass. */
  const loadCustomerHistory = useCallback(async (customerId: number, force = false) => {
    if (!force && customerHistoryByCustomerId[customerId]) {
      return;
    }

    setIsLoadingCustomerHistoryByCustomerId((prev) => ({ ...prev, [customerId]: true }));

    try {
      const data = await customerRegistryService.getCustomerHistory(customerId);
      setCustomerHistoryByCustomerId((prev) => ({ ...prev, [customerId]: data }));
    } catch {
      showErrorToast('customers.errors.historyLoadFailed');
    } finally {
      setIsLoadingCustomerHistoryByCustomerId((prev) => ({ ...prev, [customerId]: false }));
    }
  }, [customerHistoryByCustomerId, showErrorToast]);

  /** Loads repair history for a vehicle with optional cache bypass. */
  const loadVehicleHistory = useCallback(async (vehicleId: number, force = false) => {
    if (!force && vehicleHistoryByVehicleId[vehicleId]) {
      return;
    }

    setIsLoadingVehicleHistoryByVehicleId((prev) => ({ ...prev, [vehicleId]: true }));

    try {
      const data = await customerRegistryService.getVehicleHistory(vehicleId);
      setVehicleHistoryByVehicleId((prev) => ({ ...prev, [vehicleId]: data }));
    } catch {
      showErrorToast('customers.errors.historyLoadFailed');
    } finally {
      setIsLoadingVehicleHistoryByVehicleId((prev) => ({ ...prev, [vehicleId]: false }));
    }
  }, [showErrorToast, vehicleHistoryByVehicleId]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  const normalizedSearchTerm = useMemo(() => normalizeSearchValue(searchTerm), [searchTerm]);

  const filteredCustomers = useMemo(() => {
    const filtered = normalizedSearchTerm.length > 0
      ? customers.filter((customer) => normalizeSearchValue(buildCustomerDisplayName(customer)).includes(normalizedSearchTerm))
      : customers;

    return [...filtered].sort((left, right) => {
      const leftName = buildCustomerDisplayName(left);
      const rightName = buildCustomerDisplayName(right);
      const comparison = collator.compare(leftName, rightName);
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [collator, customers, normalizedSearchTerm, sortDirection]);

  const clearSearch = useCallback(() => setSearchTerm(''), []);

  const toggleSortDirection = useCallback(() => {
    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  const toggleCustomerExpanded = useCallback((customerId: number) => {
    const isExpanded = expandedCustomerIds.has(customerId);

    if (isExpanded) {
      setExpandedCustomerIds((prev) => {
        const next = new Set(prev);
        next.delete(customerId);
        return next;
      });
      return;
    }

    setExpandedCustomerIds((prev) => {
      const next = new Set(prev);
      next.add(customerId);
      return next;
    });

    void loadVehicles(customerId);
    void loadCustomerHistory(customerId);
  }, [expandedCustomerIds, loadCustomerHistory, loadVehicles]);

  const openCreateCustomerModal = useCallback(() => {
    setCustomerModalMode('create');
    setEditingCustomerId(null);
    setCustomerForm(EMPTY_CUSTOMER_FORM);
    setCustomerFieldErrors({});
    setCustomerModalOpen(true);
  }, []);

  const openEditCustomerModal = useCallback((customer: CustomerListItem) => {
    setCustomerModalMode('edit');
    setEditingCustomerId(customer.id);
    setCustomerForm({
      firstName: customer.firstName,
      middleName: customer.middleName ?? '',
      lastName: customer.lastName,
      email: customer.email,
      phoneNumber: customer.phoneNumber ?? '',
    });
    setCustomerFieldErrors({});
    setCustomerModalOpen(true);
  }, []);

  const closeCustomerModal = useCallback(() => {
    if (isSavingCustomer) {
      return;
    }

    setCustomerModalOpen(false);
  }, [isSavingCustomer]);

  const getCustomerFieldError = useCallback((field: string) => {
    return getServerFieldError(customerFieldErrors, field);
  }, [customerFieldErrors]);

  /** Creates or updates a customer from modal form values. */
  const handleSubmitCustomer = useCallback(async (event: React.SyntheticEvent) => {
    event.preventDefault();
    setIsSavingCustomer(true);
    setCustomerFieldErrors({});

    const payload: CreateCustomerRequest | UpdateCustomerRequest = {
      firstName: customerForm.firstName.trim(),
      middleName: customerForm.middleName.trim() || null,
      lastName: customerForm.lastName.trim(),
      email: customerForm.email.trim(),
      phoneNumber: customerForm.phoneNumber.trim() || null,
    };

    try {
      if (customerModalMode === 'create') {
        const created = await customerRegistryService.createCustomer(payload);
        setCustomers((prev) => [...prev, created]);
        showSuccessToast('customers.toasts.customerCreated');
      } else if (editingCustomerId !== null) {
        await customerRegistryService.updateCustomer(editingCustomerId, payload);
        setCustomers((prev) => prev.map((item) => (
          item.id === editingCustomerId
            ? {
              ...item,
              firstName: payload.firstName,
              middleName: payload.middleName ?? null,
              lastName: payload.lastName,
              email: payload.email,
              phoneNumber: payload.phoneNumber ?? null,
            }
            : item
        )));
        showSuccessToast('customers.toasts.customerUpdated');
      }

      setCustomerModalOpen(false);
    } catch (error) {
      if (isAxiosError<{ detail?: string; errors?: ServerFieldErrors }>(error)) {
        const responseData = error.response?.data;
        const mappedFieldErrors = normalizeServerFieldErrors(
          extractServerFieldErrors(responseData),
          mapCustomerValidationMessageToKey,
        );

        setCustomerFieldErrors(mappedFieldErrors);

        const detailKey = responseData?.detail
          ? mapCustomerValidationMessageToKey(responseData.detail)
          : 'customers.errors.saveFailed';
        showErrorToast(detailKey);
      } else {
        showErrorToast('customers.errors.saveFailed');
      }
    } finally {
      setIsSavingCustomer(false);
    }
  }, [
    customerForm,
    customerModalMode,
    editingCustomerId,
    showErrorToast,
    showSuccessToast,
  ]);

  const openDeleteCustomerModal = useCallback((customer: CustomerListItem) => {
    setDeleteCustomerTarget(customer);
  }, []);

  const closeDeleteCustomerModal = useCallback(() => {
    if (isDeletingCustomer) {
      return;
    }

    setDeleteCustomerTarget(null);
  }, [isDeletingCustomer]);

  /** Deletes the selected customer after confirmation. */
  const handleDeleteCustomer = useCallback(async () => {
    if (!deleteCustomerTarget) {
      return;
    }

    setIsDeletingCustomer(true);

    try {
      await customerRegistryService.deleteCustomer(deleteCustomerTarget.id);
      setCustomers((prev) => prev.filter((item) => item.id !== deleteCustomerTarget.id));
      setVehiclesByCustomerId((prev) => {
        const next = { ...prev };
        delete next[deleteCustomerTarget.id];
        return next;
      });
      setCustomerHistoryByCustomerId((prev) => {
        const next = { ...prev };
        delete next[deleteCustomerTarget.id];
        return next;
      });
      setActiveVehicleHistoryByCustomerId((prev) => {
        const next = { ...prev };
        delete next[deleteCustomerTarget.id];
        return next;
      });
      setExpandedCustomerIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteCustomerTarget.id);
        return next;
      });

      showSuccessToast('customers.toasts.customerDeleted');
      setDeleteCustomerTarget(null);
    } catch {
      showErrorToast('customers.errors.deleteFailed');
    } finally {
      setIsDeletingCustomer(false);
    }
  }, [deleteCustomerTarget, showErrorToast, showSuccessToast]);

  const openCreateVehicleModal = useCallback((customerId: number) => {
    setVehicleModalMode('create');
    setVehicleModalCustomerId(customerId);
    setEditingVehicleId(null);
    setVehicleForm(EMPTY_VEHICLE_FORM);
    setVehicleFieldErrors({});
    setVehicleModalOpen(true);
  }, []);

  const openEditVehicleModal = useCallback((customerId: number, vehicle: VehicleDetailDto) => {
    setVehicleModalMode('edit');
    setVehicleModalCustomerId(customerId);
    setEditingVehicleId(vehicle.id);
    setVehicleForm({
      licensePlate: vehicle.licensePlate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: String(vehicle.year),
      mileageKm: String(vehicle.mileageKm),
      enginePowerHp: String(vehicle.enginePowerHp),
      engineTorqueNm: String(vehicle.engineTorqueNm),
    });
    setVehicleFieldErrors({});
    setVehicleModalOpen(true);
  }, []);

  const closeVehicleModal = useCallback(() => {
    if (isSavingVehicle) {
      return;
    }

    setVehicleModalOpen(false);
  }, [isSavingVehicle]);

  const getVehicleFieldError = useCallback((field: string) => {
    return getServerFieldError(vehicleFieldErrors, field);
  }, [vehicleFieldErrors]);

  /** Creates or updates a vehicle attached to a customer. */
  const handleSubmitVehicle = useCallback(async (event: React.SyntheticEvent) => {
    event.preventDefault();

    if (vehicleModalCustomerId === null) {
      return;
    }

    setVehicleFieldErrors({});

    const year = Number(vehicleForm.year);
    const mileageKm = Number(vehicleForm.mileageKm);
    const enginePowerHp = Number(vehicleForm.enginePowerHp);
    const engineTorqueNm = Number(vehicleForm.engineTorqueNm);

    if ([year, mileageKm, enginePowerHp, engineTorqueNm].some((value) => Number.isNaN(value))) {
      showErrorToast('customers.errors.vehicleNumberInvalid');
      return;
    }

    const payload: CreateVehicleRequest | UpdateVehicleRequest = {
      licensePlate: vehicleForm.licensePlate.trim(),
      brand: vehicleForm.brand.trim(),
      model: vehicleForm.model.trim(),
      year,
      mileageKm,
      enginePowerHp,
      engineTorqueNm,
    };

    setIsSavingVehicle(true);

    try {
      if (vehicleModalMode === 'create') {
        const created = await customerRegistryService.createVehicle(vehicleModalCustomerId, payload);

        setVehiclesByCustomerId((prev) => ({
          ...prev,
          [vehicleModalCustomerId]: [...(prev[vehicleModalCustomerId] ?? []), created],
        }));

        setCustomers((prev) => prev.map((item) => (
          item.id === vehicleModalCustomerId
            ? { ...item, vehicleCount: item.vehicleCount + 1 }
            : item
        )));

        showSuccessToast('customers.toasts.vehicleCreated');
      } else if (editingVehicleId !== null) {
        await customerRegistryService.updateVehicle(editingVehicleId, payload);

        setVehiclesByCustomerId((prev) => ({
          ...prev,
          [vehicleModalCustomerId]: (prev[vehicleModalCustomerId] ?? []).map((vehicle) => (
            vehicle.id === editingVehicleId
              ? {
                ...vehicle,
                licensePlate: payload.licensePlate,
                brand: payload.brand,
                model: payload.model,
                year: payload.year,
                mileageKm: payload.mileageKm,
                enginePowerHp: payload.enginePowerHp,
                engineTorqueNm: payload.engineTorqueNm,
              }
              : vehicle
          )),
        }));

        if (customerHistoryByCustomerId[vehicleModalCustomerId]) {
          void loadCustomerHistory(vehicleModalCustomerId, true);
        }

        if (vehicleHistoryByVehicleId[editingVehicleId]) {
          void loadVehicleHistory(editingVehicleId, true);
        }

        showSuccessToast('customers.toasts.vehicleUpdated');
      }

      setVehicleModalOpen(false);
    } catch (error) {
      if (isAxiosError<{ detail?: string; errors?: ServerFieldErrors }>(error)) {
        const responseData = error.response?.data;
        const mappedFieldErrors = normalizeServerFieldErrors(
          extractServerFieldErrors(responseData),
          mapVehicleValidationMessageToKey,
        );

        setVehicleFieldErrors(mappedFieldErrors);

        const detailKey = responseData?.detail
          ? mapVehicleValidationMessageToKey(responseData.detail)
          : 'customers.errors.vehicleSaveFailed';
        showErrorToast(detailKey);
      } else {
        showErrorToast('customers.errors.vehicleSaveFailed');
      }
    } finally {
      setIsSavingVehicle(false);
    }
  }, [
    customerHistoryByCustomerId,
    editingVehicleId,
    loadCustomerHistory,
    loadVehicleHistory,
    showErrorToast,
    showSuccessToast,
    vehicleForm,
    vehicleHistoryByVehicleId,
    vehicleModalCustomerId,
    vehicleModalMode,
  ]);

  const openDeleteVehicleModal = useCallback((customerId: number, vehicle: VehicleDetailDto) => {
    setDeleteVehicleTarget({ customerId, vehicle });
  }, []);

  const closeDeleteVehicleModal = useCallback(() => {
    if (isDeletingVehicle) {
      return;
    }

    setDeleteVehicleTarget(null);
  }, [isDeletingVehicle]);

  /** Deletes a vehicle after user confirmation. */
  const handleDeleteVehicle = useCallback(async () => {
    if (!deleteVehicleTarget) {
      return;
    }

    setIsDeletingVehicle(true);

    try {
      await customerRegistryService.deleteVehicle(deleteVehicleTarget.vehicle.id);

      setVehiclesByCustomerId((prev) => ({
        ...prev,
        [deleteVehicleTarget.customerId]: (prev[deleteVehicleTarget.customerId] ?? []).filter(
          (vehicle) => vehicle.id !== deleteVehicleTarget.vehicle.id,
        ),
      }));

      setCustomers((prev) => prev.map((item) => (
        item.id === deleteVehicleTarget.customerId
          ? { ...item, vehicleCount: Math.max(0, item.vehicleCount - 1) }
          : item
      )));

      setVehicleHistoryByVehicleId((prev) => {
        const next = { ...prev };
        delete next[deleteVehicleTarget.vehicle.id];
        return next;
      });

      setActiveVehicleHistoryByCustomerId((prev) => ({
        ...prev,
        [deleteVehicleTarget.customerId]: prev[deleteVehicleTarget.customerId] === deleteVehicleTarget.vehicle.id
          ? null
          : prev[deleteVehicleTarget.customerId],
      }));

      if (customerHistoryByCustomerId[deleteVehicleTarget.customerId]) {
        void loadCustomerHistory(deleteVehicleTarget.customerId, true);
      }

      showSuccessToast('customers.toasts.vehicleDeleted');
      setDeleteVehicleTarget(null);
    } catch {
      showErrorToast('customers.errors.vehicleDeleteFailed');
    } finally {
      setIsDeletingVehicle(false);
    }
  }, [deleteVehicleTarget, customerHistoryByCustomerId, loadCustomerHistory, showErrorToast, showSuccessToast]);

  const toggleCustomerHistorySort = useCallback((customerId: number) => {
    setCustomerHistorySortByCustomerId((prev) => ({
      ...prev,
      [customerId]: prev[customerId] === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  const toggleVehicleHistory = useCallback((customerId: number, vehicleId: number) => {
    const current = activeVehicleHistoryByCustomerId[customerId] ?? null;
    const next = current === vehicleId ? null : vehicleId;

    setActiveVehicleHistoryByCustomerId((prev) => ({ ...prev, [customerId]: next }));

    if (next !== null) {
      void loadVehicleHistory(next);
    }
  }, [activeVehicleHistoryByCustomerId, loadVehicleHistory]);

  const toggleVehicleHistorySort = useCallback((vehicleId: number) => {
    setVehicleHistorySortByVehicleId((prev) => ({
      ...prev,
      [vehicleId]: prev[vehicleId] === 'desc' ? 'asc' : 'desc',
    }));
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-arsm-primary dark:text-arsm-primary-dark">
          {t('customers.pageTitle')}
        </h1>
        <p className="text-sm text-arsm-muted dark:text-arsm-muted-dark">{t('customers.pageDescription')}</p>
      </header>

      <section className={cardClass}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-arsm-muted dark:text-arsm-muted-dark" />
            <input
              data-testid="customers-search-input"
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={t('customers.searchPlaceholder')}
              className="w-full rounded-xl border border-arsm-border bg-arsm-input py-2 pl-9 pr-10 text-sm text-arsm-primary shadow-[inset_0_1px_2px_rgba(12,8,20,0.06)] focus:border-arsm-accent focus:outline-none dark:border-arsm-border-dark dark:bg-arsm-input-dark dark:text-arsm-primary-dark"
            />
            {searchTerm.length > 0 && (
              <button
                data-testid="customers-search-clear"
                type="button"
                onClick={clearSearch}
                title={t('customers.clearSearch')}
                className="absolute right-2 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-arsm-label transition hover:bg-arsm-toggle-bg dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              data-testid="customers-sort-toggle"
              type="button"
              onClick={toggleSortDirection}
              className="inline-flex items-center gap-1 rounded-xl border border-arsm-border bg-arsm-toggle-bg px-3 py-2 text-sm font-medium text-arsm-label transition hover:-translate-y-px hover:bg-arsm-accent-subtle dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-label-dark dark:hover:bg-arsm-hover-dark"
            >
              <ArrowUpDown className="h-4 w-4" />
              {sortDirection === 'asc' ? t('customers.sortAsc') : t('customers.sortDesc')}
            </button>

            <button
              data-testid="customers-create-button"
              type="button"
              onClick={openCreateCustomerModal}
              className="inline-flex items-center gap-1 rounded-xl bg-arsm-accent px-3 py-2 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(97,67,154,0.24)] transition-all duration-200 hover:-translate-y-px hover:bg-arsm-accent-dark hover:shadow-[0_12px_26px_rgba(97,67,154,0.32)]"
            >
              <Plus className="h-4 w-4" />
              {t('customers.createCustomer')}
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        {isLoadingCustomers && (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-arsm-accent/30 border-t-arsm-accent dark:border-arsm-accent-dark/30 dark:border-t-arsm-accent-dark" />
          </div>
        )}

        {!isLoadingCustomers && filteredCustomers.length === 0 && (
          <p className="rounded-2xl border border-dashed border-arsm-border bg-arsm-input px-4 py-12 text-center text-sm text-arsm-muted dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:text-arsm-muted-dark">
            {t('customers.empty')}
          </p>
        )}

        {!isLoadingCustomers && filteredCustomers.map((customer) => {
          const isExpanded = expandedCustomerIds.has(customer.id);
          const vehicles = vehiclesByCustomerId[customer.id] ?? [];
          const isLoadingVehicles = isLoadingVehiclesByCustomerId[customer.id] ?? false;
          const customerHistory = customerHistoryByCustomerId[customer.id] ?? [];
          const isLoadingCustomerHistory = isLoadingCustomerHistoryByCustomerId[customer.id] ?? false;
          const customerHistorySort = customerHistorySortByCustomerId[customer.id] ?? 'asc';
          const displayedCustomerHistory = customerHistorySort === 'asc' ? customerHistory : [...customerHistory].reverse();
          const activeVehicleHistoryId = activeVehicleHistoryByCustomerId[customer.id] ?? null;

          return (
            <article
              key={customer.id}
              data-testid={`customer-card-${customer.id}`}
              className="rounded-2xl border border-arsm-border bg-white shadow-[0_8px_20px_rgba(28,22,46,0.08)] dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:shadow-[0_12px_24px_rgba(3,5,14,0.45)]"
            >
              <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <button
                  data-testid={`customer-expand-${customer.id}`}
                  type="button"
                  onClick={() => toggleCustomerExpanded(customer.id)}
                  className="inline-flex items-center gap-2 text-left"
                >
                  {isExpanded ? (
                    <ChevronDown className="h-5 w-5 text-arsm-muted dark:text-arsm-muted-dark" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-arsm-muted dark:text-arsm-muted-dark" />
                  )}
                  <span className="text-base font-semibold text-arsm-primary dark:text-arsm-primary-dark">
                    {buildCustomerDisplayName(customer)}
                  </span>
                </button>

                <div className="flex flex-wrap items-center gap-2 text-xs text-arsm-muted dark:text-arsm-muted-dark">
                  <span className="rounded-full border border-arsm-border bg-arsm-toggle-bg px-2.5 py-1 dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark">
                    {customer.email}
                  </span>
                  {customer.phoneNumber && (
                    <span className="rounded-full border border-arsm-border bg-arsm-toggle-bg px-2.5 py-1 dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark">
                      {customer.phoneNumber}
                    </span>
                  )}
                  <span className="rounded-full border border-arsm-border bg-arsm-accent-subtle px-2.5 py-1 font-semibold text-arsm-primary dark:border-arsm-border-dark dark:bg-arsm-hover-dark dark:text-arsm-primary-dark">
                    {t('customers.vehicleCount', { count: customer.vehicleCount })}
                  </span>

                  <button
                    type="button"
                    onClick={() => openEditCustomerModal(customer)}
                    className="inline-flex items-center gap-1 rounded-lg border border-arsm-border px-2.5 py-1.5 text-xs font-medium text-arsm-label transition hover:bg-arsm-toggle-bg dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t('customers.editCustomer')}
                  </button>

                  <button
                    type="button"
                    onClick={() => openDeleteCustomerModal(customer)}
                    className="inline-flex items-center gap-1 rounded-lg border border-arsm-error-border px-2.5 py-1.5 text-xs font-medium text-arsm-error-accent transition hover:bg-arsm-error-bg dark:border-arsm-error-border-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('customers.deleteCustomer')}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="grid grid-cols-1 gap-4 border-t border-arsm-border bg-arsm-input/40 px-4 py-4 dark:border-arsm-border-dark dark:bg-arsm-input-dark/30 sm:px-5 lg:grid-cols-2">
                  <section className="space-y-3 rounded-xl border border-arsm-border bg-white p-4 dark:border-arsm-border-dark dark:bg-arsm-card-dark">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">
                        <CarFront className="h-4 w-4" />
                        {t('customers.vehiclesTitle')}
                      </h2>

                      <button
                        type="button"
                        onClick={() => openCreateVehicleModal(customer.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-arsm-border px-2.5 py-1.5 text-xs font-medium text-arsm-label transition hover:bg-arsm-toggle-bg dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        {t('customers.createVehicle')}
                      </button>
                    </div>

                    {isLoadingVehicles && (
                      <p className="text-sm text-arsm-muted dark:text-arsm-muted-dark">{t('customers.loadingVehicles')}</p>
                    )}

                    {!isLoadingVehicles && vehicles.length === 0 && (
                      <p className="text-sm text-arsm-muted dark:text-arsm-muted-dark">{t('customers.emptyVehicles')}</p>
                    )}

                    {!isLoadingVehicles && vehicles.length > 0 && (
                      <div className="space-y-2">
                        {vehicles.map((vehicle) => {
                          const isVehicleHistoryOpen = activeVehicleHistoryId === vehicle.id;
                          const vehicleHistory = vehicleHistoryByVehicleId[vehicle.id] ?? [];
                          const isLoadingVehicleHistory = isLoadingVehicleHistoryByVehicleId[vehicle.id] ?? false;
                          const vehicleHistorySort = vehicleHistorySortByVehicleId[vehicle.id] ?? 'asc';
                          const displayedVehicleHistory = vehicleHistorySort === 'asc'
                            ? vehicleHistory
                            : [...vehicleHistory].reverse();

                          return (
                            <div
                              key={vehicle.id}
                              className="space-y-2 rounded-xl border border-arsm-border bg-arsm-input px-3 py-3 dark:border-arsm-border-dark dark:bg-arsm-input-dark"
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <p className="text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">
                                    {vehicle.licensePlate}
                                  </p>
                                  <p className="text-xs text-arsm-muted dark:text-arsm-muted-dark">
                                    {vehicle.brand} {vehicle.model} ({vehicle.year})
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openEditVehicleModal(customer.id, vehicle)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-arsm-border px-2 py-1 text-xs font-medium text-arsm-label transition hover:bg-arsm-toggle-bg dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    {t('customers.editVehicle')}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openDeleteVehicleModal(customer.id, vehicle)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-arsm-error-border px-2 py-1 text-xs font-medium text-arsm-error-accent transition hover:bg-arsm-error-bg dark:border-arsm-error-border-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    {t('customers.deleteVehicle')}
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs text-arsm-label dark:text-arsm-label-dark">
                                <p>{t('customers.mileageLabel', { value: vehicle.mileageKm })}</p>
                                <p>{t('customers.powerLabel', { value: vehicle.enginePowerHp })}</p>
                                <p>{t('customers.torqueLabel', { value: vehicle.engineTorqueNm })}</p>
                              </div>

                              <button
                                type="button"
                                onClick={() => toggleVehicleHistory(customer.id, vehicle.id)}
                                className="inline-flex items-center gap-1 rounded-lg border border-arsm-border px-2 py-1 text-xs font-medium text-arsm-label transition hover:bg-arsm-toggle-bg dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
                              >
                                <Wrench className="h-3.5 w-3.5" />
                                {isVehicleHistoryOpen ? t('customers.hideVehicleHistory') : t('customers.showVehicleHistory')}
                              </button>

                              {isVehicleHistoryOpen && (
                                <div className="space-y-2 rounded-lg border border-arsm-border bg-white p-3 dark:border-arsm-border-dark dark:bg-arsm-card-dark">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-xs font-semibold text-arsm-primary dark:text-arsm-primary-dark">
                                      {t('customers.vehicleHistoryTitle')}
                                    </p>

                                    <button
                                      type="button"
                                      onClick={() => toggleVehicleHistorySort(vehicle.id)}
                                      className="inline-flex items-center gap-1 rounded-lg border border-arsm-border px-2 py-1 text-xs font-medium text-arsm-label transition hover:bg-arsm-toggle-bg dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
                                    >
                                      <ArrowUpDown className="h-3.5 w-3.5" />
                                      {vehicleHistorySort === 'asc' ? t('customers.historySortAsc') : t('customers.historySortDesc')}
                                    </button>
                                  </div>

                                  {isLoadingVehicleHistory && (
                                    <p className="text-xs text-arsm-muted dark:text-arsm-muted-dark">{t('customers.loadingHistory')}</p>
                                  )}

                                  {!isLoadingVehicleHistory && (
                                    <RepairHistoryList
                                      appointments={displayedVehicleHistory}
                                      locale={i18n.language}
                                      emptyMessage={t('customers.emptyHistory')}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>

                  <section className="space-y-3 rounded-xl border border-arsm-border bg-white p-4 dark:border-arsm-border-dark dark:bg-arsm-card-dark">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="inline-flex items-center gap-2 text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">
                        <Wrench className="h-4 w-4" />
                        {t('customers.customerHistoryTitle')}
                      </h2>

                      <button
                        type="button"
                        onClick={() => toggleCustomerHistorySort(customer.id)}
                        className="inline-flex items-center gap-1 rounded-lg border border-arsm-border px-2 py-1 text-xs font-medium text-arsm-label transition hover:bg-arsm-toggle-bg dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
                      >
                        <ArrowUpDown className="h-3.5 w-3.5" />
                        {customerHistorySort === 'asc' ? t('customers.historySortAsc') : t('customers.historySortDesc')}
                      </button>
                    </div>

                    {isLoadingCustomerHistory && (
                      <p className="text-sm text-arsm-muted dark:text-arsm-muted-dark">{t('customers.loadingHistory')}</p>
                    )}

                    {!isLoadingCustomerHistory && (
                      <RepairHistoryList
                        appointments={displayedCustomerHistory}
                        locale={i18n.language}
                        emptyMessage={t('customers.emptyHistory')}
                      />
                    )}
                  </section>
                </div>
              )}
            </article>
          );
        })}
      </section>

      <Modal
        isOpen={customerModalOpen}
        onClose={closeCustomerModal}
        title={customerModalMode === 'create' ? t('customers.createCustomer') : t('customers.editCustomer')}
        footer={(
          <>
            <button
              type="button"
              onClick={closeCustomerModal}
              disabled={isSavingCustomer}
              className="inline-flex items-center justify-center rounded-xl border border-arsm-border bg-transparent px-4 py-2 text-sm font-medium text-arsm-label transition hover:bg-arsm-toggle-bg disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
            >
              {t('settings.cancel')}
            </button>
            <button
              type="submit"
              form="customers-customer-form"
              disabled={isSavingCustomer}
              className={`inline-flex items-center justify-center ${buttonClass}`}
            >
              {isSavingCustomer ? t('customers.saving') : t('customers.save')}
            </button>
          </>
        )}
      >
        <form id="customers-customer-form" onSubmit={handleSubmitCustomer} className="space-y-3" noValidate>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="customer-first-name" className={labelClass}>{t('customers.firstName')}</label>
              <input
                id="customer-first-name"
                type="text"
                value={customerForm.firstName}
                onChange={(event) => setCustomerForm((prev) => ({ ...prev, firstName: filterNameInput(event.target.value) }))}
                className={inputClass}
                placeholder={t('customers.firstNamePlaceholder')}
                disabled={isSavingCustomer}
                aria-invalid={!!getCustomerFieldError('FirstName')}
              />
              <FormErrorMessage message={getCustomerFieldError('FirstName')} className="mt-1 px-2 py-1 text-xs" />
            </div>

            <div>
              <label htmlFor="customer-middle-name" className={labelClass}>{t('customers.middleName')}</label>
              <input
                id="customer-middle-name"
                type="text"
                value={customerForm.middleName}
                onChange={(event) => setCustomerForm((prev) => ({ ...prev, middleName: filterNameInput(event.target.value) }))}
                className={inputClass}
                placeholder={t('customers.middleNamePlaceholder')}
                disabled={isSavingCustomer}
                aria-invalid={!!getCustomerFieldError('MiddleName')}
              />
              <FormErrorMessage message={getCustomerFieldError('MiddleName')} className="mt-1 px-2 py-1 text-xs" />
            </div>

            <div>
              <label htmlFor="customer-last-name" className={labelClass}>{t('customers.lastName')}</label>
              <input
                id="customer-last-name"
                type="text"
                value={customerForm.lastName}
                onChange={(event) => setCustomerForm((prev) => ({ ...prev, lastName: filterNameInput(event.target.value) }))}
                className={inputClass}
                placeholder={t('customers.lastNamePlaceholder')}
                disabled={isSavingCustomer}
                aria-invalid={!!getCustomerFieldError('LastName')}
              />
              <FormErrorMessage message={getCustomerFieldError('LastName')} className="mt-1 px-2 py-1 text-xs" />
            </div>
          </div>

          <div>
            <label htmlFor="customer-email" className={labelClass}>{t('customers.email')}</label>
            <input
              id="customer-email"
              type="email"
              value={customerForm.email}
              onChange={(event) => setCustomerForm((prev) => ({ ...prev, email: event.target.value }))}
              className={inputClass}
              placeholder={t('customers.emailPlaceholder')}
              disabled={isSavingCustomer}
              aria-invalid={!!getCustomerFieldError('Email')}
            />
            <FormErrorMessage message={getCustomerFieldError('Email')} className="mt-1 px-2 py-1 text-xs" />
          </div>

          <div>
            <label htmlFor="customer-phone" className={labelClass}>{t('customers.phoneNumber')}</label>
            <input
              id="customer-phone"
              type="tel"
              value={customerForm.phoneNumber}
              onChange={(event) => setCustomerForm((prev) => ({ ...prev, phoneNumber: filterPhoneInput(event.target.value) }))}
              className={inputClass}
              placeholder={t('customers.phonePlaceholder')}
              disabled={isSavingCustomer}
              aria-invalid={!!getCustomerFieldError('PhoneNumber')}
            />
            <FormErrorMessage message={getCustomerFieldError('PhoneNumber')} className="mt-1 px-2 py-1 text-xs" />
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={deleteCustomerTarget !== null}
        onClose={closeDeleteCustomerModal}
        title={t('customers.deleteCustomerTitle')}
        footer={(
          <>
            <button
              type="button"
              onClick={closeDeleteCustomerModal}
              disabled={isDeletingCustomer}
              className="inline-flex items-center justify-center rounded-xl border border-arsm-border bg-transparent px-4 py-2 text-sm font-medium text-arsm-label transition hover:bg-arsm-toggle-bg disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
            >
              {t('settings.cancel')}
            </button>
            <button
              type="button"
              onClick={() => { void handleDeleteCustomer(); }}
              disabled={isDeletingCustomer}
              className="inline-flex items-center justify-center rounded-xl bg-arsm-error-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(215,82,94,0.24)] transition-all duration-200 hover:-translate-y-px hover:bg-arsm-error-active hover:shadow-[0_12px_26px_rgba(215,82,94,0.3)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
            >
              {isDeletingCustomer ? t('customers.deleting') : t('customers.deleteCustomer')}
            </button>
          </>
        )}
      >
        <p className="text-sm text-arsm-label dark:text-arsm-label-dark">
          {t('customers.deleteCustomerConfirm', {
            name: deleteCustomerTarget ? buildCustomerDisplayName(deleteCustomerTarget) : '',
          })}
        </p>
      </Modal>

      <Modal
        isOpen={vehicleModalOpen}
        onClose={closeVehicleModal}
        title={vehicleModalMode === 'create' ? t('customers.createVehicle') : t('customers.editVehicle')}
        footer={(
          <>
            <button
              type="button"
              onClick={closeVehicleModal}
              disabled={isSavingVehicle}
              className="inline-flex items-center justify-center rounded-xl border border-arsm-border bg-transparent px-4 py-2 text-sm font-medium text-arsm-label transition hover:bg-arsm-toggle-bg disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
            >
              {t('settings.cancel')}
            </button>
            <button
              type="submit"
              form="customers-vehicle-form"
              disabled={isSavingVehicle}
              className={`inline-flex items-center justify-center ${buttonClass}`}
            >
              {isSavingVehicle ? t('customers.saving') : t('customers.save')}
            </button>
          </>
        )}
      >
        <form id="customers-vehicle-form" onSubmit={handleSubmitVehicle} className="space-y-3" noValidate>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="vehicle-license-plate" className={labelClass}>{t('customers.licensePlate')}</label>
              <input
                id="vehicle-license-plate"
                type="text"
                value={vehicleForm.licensePlate}
                onChange={(event) => setVehicleForm((prev) => ({ ...prev, licensePlate: event.target.value }))}
                className={inputClass}
                placeholder={t('customers.licensePlatePlaceholder')}
                disabled={isSavingVehicle}
                aria-invalid={!!getVehicleFieldError('LicensePlate')}
              />
              <FormErrorMessage message={getVehicleFieldError('LicensePlate')} className="mt-1 px-2 py-1 text-xs" />
            </div>

            <div>
              <label htmlFor="vehicle-brand" className={labelClass}>{t('customers.brand')}</label>
              <input
                id="vehicle-brand"
                type="text"
                value={vehicleForm.brand}
                onChange={(event) => setVehicleForm((prev) => ({ ...prev, brand: event.target.value }))}
                className={inputClass}
                placeholder={t('customers.brandPlaceholder')}
                disabled={isSavingVehicle}
                aria-invalid={!!getVehicleFieldError('Brand')}
              />
              <FormErrorMessage message={getVehicleFieldError('Brand')} className="mt-1 px-2 py-1 text-xs" />
            </div>

            <div>
              <label htmlFor="vehicle-model" className={labelClass}>{t('customers.model')}</label>
              <input
                id="vehicle-model"
                type="text"
                value={vehicleForm.model}
                onChange={(event) => setVehicleForm((prev) => ({ ...prev, model: event.target.value }))}
                className={inputClass}
                placeholder={t('customers.modelPlaceholder')}
                disabled={isSavingVehicle}
                aria-invalid={!!getVehicleFieldError('Model')}
              />
              <FormErrorMessage message={getVehicleFieldError('Model')} className="mt-1 px-2 py-1 text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="vehicle-year" className={labelClass}>{t('customers.year')}</label>
              <input
                id="vehicle-year"
                type="number"
                value={vehicleForm.year}
                onChange={(event) => setVehicleForm((prev) => ({ ...prev, year: event.target.value }))}
                className={inputClass}
                placeholder={t('customers.yearPlaceholder')}
                disabled={isSavingVehicle}
                aria-invalid={!!getVehicleFieldError('Year')}
              />
              <FormErrorMessage message={getVehicleFieldError('Year')} className="mt-1 px-2 py-1 text-xs" />
            </div>

            <div>
              <label htmlFor="vehicle-mileage" className={labelClass}>{t('customers.mileageKm')}</label>
              <input
                id="vehicle-mileage"
                type="number"
                value={vehicleForm.mileageKm}
                onChange={(event) => setVehicleForm((prev) => ({ ...prev, mileageKm: event.target.value }))}
                className={inputClass}
                placeholder={t('customers.mileagePlaceholder')}
                disabled={isSavingVehicle}
                aria-invalid={!!getVehicleFieldError('MileageKm')}
              />
              <FormErrorMessage message={getVehicleFieldError('MileageKm')} className="mt-1 px-2 py-1 text-xs" />
            </div>

            <div>
              <label htmlFor="vehicle-power" className={labelClass}>{t('customers.enginePowerHp')}</label>
              <input
                id="vehicle-power"
                type="number"
                value={vehicleForm.enginePowerHp}
                onChange={(event) => setVehicleForm((prev) => ({ ...prev, enginePowerHp: event.target.value }))}
                className={inputClass}
                placeholder={t('customers.enginePowerPlaceholder')}
                disabled={isSavingVehicle}
                aria-invalid={!!getVehicleFieldError('EnginePowerHp')}
              />
              <FormErrorMessage message={getVehicleFieldError('EnginePowerHp')} className="mt-1 px-2 py-1 text-xs" />
            </div>

            <div>
              <label htmlFor="vehicle-torque" className={labelClass}>{t('customers.engineTorqueNm')}</label>
              <input
                id="vehicle-torque"
                type="number"
                value={vehicleForm.engineTorqueNm}
                onChange={(event) => setVehicleForm((prev) => ({ ...prev, engineTorqueNm: event.target.value }))}
                className={inputClass}
                placeholder={t('customers.engineTorquePlaceholder')}
                disabled={isSavingVehicle}
                aria-invalid={!!getVehicleFieldError('EngineTorqueNm')}
              />
              <FormErrorMessage message={getVehicleFieldError('EngineTorqueNm')} className="mt-1 px-2 py-1 text-xs" />
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={deleteVehicleTarget !== null}
        onClose={closeDeleteVehicleModal}
        title={t('customers.deleteVehicleTitle')}
        footer={(
          <>
            <button
              type="button"
              onClick={closeDeleteVehicleModal}
              disabled={isDeletingVehicle}
              className="inline-flex items-center justify-center rounded-xl border border-arsm-border bg-transparent px-4 py-2 text-sm font-medium text-arsm-label transition hover:bg-arsm-toggle-bg disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
            >
              {t('settings.cancel')}
            </button>
            <button
              type="button"
              onClick={() => { void handleDeleteVehicle(); }}
              disabled={isDeletingVehicle}
              className="inline-flex items-center justify-center rounded-xl bg-arsm-error-accent px-4 py-2.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(215,82,94,0.24)] transition-all duration-200 hover:-translate-y-px hover:bg-arsm-error-active hover:shadow-[0_12px_26px_rgba(215,82,94,0.3)] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
            >
              {isDeletingVehicle ? t('customers.deleting') : t('customers.deleteVehicle')}
            </button>
          </>
        )}
      >
        <p className="text-sm text-arsm-label dark:text-arsm-label-dark">
          {t('customers.deleteVehicleConfirm', {
            plate: deleteVehicleTarget?.vehicle.licensePlate ?? '',
          })}
        </p>
      </Modal>
    </div>
  );
});

CustomersPageComponent.displayName = 'CustomersPage';

/** Customers route component. */
export const CustomersPage = CustomersPageComponent;
