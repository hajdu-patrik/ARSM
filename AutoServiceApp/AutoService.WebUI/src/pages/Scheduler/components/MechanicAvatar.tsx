import { memo, useEffect, useMemo, useState } from 'react';
import { profileService } from '../../../services/profile.service';
import { PROFILE_PICTURE_UPDATED_EVENT } from '../../../services/profile-picture-live.service';
import { getDeterministicAvatarColor } from '../../../utils/avatar';

interface MechanicAvatarProps {
  readonly mechanicId: number;
  readonly fullName: string;
  readonly hasProfilePicture: boolean;
  readonly sizeClassName?: string;
  readonly className?: string;
}

function getInitialsFromFullName(fullName: string): string {
  const initials = fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((segment) => segment[0]?.toUpperCase() ?? '')
    .join('');

  return initials.length > 0 ? initials : '??';
}

const MechanicAvatarComponent = memo(function MechanicAvatar({
  mechanicId,
  fullName,
  hasProfilePicture,
  sizeClassName = 'h-7 w-7 text-xs',
  className,
}: MechanicAvatarProps) {
  const [liveHasProfilePicture, setLiveHasProfilePicture] = useState<boolean | null>(null);
  const [failedImageKey, setFailedImageKey] = useState<string | null>(null);
  const [cacheBuster, setCacheBuster] = useState(0);

  useEffect(() => {
    const handleProfilePictureUpdated = (event: Event) => {
      const customEvent = event as CustomEvent<{ personId?: number; hasProfilePicture?: boolean; cacheBuster?: number }>;
      if (customEvent.detail?.personId !== mechanicId) {
        return;
      }

      setLiveHasProfilePicture(customEvent.detail?.hasProfilePicture ?? true);
      setCacheBuster(customEvent.detail?.cacheBuster ?? Date.now());
      setFailedImageKey(null);
    };

    globalThis.addEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated as EventListener);
    return () => {
      globalThis.removeEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated as EventListener);
    };
  }, [mechanicId]);

  const resolvedHasProfilePicture = liveHasProfilePicture ?? hasProfilePicture;
  const imageCacheKey = `${mechanicId}:${cacheBuster}:${resolvedHasProfilePicture ? '1' : '0'}`;
  const shouldShowProfilePicture = resolvedHasProfilePicture && failedImageKey !== imageCacheKey;
  const initials = useMemo(() => getInitialsFromFullName(fullName), [fullName]);
  const fallbackColorClass = getDeterministicAvatarColor(mechanicId);

  if (shouldShowProfilePicture) {
    return (
      <img
        src={`${profileService.getMechanicProfilePictureUrl(mechanicId)}?v=${cacheBuster}`}
        alt={fullName}
        className={`inline-flex shrink-0 overflow-hidden rounded-full border border-[#D8D2E9] object-cover dark:border-[#3A3154] ${sizeClassName} ${className ?? ''}`}
        onError={() => setFailedImageKey(imageCacheKey)}
      />
    );
  }

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold ${sizeClassName} ${fallbackColorClass} ${className ?? ''}`}
      title={fullName}
      aria-label={fullName}
    >
      {initials}
    </div>
  );
});

MechanicAvatarComponent.displayName = 'MechanicAvatar';

export const MechanicAvatar = MechanicAvatarComponent;