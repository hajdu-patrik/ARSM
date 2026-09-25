/**
 * Settings delete-profile danger zone section.
 * @module pages/Settings/sections/DeleteProfileSection
 */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { defaultIconClass, toneFeedbackClasses } from '../../../utils/formStyles';
import { dangerButtonClass, relativeOverflowBorderLayoutClass } from '../constants';

interface DeleteProfileSectionProps {
	readonly onDeleteRequest: () => void;
}

const DeleteProfileSectionComponent = memo(function DeleteProfileSection({
	onDeleteRequest,
}: DeleteProfileSectionProps) {
	const { t: translate } = useTranslation();

	return (
		<div className={`${relativeOverflowBorderLayoutClass} ${toneFeedbackClasses.error} p-5 sm:p-6`}>
			<div
				aria-hidden="true"
				className="arsm-error-sheen pointer-events-none absolute inset-x-0 top-0 h-12"
			/>
			<h2 className="text-lg font-semibold">
				{translate('settings.deleteProfileTitle')}
			</h2>
			<p className="mt-2 text-sm">
				{translate('settings.deleteProfileDescription')}
			</p>
			<button
				type="button"
				onClick={onDeleteRequest}
				className={`mt-4 w-full ${dangerButtonClass}`}
			>
				<Trash2 className={defaultIconClass} />
				<span>{translate('settings.deleteProfileTitle')}</span>
			</button>
		</div>
	);
});

DeleteProfileSectionComponent.displayName = 'DeleteProfileSection';

export const DeleteProfileSection = DeleteProfileSectionComponent;