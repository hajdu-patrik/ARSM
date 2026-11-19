/** Profile picture crop modal: a round cropper with zoom that hands the cropped WebP blob to the caller. */

import { memo, useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { cropImageToBlob } from '../../utils/imageCrop';
import { useToastStore } from '../../store/toast.store';
import {
  buttonClass,
  compactDataSurfaceClass,
  defaultBorderToneClass,
  labelClass,
  mutedSecondaryTextClass,
  relativeOverflowBorderLayoutClass,
  secondaryButtonClass,
} from '../../utils/formStyles';

interface ProfilePictureCropModalProps {
  readonly isOpen: boolean;
  readonly imageSrc: string | null;
  readonly isSubmitting: boolean;
  readonly onCancel: () => void;
  readonly onConfirm: (croppedImage: Blob) => void;
}

/** Crops the picked picture to a square and confirms it; a failed crop shows an error toast. */
export const ProfilePictureCropModal = memo(function ProfilePictureCropModal({
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
  const [isCropping, setIsCropping] = useState(false);

  const handleCropComplete = useCallback((_area: Area, areaPixels: Area) => {
    setCroppedAreaPixels(areaPixels);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!imageSrc || !croppedAreaPixels || isCropping) {
      return;
    }

    let croppedBlob: Blob;
    setIsCropping(true);
    try {
      croppedBlob = await cropImageToBlob(imageSrc, croppedAreaPixels, 'image/webp');
    } catch {
      showErrorToast('toast.pictureCropFailed');
      return;
    } finally {
      setIsCropping(false);
    }

    onConfirm(croppedBlob);
  }, [croppedAreaPixels, imageSrc, isCropping, onConfirm, showErrorToast]);

  // A close while the crop runs would still end in an upload, so every close path waits for it.
  const handleCancel = useCallback(() => {
    if (!isCropping) {
      onCancel();
    }
  }, [isCropping, onCancel]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={t('settings.cropModalTitle')}
      widthClassName="max-w-2xl"
      footer={(
        <>
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting || isCropping}
            className={secondaryButtonClass}
          >
            {t('common.actions.cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={isSubmitting || isCropping || !croppedAreaPixels}
            aria-busy={isSubmitting || isCropping}
            className={buttonClass}
          >
            {isSubmitting ? t('settings.uploading') : t('settings.cropAndUpload')}
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        <p className={`${compactDataSurfaceClass} ${mutedSecondaryTextClass}`}>
          {t('settings.cropModalHint')}
        </p>

        <div className={`${relativeOverflowBorderLayoutClass} ${defaultBorderToneClass} h-[min(320px,40dvh)] w-full bg-arsm-surface-dark sm:h-[360px]`}>
          {imageSrc && (
            <Cropper
              disableAutomaticStylesInjection
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

        <label htmlFor="crop-zoom" className={labelClass}>
          {t('settings.zoom')}
        </label>
        <input
          id="crop-zoom"
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(event) => {
            setZoom(Number(event.target.value));
          }}
          className="crop-zoom-slider w-full rounded-full"
          disabled={isSubmitting}
        />
      </div>
    </Modal>
  );
});
