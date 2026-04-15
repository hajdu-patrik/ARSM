/**
 * Professional details section for mechanic registration.
 *
 * Collects specialization and expertise selections.
 * @module pages/Admin/RegisterMechanic/sections/ProfessionalSection
 */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { FormErrorMessage } from '../../../../components/common/FormErrorMessage';
import { EXPERTISE_OPTIONS, SPECIALIZATION_OPTIONS, inputClass, labelClass } from '../constants';
import type { GetFieldError } from '../types';

/** Props for the ProfessionalSection component. */
interface ProfessionalSectionProps {
  readonly specialization: string;
  readonly expertise: string[];
  readonly isSubmitting: boolean;
  readonly onSpecializationChange: (value: string) => void;
  readonly onToggleExpertise: (value: string) => void;
  readonly getFieldError: GetFieldError;
}

const ProfessionalSectionComponent = memo(function ProfessionalSection({
  specialization,
  expertise,
  isSubmitting,
  onSpecializationChange,
  onToggleExpertise,
  getFieldError,
}: ProfessionalSectionProps) {
  const { t } = useTranslation();

  return (
    <>
      <div>
        <label htmlFor="specialization" className={labelClass}>
          {t('admin.specialization')} *
        </label>
        <select
          id="specialization"
          value={specialization}
          onChange={(e) => onSpecializationChange(e.target.value)}
          className={inputClass}
          disabled={isSubmitting}
          required
        >
          <option value="">{t('admin.selectSpecialization')}</option>
          {SPECIALIZATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </option>
          ))}
        </select>
        <FormErrorMessage message={getFieldError('specialization')} className="mt-1 px-2 py-1 text-xs" />
      </div>

      <div>
        <p className={labelClass}>
          {t('admin.expertiseLabel')} * <span className="text-xs font-normal">({t('admin.expertiseHint')})</span>
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {EXPERTISE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={`relative flex cursor-pointer items-start gap-2 overflow-hidden rounded-lg border px-3 py-2 text-sm transition ${
                expertise.includes(opt.value)
                  ? 'border-[#C9B3FF] bg-[#EFEBFA] text-[#2C2440] dark:border-[#7A66C7] dark:bg-[#241F33] dark:text-[#F5F2FF]'
                  : 'border-[#D8D2E9] bg-white text-[#5E5672] hover:bg-[#F6F4FB] dark:border-[#3A3154] dark:bg-[#13131B] dark:text-[#CFC5EA] dark:hover:bg-[#1A1A25]'
              } ${isSubmitting ? 'cursor-not-allowed opacity-70' : ''}`}
            >
              <input
                type="checkbox"
                checked={expertise.includes(opt.value)}
                onChange={() => onToggleExpertise(opt.value)}
                disabled={isSubmitting}
                className="absolute opacity-0 pointer-events-none"
              />
              <span
                className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border ${
                  expertise.includes(opt.value)
                    ? 'border-[#C9B3FF] bg-[#C9B3FF] dark:border-[#7A66C7] dark:bg-[#7A66C7]'
                    : 'border-[#D8D2E9] dark:border-[#3A3154]'
                }`}
              >
                {expertise.includes(opt.value) && (
                  <Check className="h-3 w-3 text-[#2C2440] dark:text-[#F5F2FF]" strokeWidth={3} />
                )}
              </span>
              <span className="min-w-0 whitespace-normal break-words [overflow-wrap:anywhere] leading-tight">
                {t(opt.labelKey)}
              </span>
            </label>
          ))}
        </div>
        <FormErrorMessage message={getFieldError('expertise')} className="mt-1 px-2 py-1 text-xs" />
      </div>
    </>
  );
});

ProfessionalSectionComponent.displayName = 'ProfessionalSection';

/** Specialization and expertise picker section for registration. */
export const ProfessionalSection = ProfessionalSectionComponent;
