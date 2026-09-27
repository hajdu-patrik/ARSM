import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { useToastStore } from '../../../../store/toast.store';
import { Modal } from '../../../../components/common/Modal';
import { MechanicAvatar } from '../../../Scheduler/components/shared/MechanicAvatar';
import { buildMechanicDisplayName } from '../helpers';
import { useMechanicListState } from '../useMechanicListState';
import { MECHANIC_LIST_VISIBLE_ROW_COUNT } from '../constants';
import { MechanicListToolbar } from './MechanicListToolbar';
import {
	compactInputSurfaceClass,
	compactListPrimaryTextClass,
	compactListSecondaryTextClass,
	dangerButtonClass,
	defaultIconClass,
	emptyStateBoxClass,
	iconDangerButtonClass,
	loadingSpinnerClass,
	mutedBodyTextClass,
	rowHoverMotionClass,
	secondaryButtonClass,
} from '../../../../utils/formStyles';

interface MechanicListSectionProps {
	readonly refreshKey: number;
}

/** Renders the admin mechanic roster with search, sort, a scrollable window, and delete actions. */
export const MechanicListSection = memo(function MechanicListSection({ refreshKey }: MechanicListSectionProps) {
	const { t, i18n } = useTranslation();
	const showSuccessToast = useToastStore((state) => state.showSuccess);
	const showErrorToast = useToastStore((state) => state.showError);

	const {
		isLoading,
		mechanics,
		searchTerm,
		setSearchTerm,
		sortDirection,
		toggleSortDirection,
		clearSearch,
		visibleMechanics,
		deleteTarget,
		isDeleting,
		openDeleteModal,
		closeDeleteModal,
		handleDelete,
	} = useMechanicListState({
		refreshKey,
		language: i18n.language,
		showErrorToast,
		showSuccessToast,
	});

	const listContainerRef = useRef<HTMLDivElement>(null);
	const [firstRowNode, setFirstRowNode] = useState<HTMLDivElement | null>(null);
	const firstRowRef = useCallback((node: HTMLDivElement | null) => {
		setFirstRowNode(node);
	}, []);
	const [listMaxHeight, setListMaxHeight] = useState<number | undefined>(undefined);
	const hasVisibleRows = visibleMechanics.length > 0;

	useEffect(() => {
		const containerElement = listContainerRef.current;

		if (!firstRowNode || !containerElement) {
			return;
		}

		const updateListMaxHeight = () => {
			const rowHeight = firstRowNode.getBoundingClientRect().height;
			const rowGap = Number.parseFloat(getComputedStyle(containerElement).rowGap || '0');
			setListMaxHeight((rowHeight * MECHANIC_LIST_VISIBLE_ROW_COUNT) + (rowGap * (MECHANIC_LIST_VISIBLE_ROW_COUNT - 1)));
		};

		updateListMaxHeight();

		const resizeObserver = new ResizeObserver(updateListMaxHeight);
		resizeObserver.observe(firstRowNode);

		return () => resizeObserver.disconnect();
	}, [firstRowNode]);

	const removableMechanicCount = useMemo(
		() => mechanics.filter((item) => !item.isAdmin).length,
		[mechanics],
	);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className={`h-8 w-8 ${loadingSpinnerClass}`} />
			</div>
		);
	}

	return (
		<>
			{mechanics.length === 0 ? (
				<p className={emptyStateBoxClass}>{t('admin.noMechanics')}</p>
			) : (
				<div className="space-y-3">
					<MechanicListToolbar
						t={t}
						searchTerm={searchTerm}
						sortDirection={sortDirection}
						onSearchChange={setSearchTerm}
						onClearSearch={clearSearch}
						onToggleSortDirection={toggleSortDirection}
					/>

					{hasVisibleRows ? (
						<div
							ref={listContainerRef}
							className="flex flex-col gap-3 overflow-y-auto"
							style={listMaxHeight === undefined ? undefined : { maxHeight: `${listMaxHeight}px` }}
						>
							{visibleMechanics.map((mechanic, index) => {
								const canRemoveMechanic = !mechanic.isAdmin && removableMechanicCount > 1;
								const displayName = buildMechanicDisplayName(mechanic);

								return (
									<div
										key={mechanic.personId}
										ref={index === 0 ? firstRowRef : undefined}
										className={`relative flex min-w-0 items-start gap-3 px-4 py-3 ${rowHoverMotionClass} hover:-translate-y-px sm:items-center ${compactInputSurfaceClass}`}
									>
										<MechanicAvatar
											mechanicId={mechanic.personId}
											fullName={displayName}
											hasProfilePicture={Boolean(mechanic.hasProfilePicture)}
											sizeClassName="h-9 w-9 text-xs"
										/>

										<div className="min-w-0 flex-1">
											<p className={compactListPrimaryTextClass}>
												{displayName}
											</p>
											<p className={compactListSecondaryTextClass}>{mechanic.email}</p>
										</div>

										{canRemoveMechanic && (
											<button
												type="button"
												onClick={() => openDeleteModal(mechanic)}
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
							onClick={() => {
								void handleDelete();
							}}
							disabled={isDeleting || !deleteTarget}
							aria-busy={isDeleting}
							className={dangerButtonClass}
						>
							<Trash2 className={defaultIconClass} />
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
