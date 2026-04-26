/**
 * Shared mechanic avatar renderer used across scheduler components.
 * Shows a profile picture when available (with live SSE update support)
 * or falls back to a deterministic initials avatar colored by mechanic ID.
 * @module MechanicAvatar
 */
import { memo, useEffect, useMemo, useState } from 'react';
import { profileService } from '../../../../services/profile/profile.service';
import { PROFILE_PICTURE_UPDATED_EVENT } from '../../../../services/profile/profile-picture-live.service';
import { getDeterministicAvatarColor } from '../../../../utils/avatar';

/** Props for the {@link MechanicAvatar} component. */
interface MechanicAvatarProps {
  /** Unique mechanic identifier used for picture URL and deterministic color. */
  readonly mechanicId: number;
  /** Full display name used for alt text, title, and initials extraction. */
  readonly fullName: string;
  /** Whether the mechanic has an uploaded profile picture. */
  readonly hasProfilePicture: boolean;
  /** Tailwind size/text classes for the avatar element. */
  readonly sizeClassName?: string;
  /** Additional CSS classes appended to the avatar element. */
  readonly className?: string;
}

/** Extracts up to two uppercase initials from a full name string. */
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

    globalThis.addEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated);
    return () => {
      globalThis.removeEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated);
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
        className={`inline-flex shrink-0 overflow-hidden rounded-full border border-arsm-border object-cover dark:border-arsm-border-dark ${sizeClassName} ${className ?? ''}`}
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

/** Memoized mechanic avatar with live profile picture updates. */
export const MechanicAvatar = MechanicAvatarComponent;
