import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isAxiosError } from 'axios';
import { Trash2 } from 'lucide-react';
import { adminService } from '../../../../services/admin/admin.service';
import { PROFILE_PICTURE_UPDATED_EVENT } from '../../../../services/profile/profile-picture-live.service';
import { useToastStore } from '../../../../store/toast.store';
import { Modal } from '../../../../components/common/Modal';
import type { MechanicListItem } from '../../../../services/admin/admin.service';
import { MechanicAvatar } from '../../../Scheduler/components/shared/MechanicAvatar';
import { dangerButtonClass, iconDangerButtonClass, secondaryButtonClass } from '../../../../utils/formStyles';

interface MechanicListSectionProps {
	readonly refreshKey: number;
}

/** Renders the admin mechanic roster with optional delete actions. */
export const MechanicListSection = memo(function MechanicListSection({ refreshKey }: MechanicListSectionProps) {
	const { t } = useTranslation();
	const showSuccessToast = useToastStore((state) => state.showSuccess);
	const showErrorToast = useToastStore((state) => state.showError);

	const [mechanics, setMechanics] = useState<MechanicListItem[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [deleteTarget, setDeleteTarget] = useState<MechanicListItem | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	const loadMechanics = useCallback(async () => {
		setIsLoading(true);
		try {
			const data = await adminService.listMechanics();
			setMechanics(data);
		} catch {
			showErrorToast('admin.mechanicListError');
		} finally {
			setIsLoading(false);
		}
	}, [showErrorToast]);

	useEffect(() => {
		void loadMechanics();
	}, [loadMechanics, refreshKey]);

	useEffect(() => {
		const handleProfilePictureUpdated = () => {
			void loadMechanics();
		};

		globalThis.addEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated);
		return () => {
			globalThis.removeEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated);
		};
	}, [loadMechanics]);

	const openDeleteModal = useCallback((mechanic: MechanicListItem) => {
		setDeleteTarget(mechanic);
	}, []);

	const closeDeleteModal = useCallback(() => {
		if (isDeleting) {
			return;
		}

		setDeleteTarget(null);
	}, [isDeleting]);

	const handleDelete = useCallback(async () => {
		if (!deleteTarget) {
			return;
		}

		setIsDeleting(true);
		try {
			await adminService.deleteMechanic(deleteTarget.personId);
			setMechanics((previousMechanics) => (
				previousMechanics.filter((mechanicItem) => mechanicItem.personId !== deleteTarget.personId)
			));
			showSuccessToast('admin.mechanicDeleted', { email: deleteTarget.email });
			setDeleteTarget(null);
		} catch (error) {
			if (isAxiosError<{ detail?: string }>(error)) {
				const status = error.response?.status;
				const detail = error.response?.data?.detail ?? '';

				if (status === 422 && detail.includes('appointments would be left without')) {
					showErrorToast('admin.mechanicDeleteHasAppointments');
				} else if (status === 422 && detail.includes('last remaining mechanic')) {
					showErrorToast('admin.mechanicDeleteLastMechanic');
				} else if (status === 403) {
					showErrorToast('admin.mechanicDeleteForbidden');
				} else if (status === 409) {
					showErrorToast('admin.mechanicDeleteConflict');
				} else if (status === 500) {
					showErrorToast('admin.mechanicDeleteIdentityFailed');
				} else {
					showErrorToast('admin.mechanicDeleteFailed');
				}
			} else {
				showErrorToast('admin.mechanicDeleteFailed');
			}
		} finally {
			setIsDeleting(false);
		}
	}, [deleteTarget, showErrorToast, showSuccessToast]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="h-8 w-8 animate-spin rounded-full border-[3px] border-arsm-accent/30 border-t-arsm-accent dark:border-arsm-accent-dark/30 dark:border-t-arsm-accent-dark" />
			</div>
		);
	}

	return (
		<>
			{mechanics.length === 0 ? (
				<p className="text-sm text-arsm-label dark:text-arsm-label-dark">{t('admin.noMechanics')}</p>
			) : (
				<div className="space-y-3">
					{Array.from(new Map(mechanics.map((mechanic) => [mechanic.personId, mechanic])).values()).map((mechanic) => {
						const removableMechanicCount = mechanics.filter((item) => !item.isAdmin).length;
						const canRemoveMechanic = !mechanic.isAdmin && removableMechanicCount > 1;
						const displayName = [mechanic.firstName, mechanic.middleName, mechanic.lastName]
							.filter(Boolean)
							.join(' ');

						return (
							<div
								key={mechanic.personId}
								className="relative flex items-start gap-3 rounded-xl border border-arsm-border bg-arsm-card px-4 py-3 transition-all duration-200 hover:-translate-y-px dark:border-arsm-border-dark dark:bg-arsm-card-dark sm:items-center"
							>
								<MechanicAvatar
									mechanicId={mechanic.personId}
									fullName={displayName}
									hasProfilePicture={Boolean(mechanic.hasProfilePicture)}
									sizeClassName="h-9 w-9 text-xs"
								/>

								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium text-arsm-primary dark:text-arsm-primary-dark">
										{displayName}
									</p>
									<p className="truncate text-xs text-arsm-label dark:text-arsm-label-dark">{mechanic.email}</p>
								</div>

								{canRemoveMechanic && (
									<button
										type="button"
										onClick={() => openDeleteModal(mechanic)}
										title={t('admin.deleteMechanic')}
										aria-label={t('admin.deleteMechanic')}
										className={`ml-auto ${iconDangerButtonClass}`}
									>
										<Trash2 className="h-4 w-4" aria-hidden="true" />
									</button>
								)}
							</div>
						);
					})}
				</div>
			)}

			<Modal
				isOpen={deleteTarget !== null}
				onClose={closeDeleteModal}
				title={t('admin.deleteMechanicModalTitle')}
				variant="confirm"
				footer={(
					<>
						<button
							type="button"
							onClick={closeDeleteModal}
							disabled={isDeleting}
							className={secondaryButtonClass}
						>
							{t('settings.cancel')}
						</button>
						<button
							type="button"
							onClick={() => {
								void handleDelete();
							}}
							disabled={isDeleting || !deleteTarget}
							className={dangerButtonClass}
						>
							{isDeleting ? t('admin.deleting') : t('admin.confirmDelete')}
						</button>
					</>
				)}
			>
				<p className="break-words text-sm text-arsm-label dark:text-arsm-label-dark [overflow-wrap:anywhere]">
					{t('admin.deleteMechanicWarning', {
						name: deleteTarget ? `${deleteTarget.firstName} ${deleteTarget.lastName}` : '',
						email: deleteTarget?.email ?? '',
					})}
				</p>
			</Modal>
		</>
	);
});
