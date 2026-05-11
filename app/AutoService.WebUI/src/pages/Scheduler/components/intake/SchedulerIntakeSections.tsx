import { memo } from 'react';
import { Search, UserCheck, UserPlus } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { SchedulerCustomerLookupDto } from '../../../../types/scheduler/scheduler.types';
import {
	buttonClass,
	getTogglePillClass,
	insetSurfaceClass,
	intakeDateTimeInputClass,
	intakeFieldLabelClass,
	intakeFieldWrapperClass,
	intakeInputClass,
	intakeTextareaClass,
} from '../../../../utils/formStyles';
import { filterNameInput, filterPhoneInput } from '../../../../utils/validation';
import type { LookupState, VehicleFormState, VehicleMode } from './SchedulerIntakeModal.types';

interface SchedulerIntakeHeaderProps {
	readonly selectedDayLabel: string;
	readonly dueDateTime: string;
	readonly translate: TFunction;
	readonly onDueDateTimeChange: (value: string) => void;
}

export const SchedulerIntakeHeader = memo(function SchedulerIntakeHeader({
	selectedDayLabel,
	dueDateTime,
	translate,
	onDueDateTimeChange,
}: SchedulerIntakeHeaderProps) {
	return (
		<div className="space-y-3">
			<div className="relative overflow-hidden rounded-2xl border border-arsm-border bg-arsm-input/90 px-4 py-3 text-sm text-arsm-primary dark:border-arsm-border-dark dark:bg-arsm-card-dark dark:text-arsm-primary-dark">
				<div
					aria-hidden="true"
					className="arsm-intake-sheen pointer-events-none absolute inset-x-0 top-0 h-10"
				/>
				<span className="relative font-medium">{translate('scheduler.intake.selectedDay')}</span>
				<span className="relative ml-1">{selectedDayLabel}</span>
			</div>

			<div className="grid grid-cols-1 gap-3">
				<label className={intakeFieldWrapperClass}>
					<span className={intakeFieldLabelClass}>{translate('scheduler.intake.dueDateTime')}</span>
					<input
						type="datetime-local"
						data-testid="scheduler-intake-due-datetime"
						value={dueDateTime}
						onChange={(event) => onDueDateTimeChange(event.target.value)}
						className={intakeDateTimeInputClass}
					/>
				</label>
			</div>

			<div className={`${insetSurfaceClass} p-3.5 text-sm`}>
				<span className="font-medium text-arsm-muted dark:text-arsm-muted-dark">{translate('scheduler.intake.statusLabel')}</span>
				<p className="mt-1 inline-flex rounded-full border border-arsm-warning-border/60 bg-arsm-warning-bg px-2.5 py-0.5 text-xs font-semibold text-arsm-warning-text dark:border-arsm-warning-border-dark/60 dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark">
					{translate('scheduler.status.inprogress')}
				</p>
			</div>
		</div>
	);
});

interface SchedulerIntakeLookupProps {
	readonly lookupState: LookupState;
	readonly customerLookup: SchedulerCustomerLookupDto | null;
	readonly email: string;
	readonly isSearching: boolean;
	readonly translate: TFunction;
	readonly onEmailChange: (value: string) => void;
	readonly onLookup: () => void;
}

