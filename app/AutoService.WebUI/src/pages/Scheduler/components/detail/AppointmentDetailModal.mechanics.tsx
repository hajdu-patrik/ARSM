import { memo } from 'react';
import { LogOut, UserPlus } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { AppointmentDto } from '../../../../types/scheduler/scheduler.types';
import {
  compactSelectFullClass,
  compactListPrimaryTextClass,
  equalWidthControlGroupClass,
  mutedMetaTextClass,
  mutedSecondaryTextClass,
  referenceChipPrimaryButtonClass,
  schedulerAccentTagClass,
  schedulerDetailPanelClass,
  schedulerDetailRowClass,
  schedulerInlineClaimButtonClass,
  schedulerInlineUnassignButtonClass,
  selectWrapperClass,
} from '../../../../utils/formStyles';
import { MechanicAvatar } from '../shared/MechanicAvatar';

export interface MechanicOption {
  readonly personId: number;
  readonly firstName: string;
  readonly middleName: string | null;
  readonly lastName: string;
}

function getMechanicOptionDisplayName(mechanic: MechanicOption): string {
  return [mechanic.firstName, mechanic.middleName, mechanic.lastName].filter(Boolean).join(' ');
}

interface MechanicsSectionProps {
  readonly appointment: AppointmentDto;
  readonly isAdmin: boolean;
  readonly isClaiming: boolean;
  readonly canClaim: boolean;
  readonly canUnclaim: boolean;
  readonly isAssigning: boolean;
  readonly isClosedForMechanicMutations: boolean;
  readonly isUnclaiming: boolean;
  readonly availableMechanics: MechanicOption[];
  readonly selectedNewMechanicId: string;
  readonly currentMechanicId: number | undefined;
  readonly t: TFunction;
  readonly onClaim: () => void;
  readonly onUnclaim: () => void;
  readonly onSelectNewMechanic: (value: string) => void;
  readonly onAdminAssign: () => void;
  readonly onAdminUnassign: (mechanicId: number) => void;
}

/**
 * Renders mechanic assignment controls and keeps all mechanic mutations mutually exclusive.
 * This prevents overlapping requests from creating stale or conflicting modal state.
 */
