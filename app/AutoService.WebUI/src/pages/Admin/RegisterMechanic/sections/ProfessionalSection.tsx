/**
 * Professional details section for mechanic registration.
 *
 * Collects specialization and expertise selections.
 * @module pages/Admin/RegisterMechanic/sections/ProfessionalSection
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import {
  EXPERTISE_OPTIONS,
  SPECIALIZATION_OPTIONS,
  compactSelectFullClass,
  hiddenCheckboxClass,
  labelClass,
  optionTileActiveClass,
  optionTileBaseClass,
  optionTileCheckboxActiveClass,
  optionTileCheckboxClass,
  optionTileCheckboxInactiveClass,
  optionTileInactiveClass,
  selectWrapperClass,
} from '../constants';

/** Props for the ProfessionalSection component. */
interface ProfessionalSectionProps {
  readonly specialization: string;
  readonly expertise: string[];
  readonly isSubmitting: boolean;
  readonly onSpecializationChange: (value: string) => void;
  readonly onToggleExpertise: (value: string) => void;
}

const ProfessionalSectionComponent = memo(function ProfessionalSection({
  specialization,
  expertise,
  isSubmitting,
  onSpecializationChange,
  onToggleExpertise,
}: ProfessionalSectionProps) {
  const { t } = useTranslation();

  return (
    <>
      <div>
        <label htmlFor="specialization" className={labelClass}>
          {t('admin.specialization')} *
        </label>
        <div className={selectWrapperClass}>
          <select
            id="specialization"
            value={specialization}
            onChange={(event) => onSpecializationChange(event.target.value)}
            className={`${compactSelectFullClass} h-10 min-h-0 px-3 py-2 text-sm`}
            disabled={isSubmitting}
            required
          >
            <option value="" disabled>
              {t('admin.selectSpecialization')}
            </option>
            {SPECIALIZATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className={labelClass}>
          {t('admin.expertiseLabel')} * <span className="text-xs font-normal">({t('admin.expertiseHint')})</span>
        </p>
        <div className="flex min-w-0 flex-wrap gap-2">
          {EXPERTISE_OPTIONS.map((opt) => {
            const isSelected = expertise.includes(opt.value);

            return (
              <label
                key={opt.value}
                className={`${optionTileBaseClass} ${isSelected ? optionTileActiveClass : optionTileInactiveClass} ${isSubmitting ? 'cursor-not-allowed opacity-70' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleExpertise(opt.value)}
                  disabled={isSubmitting}
                  className={hiddenCheckboxClass}
                />
                <span
                  className={`${optionTileCheckboxClass} ${isSelected ? optionTileCheckboxActiveClass : optionTileCheckboxInactiveClass}`}
                >
                  {isSelected && (
                    <Check className="h-3 w-3 text-arsm-primary dark:text-arsm-hover" strokeWidth={3} />
                  )}
                </span>
                <span className="min-w-0 whitespace-nowrap leading-tight">
                  {t(opt.labelKey)}
                </span>
              </label>
            );
          })}
        </div>
      </div>
    </>
  );
});

ProfessionalSectionComponent.displayName = 'ProfessionalSection';

/** Specialization and expertise picker section for registration. */
export const ProfessionalSection = ProfessionalSectionComponent;
