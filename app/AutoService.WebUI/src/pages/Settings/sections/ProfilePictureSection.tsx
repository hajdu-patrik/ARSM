/**
 * Settings profile-picture section.
 * Handles upload trigger, current picture preview, fallback avatar, and removal action.
 * @module pages/Settings/sections/ProfilePictureSection
 */
import { memo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { actionClusterClass, buttonClass, cardClass, dangerButtonClass, sectionTitleClass } from '../constants';

interface ProfilePictureSectionProps {
	readonly hasProfilePicture: boolean;
	readonly pictureUrl: string;
	readonly initials: string;
	readonly fallbackColorClass: string;
	readonly pictureKey: number;
	readonly isUploading: boolean;
	readonly onSelectFile: (file: File) => void;
	readonly onRemove: () => void;
}

const ProfilePictureSectionComponent = memo(function ProfilePictureSection({
	hasProfilePicture,
	pictureUrl,
	initials,
	fallbackColorClass,
	pictureKey,
	isUploading,
	onSelectFile,
	onRemove,
}: ProfilePictureSectionProps) {
	const { t } = useTranslation();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			onSelectFile(file);
		}

		if (fileInputRef.current) {
			fileInputRef.current.value = '';
		}
	}, [onSelectFile]);

	const handleUploadClick = useCallback(() => {
		if (fileInputRef.current) {
			fileInputRef.current.value = '';
			fileInputRef.current.click();
		}
	}, []);

	return (
		<div className={cardClass}>
			<h2 className={sectionTitleClass}>
				{t('settings.profilePicture')}
			</h2>

			<div className="flex min-w-0 flex-wrap items-center gap-5 sm:flex-nowrap">
				{hasProfilePicture ? (
					<img
						key={pictureKey}
						src={pictureUrl}
						alt={t('settings.profilePictureAlt')}
						className="h-20 w-20 rounded-full border-2 border-arsm-accent/50 object-cover ring-3 ring-arsm-accent/15 dark:border-arsm-accent-dark/60 dark:ring-arsm-accent-dark/15"
					/>
				) : (
					<div className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold ${fallbackColorClass}`}>
						{initials}
					</div>
				)}

				<div className="flex min-h-20 min-w-0 flex-1 items-center">
					<div className={actionClusterClass}>
						<button type="button" onClick={handleUploadClick} disabled={isUploading} className={`${buttonClass} min-h-11`}>
							{isUploading ? t('settings.uploading') : t('settings.uploadPicture')}
						</button>

						{hasProfilePicture && (
							<button
								type="button"
								onClick={onRemove}
								disabled={isUploading}
								className={`${dangerButtonClass} min-h-11`}
							>
								{t('settings.removePicture')}
							</button>
						)}
					</div>
				</div>

				<input
					ref={fileInputRef}
					type="file"
					accept="image/jpeg,image/png,image/webp"
					onChange={handleFileChange}
					className="hidden"
					aria-label={t('settings.uploadPicture')}
				/>
			</div>

			<p className="mt-3 text-xs text-arsm-placeholder dark:text-arsm-placeholder-dark">
				{t('settings.pictureHint')}
			</p>
		</div>
	);
});

ProfilePictureSectionComponent.displayName = 'ProfilePictureSection';

export const ProfilePictureSection = ProfilePictureSectionComponent;
