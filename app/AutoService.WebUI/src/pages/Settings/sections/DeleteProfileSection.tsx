/** Settings delete-profile danger zone section. */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { dangerButtonClass, defaultIconClass, relativeOverflowBorderLayoutClass, toneFeedbackClasses } from '../../../utils/formStyles';

interface DeleteProfileSectionProps {
	readonly onDeleteRequest: () => void;
}

const DeleteProfileSectionComponent = memo(function DeleteProfileSection({
	onDeleteRequest,
}: DeleteProfileSectionProps) {
	const { t: translate } = useTranslation();

	return (
		<div className={`${relativeOverflowBorderLayoutClass} ${toneFeedbackClasses.error} p-5 sm:p-6`}>
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