/**
 * Profile picture crop dialog. Allows the user to pan, zoom, and crop
 * an uploaded image to a circular 1:1 aspect ratio before uploading.
 * @module ProfilePictureCropModal
 */
import { memo, useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { cropImageToBlob } from '../../utils/imageCrop';
import { useToastStore } from '../../store/toast.store';

/** Props for the {@link ProfilePictureCropModal} component. */
interface ProfilePictureCropModalProps {
  /** Whether the crop modal is currently visible. */
  readonly isOpen: boolean;
  /** Data URL of the selected image to crop, or null when no image is selected. */
  readonly imageSrc: string | null;
  /** Whether a crop/upload operation is currently in progress. */
  readonly isSubmitting: boolean;
  /** Callback invoked when the user cancels the crop. */
  readonly onCancel: () => void;
  /** Callback invoked with the cropped image blob when the user confirms. */
  readonly onConfirm: (croppedImage: Blob) => Promise<void>;
}

/** Memoized crop modal with pan/zoom controls, cancel/confirm actions, and error toast feedback. */
const ProfilePictureCropModalComponent = memo(function ProfilePictureCropModal({
  isOpen,
  imageSrc,
  isSubmitting,
  onCancel,
  onConfirm,
}: ProfilePictureCropModalProps) {
  const { t } = useTranslation();
  const showErrorToast = useToastStore((state) => state.showError);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels) {
      return;
    }

    let croppedBlob: Blob;
    try {
      croppedBlob = await cropImageToBlob(imageSrc, croppedAreaPixels, 'image/png');
    } catch {
      showErrorToast('toast.pictureCropFailed');
      return;
    }

    try {
      await onConfirm(croppedBlob);
    } catch {
      // Parent submit handler owns upload-level error feedback.
    }
  }, [croppedAreaPixels, imageSrc, onConfirm, showErrorToast]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={t('settings.cropModalTitle')}
      widthClassName="max-w-2xl"
      footer={(
        <>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-xl border border-arsm-border bg-transparent px-4 py-2 text-sm font-medium text-arsm-label transition hover:bg-arsm-toggle-bg disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark"
          >
            {t('settings.cancel')}
          </button>

          <button
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={isSubmitting || !croppedAreaPixels}
            className="inline-flex items-center justify-center rounded-xl bg-arsm-accent px-4 py-2 text-sm font-semibold text-arsm-primary transition hover:bg-arsm-accent-hover disabled:cursor-not-allowed disabled:bg-arsm-accent-border dark:bg-arsm-accent-dark dark:text-arsm-hover dark:hover:bg-arsm-accent-dark-hover dark:disabled:bg-arsm-ring-dark"
          >
            {isSubmitting ? t('settings.uploading') : t('settings.cropAndUpload')}
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        <p className="text-sm text-arsm-muted dark:text-arsm-muted-dark">
          {t('settings.cropModalHint')}
        </p>

        <div className="relative h-[320px] w-full overflow-hidden rounded-xl bg-arsm-surface-dark sm:h-[360px]">
          {imageSrc && (
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={1}
              cropShape="round"
              showGrid={false}
              minZoom={1}
              maxZoom={3}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={handleCropComplete}
            />
          )}
        </div>

        <label htmlFor="crop-zoom" className="block text-sm font-medium text-arsm-label dark:text-arsm-label-dark">
          {t('settings.zoom')}
        </label>
        <input
          id="crop-zoom"
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(event) => setZoom(Number(event.target.value))}
          className="crop-zoom-slider w-full"
          disabled={isSubmitting}
        />
      </div>
    </Modal>
  );
});

ProfilePictureCropModalComponent.displayName = 'ProfilePictureCropModal';

export const ProfilePictureCropModal = ProfilePictureCropModalComponent;
