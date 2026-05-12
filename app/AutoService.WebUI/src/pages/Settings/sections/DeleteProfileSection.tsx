/**
 * Settings delete-profile danger zone section.
 * @module pages/Settings/sections/DeleteProfileSection
 */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { dangerButtonClass } from '../constants';

interface DeleteProfileSectionProps {
	readonly onDeleteRequest: () => void;
}

const DeleteProfileSectionComponent = memo(function DeleteProfileSection({
	onDeleteRequest,
}: DeleteProfileSectionProps) {
	const { t: translate } = useTranslation();

	return (
		<div className="relative overflow-hidden rounded-2xl border border-arsm-error-border-light bg-arsm-error-bg p-5 dark:border-arsm-error-dark dark:bg-arsm-error-bg-dark sm:p-6">
			<div
				aria-hidden="true"
				className="arsm-error-sheen pointer-events-none absolute inset-x-0 top-0 h-12"
			/>
			<h2 className="text-lg font-semibold text-arsm-error-text dark:text-arsm-error-soft">
				{translate('settings.deleteProfileTitle')}
			</h2>
			<p className="mt-2 text-sm text-arsm-error-hover dark:text-arsm-error-text-light/85">
				{translate('settings.deleteProfileDescription')}
			</p>
			<button
				type="button"
				onClick={onDeleteRequest}
				className={`mt-4 ${dangerButtonClass}`}
			>
				{translate('settings.deleteProfileButton')}
			</button>
		</div>
	);
});

DeleteProfileSectionComponent.displayName = 'DeleteProfileSection';

export const DeleteProfileSection = DeleteProfileSectionComponent;