export const SchedulerIntakeLookupSection = memo(function SchedulerIntakeLookupSection({
	lookupState,
	customerLookup,
	email,
	isSearching,
	translate,
	onEmailChange,
	onLookup,
}: SchedulerIntakeLookupProps) {
	return (
		<div className={`${insetSurfaceClass} relative space-y-3 overflow-hidden p-3.5`}>
			<div
				aria-hidden="true"
				className="arsm-intake-sheen-soft pointer-events-none absolute inset-x-0 top-0 h-10"
			/>
			<h3 className="text-sm font-semibold text-arsm-primary dark:text-arsm-primary-dark">
				{translate('scheduler.intake.customerLookup')}
			</h3>

			<div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-end">
				<label className={`min-w-0 flex-1 ${intakeFieldWrapperClass}`}>
					<span className={intakeFieldLabelClass}>{translate('scheduler.intake.customerEmail')}</span>
					<input
						type="email"
						data-testid="scheduler-intake-customer-email"
						value={email}
						onChange={(event) => onEmailChange(event.target.value)}
						placeholder={translate('scheduler.intake.customerEmailPlaceholder')}
						className={`${intakeInputClass} truncate`}
					/>
				</label>

				<button
					type="button"
					data-testid="scheduler-intake-search"
					onClick={onLookup}
					disabled={isSearching}
					className={buttonClass}
				>
					<Search className="h-4 w-4 shrink-0" />
					{isSearching ? translate('scheduler.intake.searching') : translate('scheduler.intake.search')}
				</button>
			</div>

			{lookupState === 'found' && customerLookup && (
				<div className="fade-in-up rounded-xl border border-arsm-success-border/60 bg-arsm-success-bg px-3.5 py-2.5 text-sm text-arsm-success-text dark:border-arsm-success-border-dark/60 dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark">
					<div className="flex min-w-0 items-center gap-2 font-semibold">
						<UserCheck className="h-4 w-4 shrink-0" />
						<span className="min-w-0 truncate">{translate('scheduler.intake.customerFound')}</span>
					</div>
					<p className="mt-1 truncate">
						{customerLookup.firstName} {customerLookup.middleName ?? ''} {customerLookup.lastName}
					</p>
					<p className="truncate text-xs opacity-80">{customerLookup.email}</p>
				</div>
			)}

			{lookupState === 'not-found' && (
				<div className="fade-in-up rounded-xl border border-arsm-warning-border/60 bg-arsm-warning-bg px-3.5 py-2.5 text-sm text-arsm-warning-text dark:border-arsm-warning-border-dark/60 dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark">
					<div className="flex min-w-0 items-center gap-2 font-semibold">
						<UserPlus className="h-4 w-4 shrink-0" />
						<span className="min-w-0 truncate">{translate('scheduler.intake.customerNotFound')}</span>
					</div>
					<p className="mt-1 text-xs">{translate('scheduler.intake.customerCreateHint')}</p>
				</div>
			)}
		</div>
	);
});

interface SchedulerIntakeCustomerFormProps {
	readonly customerFirstName: string;
	readonly customerMiddleName: string;
	readonly customerLastName: string;
	readonly customerPhone: string;
	readonly translate: TFunction;
	readonly onCustomerFirstNameChange: (value: string) => void;
	readonly onCustomerMiddleNameChange: (value: string) => void;
	readonly onCustomerLastNameChange: (value: string) => void;
	readonly onCustomerPhoneChange: (value: string) => void;
}

export const SchedulerIntakeCustomerForm = memo(function SchedulerIntakeCustomerForm({
	customerFirstName,
	customerMiddleName,
	customerLastName,
	customerPhone,
	translate,
	onCustomerFirstNameChange,
	onCustomerMiddleNameChange,
	onCustomerLastNameChange,
	onCustomerPhoneChange,
}: SchedulerIntakeCustomerFormProps) {
	return (
		<div className={`${insetSurfaceClass} grid grid-cols-1 gap-3 p-3.5 lg:grid-cols-2`}>
			<p className="text-xs font-medium uppercase tracking-wide text-arsm-muted dark:text-arsm-muted-dark lg:col-span-2">
				{translate('scheduler.intake.personalInformation')}
			</p>

			<label className={intakeFieldWrapperClass}>
				<span className={intakeFieldLabelClass}>{translate('scheduler.intake.customerFirstName')}</span>
				<input
					value={customerFirstName}
					onChange={(event) => onCustomerFirstNameChange(filterNameInput(event.target.value))}
					placeholder={translate('scheduler.intake.customerFirstNamePlaceholder')}
					className={intakeInputClass}
				/>
			</label>

			<label className={intakeFieldWrapperClass}>
				<span className={intakeFieldLabelClass}>{translate('scheduler.intake.customerMiddleNameOptional')}</span>
				<input
					value={customerMiddleName}
					onChange={(event) => onCustomerMiddleNameChange(filterNameInput(event.target.value))}
					placeholder={translate('scheduler.intake.customerMiddleNamePlaceholder')}
					className={intakeInputClass}
				/>
			</label>

			<label className={intakeFieldWrapperClass}>
				<span className={intakeFieldLabelClass}>{translate('scheduler.intake.customerLastName')}</span>
				<input
					value={customerLastName}
					onChange={(event) => onCustomerLastNameChange(filterNameInput(event.target.value))}
					placeholder={translate('scheduler.intake.customerLastNamePlaceholder')}
					className={intakeInputClass}
				/>
			</label>

			<label className={intakeFieldWrapperClass}>
				<span className={intakeFieldLabelClass}>{translate('scheduler.intake.customerPhoneOptional')}</span>
				<input
					value={customerPhone}
					onChange={(event) => onCustomerPhoneChange(filterPhoneInput(event.target.value))}
					placeholder={translate('scheduler.intake.customerPhonePlaceholder')}
					className={intakeInputClass}
				/>
			</label>
		</div>
	);
});

