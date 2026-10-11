/** Mechanic avatar: profile picture with live SSE updates, falling back to a deterministic initials avatar. */
import { memo, useEffect, useMemo, useState } from 'react';
import { isRecord } from '../../../../services/http/record-guard';
import { profileService } from '../../../../services/profile/profile.service';
import {
  PROFILE_PICTURE_UPDATED_EVENT,
  type ProfilePictureUpdatedDetail,
} from '../../../../services/profile/profile-picture-live.service';
import { useAuthStore } from '../../../../store/auth.store';
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

/** Reads the payload of a profile-picture update event, or null when the event carries no valid one. */
function readUpdateDetail(event: Event): ProfilePictureUpdatedDetail | null {
  if (!(event instanceof CustomEvent)) {
    return null;
  }

  const detail: unknown = event.detail;
  if (
    !isRecord(detail) ||
    typeof detail.personId !== 'number' ||
    typeof detail.hasProfilePicture !== 'boolean' ||
    typeof detail.cacheBuster !== 'number'
  ) {
    return null;
  }

  return {
    personId: detail.personId,
    hasProfilePicture: detail.hasProfilePicture,
    cacheBuster: detail.cacheBuster,
  };
}

const MechanicAvatarComponent = memo(function MechanicAvatar({
  mechanicId,
  fullName,
  hasProfilePicture,
  sizeClassName = 'h-7 w-7 text-xs',
  className,
}: MechanicAvatarProps) {
  const currentUser = useAuthStore((state) => state.user);
  const [liveProfilePicture, setLiveProfilePicture] = useState<{
    mechanicId: number;
    hasProfilePicture: boolean;
    cacheBuster: number;
  } | null>(null);
  const [failedImageKey, setFailedImageKey] = useState<string | null>(null);

  useEffect(() => {
    const handleProfilePictureUpdated = (event: Event) => {
      const detail = readUpdateDetail(event);
      if (detail === null || detail.personId !== mechanicId) {
        return;
      }

      setLiveProfilePicture({
        mechanicId,
        hasProfilePicture: detail.hasProfilePicture,
        cacheBuster: detail.cacheBuster,
      });
      setFailedImageKey(null);
    };

    globalThis.addEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated);
    return () => {
      globalThis.removeEventListener(PROFILE_PICTURE_UPDATED_EVENT, handleProfilePictureUpdated);
    };
  }, [mechanicId]);

  const activeLiveProfilePicture = liveProfilePicture?.mechanicId === mechanicId ? liveProfilePicture : null;
  const resolvedHasProfilePicture = activeLiveProfilePicture?.hasProfilePicture ?? hasProfilePicture;
  const pictureFlag = resolvedHasProfilePicture ? '1' : '0';
  const cacheBuster = String(activeLiveProfilePicture?.cacheBuster ?? `${String(mechanicId)}-${pictureFlag}`);
  const canReadMechanicPicture = currentUser?.isAdmin === true || currentUser?.personId === mechanicId;
  const imageCacheKey = `${String(mechanicId)}:${cacheBuster}:${pictureFlag}`;
  const shouldShowProfilePicture = canReadMechanicPicture && resolvedHasProfilePicture && failedImageKey !== imageCacheKey;
  const initials = useMemo(() => getInitialsFromFullName(fullName), [fullName]);
  const fallbackColorClass = getDeterministicAvatarColor(mechanicId);

  if (shouldShowProfilePicture) {
    return (
      <img
        src={`${profileService.getMechanicProfilePictureUrl(mechanicId)}?v=${cacheBuster}`}
        alt={fullName}
        className={`inline-flex shrink-0 overflow-hidden rounded-full border border-ui-border object-cover ${sizeClassName} ${className ?? ''}`}
        onError={() => {
          setFailedImageKey(imageCacheKey);
        }}
      />
    );
  }

  return (
    <div
      role="img"
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-ui-border font-bold ${sizeClassName} ${fallbackColorClass} ${className ?? ''}`}
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