export const MechanicsSection = memo(function MechanicsSection({
  appointment,
  isAdmin,
  isClaiming,
  canClaim,
  canUnclaim,
  isAssigning,
  isClosedForMechanicMutations,
  isUnclaiming,
  availableMechanics,
  selectedNewMechanicId,
  currentMechanicId,
  t,
  onClaim,
  onUnclaim,
  onSelectNewMechanic,
  onAdminAssign,
  onAdminUnassign,
}: MechanicsSectionProps) {
  const isMechanicMutationBusy = isClaiming || isAssigning || isUnclaiming;
  const uniqueMechanics = Array.from(new Map(appointment.mechanics.map((mechanic) => [mechanic.id, mechanic])).values());

  return (
    <div className={schedulerDetailPanelClass}>
      <h4 className={`mb-2 font-medium ${mutedSecondaryTextClass}`}>
        {t('scheduler.detail.mechanics')}
      </h4>

      {uniqueMechanics.length === 0 ? (
        <p className={`text-left italic ${mutedSecondaryTextClass}`}>
          {t('scheduler.detail.noMechanics')}
        </p>
      ) : (
        <div className="flex min-w-0 flex-col gap-2">
          {uniqueMechanics.map((mechanic) => {
            const isOwnRow = currentMechanicId !== undefined && mechanic.id === currentMechanicId;
            const canRemove = isAdmin || (isOwnRow && canUnclaim);
            const handleRemove = isAdmin
              ? () => onAdminUnassign(mechanic.id)
              : onUnclaim;
            return (
              <MechanicCard
                key={mechanic.id}
                mechanic={mechanic}
                showAdminRemove={canRemove && !isClosedForMechanicMutations}
                isCurrentUser={isOwnRow}
                onRemove={handleRemove}
                t={t}
                isDisabled={isMechanicMutationBusy || uniqueMechanics.length <= 1}
              />
            );
          })}
        </div>
      )}

      {canClaim && (
        <button
          type="button"
          onClick={onClaim}
          disabled={isMechanicMutationBusy}
          className={`${schedulerInlineClaimButtonClass} mt-3`}
        >
          <UserPlus className="h-3 w-3 shrink-0" />
          <span className="min-w-0 truncate">{isClaiming ? t('scheduler.detail.saving') : t('scheduler.claim')}</span>
        </button>
      )}

      {isAdmin && !isClosedForMechanicMutations && (
        <div className="mt-3">
          <h5 className={`mb-1.5 flex min-w-0 items-center gap-1 font-medium ${mutedMetaTextClass}`}>
            <UserPlus className="h-3.5 w-3.5 shrink-0" />
            {t('scheduler.detail.addMechanic')}
          </h5>
          <div className={equalWidthControlGroupClass}>
            <div className={selectWrapperClass}>
              <select
                value={selectedNewMechanicId}
                onChange={(event) => onSelectNewMechanic(event.target.value)}
                disabled={isMechanicMutationBusy}
                aria-label={t('scheduler.detail.selectMechanic')}
                className={`${compactSelectFullClass} h-11 min-h-11 px-3 py-2 text-sm`}
              >
                <option value="" disabled hidden>
                  {t('scheduler.detail.selectMechanic')}
                </option>
                {availableMechanics.map((mechanic) => {
                  return (
                    <option key={mechanic.personId} value={mechanic.personId}>
                      {getMechanicOptionDisplayName(mechanic)}
                    </option>
                  );
                })}
              </select>
            </div>
            <button
              type="button"
              onClick={onAdminAssign}
              disabled={isMechanicMutationBusy || !selectedNewMechanicId}
              className={`${referenceChipPrimaryButtonClass} min-h-11 px-3 py-2 text-xs`}
            >
              <span className="min-w-0 truncate">{isAssigning ? t('scheduler.detail.saving') : t('scheduler.detail.addMechanic')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

interface MechanicCardProps {
  readonly mechanic: AppointmentDto['mechanics'][number];
  readonly showAdminRemove: boolean;
  readonly isCurrentUser: boolean;
  readonly isDisabled: boolean;
  readonly onRemove: () => void;
  readonly t: TFunction;
}

const MechanicCard = memo(function MechanicCard({
  mechanic,
  showAdminRemove,
  isCurrentUser,
  isDisabled,
  onRemove,
  t,
}: MechanicCardProps) {
  let removeLabelKey: 'scheduler.detail.unassignMe' | 'scheduler.detail.unassignOther' = 'scheduler.detail.unassignOther';
  if (isCurrentUser) {
    removeLabelKey = 'scheduler.detail.unassignMe';
  }

  return (
    <div className={`${schedulerDetailRowClass} min-w-0 overflow-hidden`}>
      <div className="flex min-w-0 items-center gap-3 max-[350px]:flex-col max-[350px]:items-stretch">
        <MechanicAvatar
          mechanicId={mechanic.id}
          fullName={mechanic.fullName}
          hasProfilePicture={mechanic.hasProfilePicture}
          sizeClassName="h-8 w-8 shrink-0 text-xs"
        />

        <div className="min-w-0 flex-1 max-[350px]:w-full">
          <div className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className={`min-w-0 ${compactListPrimaryTextClass}`}>
              {mechanic.fullName}
            </span>
            <span className={`${schedulerAccentTagClass} min-w-0`}>
              {mechanic.specialization}
            </span>
          </div>
        </div>

        {showAdminRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={isDisabled}
            className={`${schedulerInlineUnassignButtonClass} max-[350px]:justify-center`}
          >
            <LogOut className="h-3 w-3 shrink-0" />
            <span className="min-w-0 truncate">{t(removeLabelKey)}</span>
          </button>
        )}
      </div>
    </div>
  );
});