interface SchedulerIntakeVehicleModeProps {
	readonly customerLookup: SchedulerCustomerLookupDto | null;
	readonly customerHasVehicles: boolean;
	readonly vehicleMode: VehicleMode;
	readonly existingVehicleId: string;
	readonly translate: TFunction;
	readonly onVehicleModeChange: (mode: VehicleMode) => void;
	readonly onExistingVehicleIdChange: (value: string) => void;
}

export const SchedulerIntakeVehicleModeSection = memo(function SchedulerIntakeVehicleModeSection({
	customerLookup,
	customerHasVehicles,
	vehicleMode,
	existingVehicleId,
	translate,
	onVehicleModeChange,
	onExistingVehicleIdChange,
}: SchedulerIntakeVehicleModeProps) {
	return (
		<div className={`${insetSurfaceClass} space-y-3 p-3.5`}>
			{vehicleMode === 'existing' && (
				<p className="text-xs font-medium uppercase tracking-wide text-arsm-muted dark:text-arsm-muted-dark">
					{translate('scheduler.intake.vehicleDetails')}
				</p>
			)}

			<div className="flex flex-wrap gap-2">
				<button
					type="button"
					onClick={() => onVehicleModeChange('existing')}
					disabled={!customerHasVehicles}
					className={getTogglePillClass(vehicleMode === 'existing')}
				>
					{translate('scheduler.intake.useExistingVehicle')}
				</button>
				<button
					type="button"
					onClick={() => onVehicleModeChange('new')}
					className={getTogglePillClass(vehicleMode === 'new')}
				>
					{translate('scheduler.intake.createNewVehicle')}
				</button>
			</div>

			{vehicleMode === 'existing' && (
				<label className={`${intakeFieldWrapperClass} overflow-hidden`}>
					<span className={intakeFieldLabelClass}>{translate('scheduler.intake.selectVehicle')}</span>
					<select
						data-testid="scheduler-intake-existing-vehicle"
						value={existingVehicleId}
						onChange={(event) => onExistingVehicleIdChange(event.target.value)}
						className={`${intakeInputClass} truncate`}
					>
						<option value="" disabled hidden>
							{translate('scheduler.intake.selectVehiclePlaceholder')}
						</option>
						{customerLookup?.vehicles.map((vehicleItem) => (
							<option key={vehicleItem.id} value={vehicleItem.id}>
								{vehicleItem.licensePlate} - {vehicleItem.brand} {vehicleItem.model} ({vehicleItem.year})
							</option>
						))}
					</select>
				</label>
			)}
		</div>
	);
});

interface SchedulerIntakeVehicleFormProps {
	readonly vehicle: VehicleFormState;
	readonly translate: TFunction;
	readonly onVehicleFieldChange: (field: keyof VehicleFormState, value: string) => void;
}

