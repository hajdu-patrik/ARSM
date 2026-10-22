/** Profile picture workflow for Settings: inspection of the picked file, the crop step and the upload and removal mutations. */

import { useCallback, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { emitProfilePictureUpdated } from '../../../services/profile/profile-picture-live.service';
import { profileService } from '../../../services/profile/profile.service';
import type { ProfileData } from '../../../types/profile/profile.types';
import { fileToImageSource } from '../../../utils/imageCrop';
import {
  MAX_PICTURE_MEGAPIXELS,
  MAX_PICTURE_SIDE_PX,
  findPictureRejection,
  hasAllowedPictureType,
} from '../../../utils/imageInspection';
import { useProfileCache } from './useProfileCache';

const MAX_PROFILE_PICTURE_BYTES = 4 * 1024 * 1024;
const MAX_PROFILE_PICTURE_MB = MAX_PROFILE_PICTURE_BYTES / (1024 * 1024);
const CROPPED_PICTURE_TYPE = 'image/webp';
const CROPPED_PICTURE_EXTENSION = '.webp';

interface UseProfilePictureSettingsParams {
  profile: ProfileData | null;
  showSuccessToast: (message: string, options?: Record<string, string | number>) => void;
  showErrorToast: (message: string, options?: Record<string, string | number>) => void;
}

export function useProfilePictureSettings({
  profile,
  showSuccessToast,
  showErrorToast,
}: UseProfilePictureSettingsParams) {
  const { storePictureState, invalidateRoster } = useProfileCache();
  const [pictureKey, setPictureKey] = useState(0);
  const [pictureSource, setPictureSource] = useState<string | null>(null);
  const [pendingPictureFileName, setPendingPictureFileName] = useState<string | null>(null);
  const [isPictureRemoveConfirmOpen, setIsPictureRemoveConfirmOpen] = useState(false);

  const closePictureCropModal = useCallback(() => {
    setPictureSource(null);
    setPendingPictureFileName(null);
  }, []);

  /** Mirrors a changed picture into the profile cache, the admin roster, the preview key and the live-update event. */
  const applyPictureChange = useCallback((hasProfilePicture: boolean) => {
    storePictureState(hasProfilePicture);
    invalidateRoster();
    setPictureKey((previousKey) => previousKey + 1);

    if (profile) {
      emitProfilePictureUpdated({ personId: profile.personId, hasProfilePicture });
    }
  }, [invalidateRoster, profile, storePictureState]);

  const { mutate: uploadPicture, isPending: isUploadingFile } = useMutation({
    mutationFn: (file: File) => profileService.uploadProfilePicture(file),
    onSuccess: () => {
      applyPictureChange(true);
      closePictureCropModal();
      showSuccessToast('toast.pictureUploaded');
    },
    onError: () => {
      showErrorToast('toast.pictureUploadFailed');
    },
  });

  const { mutate: removePicture, isPending: isRemovingPicture } = useMutation({
    mutationFn: () => profileService.deleteProfilePicture(),
    onSuccess: () => {
      applyPictureChange(false);
      showSuccessToast('toast.pictureRemoved');
      setIsPictureRemoveConfirmOpen(false);
    },
    onError: () => {
      showErrorToast('toast.pictureRemoveFailed');
    },
  });

  const isUploadingPicture = isUploadingFile || isRemovingPicture;

  const handleSelectPicture = useCallback(async (file: File) => {
    if (!hasAllowedPictureType(file)) {
      showErrorToast('toast.pictureInvalidType');
      return;
    }

    if (file.size > MAX_PROFILE_PICTURE_BYTES) {
      showErrorToast('toast.pictureTooLarge', { maxMb: MAX_PROFILE_PICTURE_MB });
      return;
    }

    try {
      // The magic bytes and the pixel size come from the file head, so nothing is decoded before they pass.
      const rejection = await findPictureRejection(file);
      if (rejection === 'invalid-type') {
        showErrorToast('toast.pictureInvalidType');
        return;
      }

      if (rejection === 'dimensions-too-large') {
        showErrorToast('toast.pictureDimensionsTooLarge', {
          maxSide: MAX_PICTURE_SIDE_PX,
          maxMegapixels: MAX_PICTURE_MEGAPIXELS,
        });
        return;
      }

      const imageSource = await fileToImageSource(file);
      setPendingPictureFileName(file.name);
      setPictureSource(imageSource);
    } catch {
      showErrorToast('toast.pictureCropFailed');
    }
  }, [showErrorToast]);

  const handleConfirmPictureCrop = useCallback((blob: Blob) => {
    if (!profile) {
      return;
    }

    // Cropping re-encodes the image, so the cropped blob is size-checked too, not just the source file (CLAUDE.md).
    if (blob.size > MAX_PROFILE_PICTURE_BYTES) {
      showErrorToast('toast.pictureTooLarge', { maxMb: MAX_PROFILE_PICTURE_MB });
      return;
    }

    const baseFileName = pendingPictureFileName?.replace(/\.[^.]+$/, '') ?? 'profile-picture';
    uploadPicture(new File(
      [blob],
      `${baseFileName}${CROPPED_PICTURE_EXTENSION}`,
      { type: blob.type || CROPPED_PICTURE_TYPE },
    ));
  }, [pendingPictureFileName, profile, showErrorToast, uploadPicture]);

  const handleRemovePicture = useCallback(() => {
    if (profile) {
      removePicture();
    }
  }, [profile, removePicture]);

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
