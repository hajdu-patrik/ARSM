import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { useToastStore } from '../../../../store/toast.store';
import { HighlightedText } from '../../../../components/common/HighlightedText';
import { Modal } from '../../../../components/common/Modal';
import { Pagination } from '../../../../components/common/Pagination';
import { MechanicAvatar } from '../../../Scheduler/components/shared/MechanicAvatar';
import { buildMechanicDisplayName } from '../helpers';
import { useMechanicListState } from '../useMechanicListState';
import { MECHANIC_LIST_PAGE_SIZE } from '../constants';
import { MechanicListToolbar } from './MechanicListToolbar';
import {
	centeredLoadingWrapperClass,
	compactInputSurfaceClass,
	compactListPrimaryWrapTextClass,
	compactListSecondaryWrapTextClass,
	dangerButtonClass,
	defaultIconClass,
	emptyStateBoxClass,
	iconDangerButtonClass,
	loadingSpinnerClass,
	mutedBodyTextClass,
	rowHoverMotionClass,
	secondaryButtonClass,
} from '../../../../utils/formStyles';

/** Renders the admin mechanic roster: server-side search, fixed-size pages, and delete actions. */
export const MechanicListSection = memo(function MechanicListSection() {
	const { t } = useTranslation();
	const showSuccessToast = useToastStore((state) => state.showSuccess);
	const showErrorToast = useToastStore((state) => state.showError);

	const {
		isLoading,
		mechanics,
		totalCount,
		page,
		setPage,
		isPlaceholderData,
		removableMechanicCount,
		hasSearch,
		searchTerm,
		setSearchTerm,
		clearSearch,
		deleteTarget,
		isDeleting,
		openDeleteModal,
		closeDeleteModal,
		handleDelete,
	} = useMechanicListState({
		showErrorToast,
		showSuccessToast,
	});

	const highlightQuery = searchTerm.trim();

	if (isLoading) {
		return (
			<div role="status" className={centeredLoadingWrapperClass}>
				<div className={`h-8 w-8 ${loadingSpinnerClass}`} />
			</div>
		);
	}

	return (
		<>
			{totalCount === 0 && !hasSearch ? (
				<p className={emptyStateBoxClass}>{t('admin.noMechanics')}</p>
			) : (
				<div className="space-y-3">
					<MechanicListToolbar
						t={t}
						searchTerm={searchTerm}
						onSearchChange={setSearchTerm}
						onClearSearch={clearSearch}
					/>

					{mechanics.length > 0 ? (
						<div className="flex flex-col gap-3">
							{mechanics.map((mechanic) => {
								const canRemoveMechanic = !mechanic.isAdmin && removableMechanicCount > 1;
								const displayName = buildMechanicDisplayName(mechanic);

								return (
									<div
										key={mechanic.personId}
										className={`relative flex min-w-0 items-start gap-3 px-4 py-3 ${rowHoverMotionClass} hover:-translate-y-px sm:items-center ${compactInputSurfaceClass}`}
									>
										<MechanicAvatar
											mechanicId={mechanic.personId}
											fullName={displayName}
											hasProfilePicture={Boolean(mechanic.hasProfilePicture)}
											sizeClassName="h-9 w-9 text-xs"
										/>

										<div className="min-w-0 flex-1">
											<p className={compactListPrimaryWrapTextClass}>
												<HighlightedText text={displayName} query={highlightQuery} />
											</p>
											<p className={compactListSecondaryWrapTextClass}>
												<HighlightedText text={mechanic.email} query={highlightQuery} />
											</p>
										</div>

										{canRemoveMechanic && (
											<button
												type="button"
												onClick={() => {
													openDeleteModal(mechanic);
												}}
												title={t('admin.deleteMechanic')}
												aria-label={t('admin.deleteMechanic')}
												className={`ml-auto ${iconDangerButtonClass}`}
											>
												<Trash2 className={defaultIconClass} aria-hidden="true" />
											</button>
										)}
									</div>
								);
							})}
						</div>
					) : (
						<p className={emptyStateBoxClass}>{t('admin.noMechanicsFound')}</p>
					)}

					<Pagination
						page={page}
						totalCount={totalCount}
						pageSize={MECHANIC_LIST_PAGE_SIZE}
						onPageChange={setPage}
						isLoading={isPlaceholderData}
						testIdPrefix="mechanics-pagination"
					/>
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
							{t('common.actions.cancel')}
						</button>
						<button
							type="button"
							onClick={handleDelete}
							disabled={isDeleting || !deleteTarget}
							aria-busy={isDeleting}
							className={dangerButtonClass}
						>
							<Trash2 className={defaultIconClass} aria-hidden="true" />
							<span>{isDeleting ? t('common.actions.deleting') : t('admin.confirmDelete')}</span>
						</button>
					</>
				)}
			>
				<p className={`break-words ${mutedBodyTextClass} [overflow-wrap:anywhere]`}>
					{t('admin.deleteMechanicWarning', {
						name: deleteTarget ? `${deleteTarget.firstName} ${deleteTarget.lastName}` : '',
						email: deleteTarget?.email ?? '',
					})}
				</p>
			</Modal>
		</>
	);
});
