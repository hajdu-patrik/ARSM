/**
 * Settings profile-picture section.
 *
 * Handles upload trigger, current picture preview, deterministic fallback
 * avatar display, and picture removal action.
 * @module pages/Settings/sections/ProfilePictureSection
 */

import { memo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { cardClass, buttonClass } from '../constants';

/** Props for the {@link ProfilePictureSection} component. */
interface ProfilePictureSectionProps {
  /** Whether the user currently has an uploaded profile picture. */
  readonly hasProfilePicture: boolean;
  /** URL to fetch the current profile picture. */
  readonly pictureUrl: string;
  /** Initials string for the deterministic fallback avatar. */
  readonly initials: string;
  /** Tailwind color class for the fallback avatar background. */
  readonly fallbackColorClass: string;
  /** Cache-busting key incremented after upload/remove to force image reload. */
  readonly pictureKey: number;
  /** Whether an upload or remove operation is in progress. */
  readonly isUploading: boolean;
  /** Callback invoked when the user selects a file for upload. */
  readonly onSelectFile: (file: File) => void;
  /** Callback invoked when the user clicks remove picture. */
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

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onSelectFile(file);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [onSelectFile],
  );

  const handleUploadClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  }, []);

  return (
    <div className={cardClass}>
      <h2 className="mb-4 text-lg font-semibold text-arsm-primary dark:text-arsm-primary-dark">
        {t('settings.profilePicture')}
      </h2>

      <div className="flex items-center gap-5">
        {hasProfilePicture ? (
          <img
            key={pictureKey}
            src={pictureUrl}
            alt={t('settings.profilePictureAlt')}
            className="h-20 w-20 rounded-full object-cover border-2 border-arsm-accent dark:border-arsm-accent-dark"
          />
        ) : (
          <div className={`flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold ${fallbackColorClass}`}>
            {initials}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleUploadClick}
            disabled={isUploading}
            className={buttonClass}
          >
            {isUploading ? t('settings.uploading') : t('settings.uploadPicture')}
          </button>

          {hasProfilePicture && (
            <button
              type="button"
              onClick={onRemove}
              disabled={isUploading}
              className="inline-flex items-center justify-center rounded-xl border border-red-300 bg-transparent px-6 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-70 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:focus-visible:ring-red-700"
            >
              {t('settings.removePicture')}
            </button>
          )}
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

/** Profile picture section with upload, remove, and deterministic fallback avatar. */
export const ProfilePictureSection = ProfilePictureSectionComponent;
