import { memo, useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { cropImageToBlob } from '../../utils/imageCrop';
import { useToastStore } from '../../store/toast.store';
import {
  buttonClass,
  defaultBorderToneClass,
  relativeOverflowBorderLayoutClass,
  secondaryButtonClass,
} from '../../utils/formStyles';

interface ProfilePictureCropModalProps {
  readonly isOpen: boolean;
  readonly imageSrc: string | null;
  readonly isSubmitting: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: (croppedImage: Blob) => Promise<void>;
}

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
      croppedBlob = await cropImageToBlob(imageSrc, croppedAreaPixels, 'image/webp');
    } catch {
      showErrorToast('toast.pictureCropFailed');
      return;
    }

    try {
      await onConfirm(croppedBlob);
    } catch {
      // Parent handler owns upload-level toasts.
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
            className={secondaryButtonClass}
          >
            {t('settings.cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={isSubmitting || !croppedAreaPixels}
            className={buttonClass}
          >
            {isSubmitting ? t('settings.uploading') : t('settings.cropAndUpload')}
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        <p className="rounded-xl border border-arsm-border bg-arsm-input/75 px-3.5 py-2.5 text-sm text-arsm-muted dark:border-arsm-border-dark dark:bg-arsm-input-dark/70 dark:text-arsm-muted-dark">
          {t('settings.cropModalHint')}
        </p>

        <div className={`${relativeOverflowBorderLayoutClass} ${defaultBorderToneClass} h-[320px] w-full bg-arsm-surface-dark sm:h-[360px]`}>
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
