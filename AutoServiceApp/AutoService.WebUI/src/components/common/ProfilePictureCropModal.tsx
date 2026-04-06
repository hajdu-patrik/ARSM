import { memo, useCallback, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { useTranslation } from 'react-i18next';
import { Modal } from './Modal';
import { cropImageToBlob } from '../../utils/imageCrop';

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

    const croppedBlob = await cropImageToBlob(imageSrc, croppedAreaPixels, 'image/png');
    await onConfirm(croppedBlob);
  }, [croppedAreaPixels, imageSrc, onConfirm]);

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
            className="inline-flex items-center justify-center rounded-xl border border-[#D8D2E9] bg-transparent px-4 py-2 text-sm font-medium text-[#5E5672] transition hover:bg-[#EFEBFA] disabled:cursor-not-allowed disabled:opacity-70 dark:border-[#3A3154] dark:text-[#CFC5EA] dark:hover:bg-[#241F33]"
          >
            {t('settings.cancel')}
          </button>

          <button
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={isSubmitting || !croppedAreaPixels}
            className="inline-flex items-center justify-center rounded-xl bg-[#C9B3FF] px-4 py-2 text-sm font-semibold text-[#2C2440] transition hover:bg-[#BFA6F7] disabled:cursor-not-allowed disabled:bg-[#DCCDFA] dark:bg-[#7A66C7] dark:text-[#F5F2FF] dark:hover:bg-[#8A75D6] dark:disabled:bg-[#4B406E]"
          >
            {isSubmitting ? t('settings.uploading') : t('settings.cropAndUpload')}
          </button>
        </>
      )}
    >
      <div className="space-y-4">
        <p className="text-sm text-[#6A627F] dark:text-[#B9B0D3]">
          {t('settings.cropModalHint')}
        </p>

        <div className="relative h-[320px] w-full overflow-hidden rounded-xl bg-[#09090F] sm:h-[360px]">
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

        <label htmlFor="crop-zoom" className="block text-sm font-medium text-[#5E5672] dark:text-[#CFC5EA]">
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
