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
            className="inline-flex items-center justify-center rounded-xl border border-arsm-border bg-transparent px-4 py-2 text-sm font-medium text-arsm-label transition-all duration-200 hover:-translate-y-px hover:bg-arsm-toggle-bg hover:shadow-[0_6px_16px_rgba(45,36,64,0.08)] disabled:cursor-not-allowed disabled:opacity-70 dark:border-arsm-border-dark dark:text-arsm-label-dark dark:hover:bg-arsm-toggle-bg-dark dark:hover:shadow-[0_6px_16px_rgba(3,5,14,0.28)]"
          >
            {t('settings.cancel')}
          </button>

          <button
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={isSubmitting || !croppedAreaPixels}
            className="inline-flex items-center justify-center rounded-xl bg-arsm-accent px-4 py-2 text-sm font-semibold text-arsm-primary shadow-[0_10px_24px_rgba(111,84,173,0.28)] transition-all duration-200 hover:-translate-y-px hover:bg-arsm-accent-hover hover:shadow-[0_14px_28px_rgba(111,84,173,0.32)] disabled:cursor-not-allowed disabled:bg-arsm-accent-border disabled:shadow-none dark:bg-arsm-accent-dark dark:text-arsm-hover dark:shadow-[0_12px_24px_rgba(8,10,20,0.5)] dark:hover:bg-arsm-accent-dark-hover dark:hover:shadow-[0_16px_30px_rgba(8,10,20,0.58)] dark:disabled:bg-arsm-ring-dark"
          >
            {isSubmitting ? t('settings.uploading') : t('settings.cropAndUpload')}
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        <p className="rounded-xl border border-arsm-border bg-arsm-input/75 px-3.5 py-2.5 text-sm text-arsm-muted shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] dark:border-arsm-border-dark dark:bg-arsm-input-dark/70 dark:text-arsm-muted-dark dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          {t('settings.cropModalHint')}
        </p>

        <div className="relative h-[320px] w-full overflow-hidden rounded-2xl border border-arsm-border bg-arsm-surface-dark shadow-[0_16px_34px_rgba(3,5,14,0.35)] dark:border-arsm-border-dark sm:h-[360px]">
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
          className="crop-zoom-slider w-full rounded-full"
          disabled={isSubmitting}
        />
      </div>
    </Modal>
  );
});

ProfilePictureCropModalComponent.displayName = 'ProfilePictureCropModal';

export const ProfilePictureCropModal = ProfilePictureCropModalComponent;
