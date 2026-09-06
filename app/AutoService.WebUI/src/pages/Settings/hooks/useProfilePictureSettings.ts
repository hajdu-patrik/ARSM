import { useCallback, useState } from 'react';
import { profileService } from '../../../services/profile/profile.service';
import { fileToImageSource } from '../../../utils/imageCrop';
import { isAllowedPictureExtension } from '../../../utils/validation';
import { emitProfilePictureUpdated } from '../../../services/profile/profile-picture-live.service';
import type { ProfileData } from '../../../types/profile/profile.types';

const MAX_PROFILE_PICTURE_BYTES = 4 * 1024 * 1024;
const MAX_PROFILE_PICTURE_MB = MAX_PROFILE_PICTURE_BYTES / (1024 * 1024);
const CROPPED_PICTURE_TYPE = 'image/webp';
const CROPPED_PICTURE_EXTENSION = '.webp';

interface UseProfilePictureSettingsParams {
  profile: ProfileData | null;
  setProfile: React.Dispatch<React.SetStateAction<ProfileData | null>>;
  showSuccessToast: (message: string, options?: Record<string, string | number>) => void;
  showErrorToast: (message: string, options?: Record<string, string | number>) => void;
}

export function useProfilePictureSettings({
  profile,
  setProfile,
  showSuccessToast,
  showErrorToast,
}: UseProfilePictureSettingsParams) {
  const [isUploadingPicture, setIsUploadingPicture] = useState(false);
  const [pictureKey, setPictureKey] = useState(0);
  const [pictureSource, setPictureSource] = useState<string | null>(null);
  const [pendingPictureFileName, setPendingPictureFileName] = useState<string | null>(null);
  const [isPictureRemoveConfirmOpen, setIsPictureRemoveConfirmOpen] = useState(false);

  const handleSelectPicture = useCallback(async (file: File) => {
    if (!isAllowedPictureExtension(file.name)) {
      showErrorToast('toast.pictureInvalidType');
      return;
    }

    if (file.size > MAX_PROFILE_PICTURE_BYTES) {
      showErrorToast('toast.pictureTooLarge', { maxMb: MAX_PROFILE_PICTURE_MB });
      return;
    }

    try {
      const imageSource = await fileToImageSource(file);
      setPendingPictureFileName(file.name);
      setPictureSource(imageSource);
    } catch {
      showErrorToast('toast.pictureCropFailed');
    }
  }, [showErrorToast]);

  const closePictureCropModal = useCallback(() => {
    setPictureSource(null);
    setPendingPictureFileName(null);
  }, []);

  const handleConfirmPictureCrop = useCallback(async (blob: Blob) => {
    if (!profile) {
      return;
    }

    // Cropping re-encodes the image, so the size that actually travels to the server is the
    // cropped blob, not the file the user picked. Checking only the source would let an upload
    // through that the server then rejects.
    if (blob.size > MAX_PROFILE_PICTURE_BYTES) {
      showErrorToast('toast.pictureTooLarge', { maxMb: MAX_PROFILE_PICTURE_MB });
      return;
    }

    setIsUploadingPicture(true);

    try {
      const finalFileName = pendingPictureFileName?.replace(/\.[^.]+$/, '') ?? 'profile-picture';
      const croppedFile = new File(
        [blob],
        `${finalFileName}${CROPPED_PICTURE_EXTENSION}`,
        { type: blob.type || CROPPED_PICTURE_TYPE },
      );

      await profileService.uploadProfilePicture(croppedFile);
      setProfile((prev) => prev ? { ...prev, hasProfilePicture: true } : prev);
      setPictureKey((previousKey) => previousKey + 1);
      closePictureCropModal();

      emitProfilePictureUpdated({ personId: profile.personId, hasProfilePicture: true });

      showSuccessToast('toast.pictureUploaded');
    } catch {
      showErrorToast('toast.pictureUploadFailed');
    } finally {
      setIsUploadingPicture(false);
    }
  }, [closePictureCropModal, pendingPictureFileName, profile, setProfile, showErrorToast, showSuccessToast]);

  const handleRemovePicture = useCallback(async () => {
    if (!profile) {
      return;
    }

    setIsUploadingPicture(true);
    try {
      await profileService.deleteProfilePicture();
      setProfile((prev) => prev ? { ...prev, hasProfilePicture: false } : prev);
      setPictureKey((previousKey) => previousKey + 1);
      emitProfilePictureUpdated({ personId: profile.personId, hasProfilePicture: false });
      showSuccessToast('toast.pictureRemoved');
      setIsPictureRemoveConfirmOpen(false);
    } catch {
      showErrorToast('toast.pictureRemoveFailed');
    } finally {
      setIsUploadingPicture(false);
    }
  }, [profile, setProfile, showErrorToast, showSuccessToast]);

  const handleRemovePictureRequest = useCallback(() => {
    if (!isUploadingPicture) {
      setIsPictureRemoveConfirmOpen(true);
    }
  }, [isUploadingPicture]);

  return {
    isUploadingPicture,
    pictureKey,
    pictureSource,
    isPictureRemoveConfirmOpen,
    setIsPictureRemoveConfirmOpen,
    handleSelectPicture,
    closePictureCropModal,
    handleConfirmPictureCrop,
    handleRemovePicture,
    handleRemovePictureRequest,
  };
}