export const SchedulerIntakeVehicleForm = memo(function SchedulerIntakeVehicleForm({
	vehicle,
	translate,
	onVehicleFieldChange,
}: SchedulerIntakeVehicleFormProps) {
	return (
		<div className={`${insetSurfaceClass} grid grid-cols-1 gap-3 p-3.5 lg:grid-cols-2`}>
			<p className="text-xs font-medium uppercase tracking-wide text-arsm-muted dark:text-arsm-muted-dark lg:col-span-2">
				{translate('scheduler.intake.vehicleDetails')}
			</p>

			<label className={intakeFieldWrapperClass}>
				<span className={intakeFieldLabelClass}>{translate('scheduler.intake.vehicleLicensePlate')}</span>
				<input
					value={vehicle.licensePlate}
					onChange={(event) => onVehicleFieldChange('licensePlate', event.target.value.toUpperCase())}
					placeholder={translate('scheduler.intake.vehicleLicensePlatePlaceholder')}
					className={`${intakeInputClass} uppercase`}
				/>
			</label>

			<label className={intakeFieldWrapperClass}>
				<span className={intakeFieldLabelClass}>{translate('scheduler.intake.vehicleBrand')}</span>
				<input
					value={vehicle.brand}
					onChange={(event) => onVehicleFieldChange('brand', event.target.value)}
					placeholder={translate('scheduler.intake.vehicleBrandPlaceholder')}
					className={intakeInputClass}
				/>
			</label>

			<label className={intakeFieldWrapperClass}>
				<span className={intakeFieldLabelClass}>{translate('scheduler.intake.vehicleModel')}</span>
				<input
					value={vehicle.model}
					onChange={(event) => onVehicleFieldChange('model', event.target.value)}
					placeholder={translate('scheduler.intake.vehicleModelPlaceholder')}
					className={intakeInputClass}
				/>
			</label>

			<label className={intakeFieldWrapperClass}>
				<span className={intakeFieldLabelClass}>{translate('scheduler.intake.vehicleYear')}</span>
				<input
					type="number"
					min={1886}
					max={2100}
					value={vehicle.year}
					onChange={(event) => onVehicleFieldChange('year', event.target.value)}
					placeholder={translate('scheduler.intake.vehicleYearPlaceholder')}
					className={intakeInputClass}
				/>
			</label>

			<label className={intakeFieldWrapperClass}>
				<span className={intakeFieldLabelClass}>{translate('scheduler.intake.vehicleMileageKm')}</span>
				<input
					type="number"
					min={0}
					max={5000000}
					value={vehicle.mileageKm}
					onChange={(event) => onVehicleFieldChange('mileageKm', event.target.value)}
					placeholder={translate('scheduler.intake.vehicleMileageKmPlaceholder')}
					className={intakeInputClass}
				/>
			</label>

			<label className={intakeFieldWrapperClass}>
				<span className={intakeFieldLabelClass}>{translate('scheduler.intake.vehicleEnginePowerHp')}</span>
				<input
					type="number"
					min={0}
					max={50000}
					value={vehicle.enginePowerHp}
					onChange={(event) => onVehicleFieldChange('enginePowerHp', event.target.value)}
					placeholder={translate('scheduler.intake.vehicleEnginePowerHpPlaceholder')}
					className={intakeInputClass}
				/>
			</label>

			<label className={intakeFieldWrapperClass}>
				<span className={intakeFieldLabelClass}>{translate('scheduler.intake.vehicleEngineTorqueNm')}</span>
				<input
					type="number"
					min={0}
					max={50000}
					value={vehicle.engineTorqueNm}
					onChange={(event) => onVehicleFieldChange('engineTorqueNm', event.target.value)}
					placeholder={translate('scheduler.intake.vehicleEngineTorqueNmPlaceholder')}
					className={intakeInputClass}
				/>
			</label>
		</div>
	);
});

interface SchedulerIntakeTaskSectionProps {
	readonly taskDescription: string;
	readonly translate: TFunction;
	readonly onTaskDescriptionChange: (value: string) => void;
}

export const SchedulerIntakeTaskSection = memo(function SchedulerIntakeTaskSection({
	taskDescription,
	translate,
	onTaskDescriptionChange,
}: SchedulerIntakeTaskSectionProps) {
	return (
		<div className={`${insetSurfaceClass} space-y-3 p-3.5`}>
			<label className={intakeFieldWrapperClass}>
				<span className={intakeFieldLabelClass}>{translate('scheduler.intake.taskDescription')}</span>
				<textarea
					data-testid="scheduler-intake-task-description"
					value={taskDescription}
					onChange={(event) => onTaskDescriptionChange(event.target.value)}
					placeholder={translate('scheduler.intake.taskDescriptionPlaceholder')}
					maxLength={200}
					rows={4}
					className={`${intakeTextareaClass} min-h-[7rem]`}
				/>
			</label>
		</div>
	);
});
