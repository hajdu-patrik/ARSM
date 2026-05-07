/**
 * Settings delete-profile danger zone section.
 * @module pages/Settings/sections/DeleteProfileSection
 */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

interface DeleteProfileSectionProps {
	readonly onDeleteRequest: () => void;
}

const DeleteProfileSectionComponent = memo(function DeleteProfileSection({
	onDeleteRequest,
}: DeleteProfileSectionProps) {
	const { t } = useTranslation();

	return (
		<div className="relative overflow-hidden rounded-2xl border border-arsm-error-border-light bg-arsm-error-bg p-5 dark:border-arsm-error-dark dark:bg-arsm-error-bg-dark sm:p-6">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-[linear-gradient(180deg,rgba(215,82,94,0.06)_0%,rgba(215,82,94,0)_100%)] dark:bg-[linear-gradient(180deg,rgba(215,82,94,0.08)_0%,rgba(215,82,94,0)_100%)]"
			/>
			<h2 className="text-lg font-semibold text-arsm-error-text dark:text-arsm-error-soft">
				{t('settings.deleteProfileTitle')}
			</h2>
			<p className="mt-2 text-sm text-arsm-error-hover dark:text-arsm-error-text-light/85">
				{t('settings.deleteProfileDescription')}
			</p>
			<button
				type="button"
				onClick={onDeleteRequest}
				className="mt-4 inline-flex items-center justify-center rounded-xl border border-arsm-error-border bg-transparent px-5 py-2.5 text-sm font-semibold text-arsm-error-accent transition-all duration-200 hover:-translate-y-px hover:bg-arsm-error-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-arsm-error-hover/40 dark:border-arsm-error-dark dark:text-arsm-error-text-light dark:hover:bg-arsm-error-bg-dark"
			>
				{t('settings.deleteProfileButton')}
			</button>
		</div>
	);
});

DeleteProfileSectionComponent.displayName = 'DeleteProfileSection';

export const DeleteProfileSection = DeleteProfileSectionComponent;