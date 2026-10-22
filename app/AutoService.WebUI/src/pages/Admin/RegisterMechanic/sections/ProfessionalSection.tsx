/** Professional details section for mechanic registration: specialization and expertise selections. */

import { memo, useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import { Dropdown } from '../../../../components/common/Dropdown';
import { FieldErrorText } from '../../../../components/common/FieldErrorText';
import { EXPERTISE_OPTIONS, SPECIALIZATION_OPTIONS } from '../constants';
import { fieldErrorA11yProps } from '../../../../utils/fieldA11y';
import {
  hiddenCheckboxClass,
  labelClass,
  optionTileActiveClass,
  optionTileBaseClass,
  optionTileCheckboxActiveClass,
  optionTileCheckboxClass,
  optionTileCheckboxInactiveClass,
  optionTileInactiveClass,
  selectWrapperClass,
} from '../../../../utils/formStyles';
import type { RegisterFieldErrors, RegisterTextFieldName } from '../types';

interface ProfessionalSectionProps {
  readonly specialization: string;
  readonly expertise: string[];
  readonly fieldErrors: RegisterFieldErrors;
  readonly isSubmitting: boolean;
  readonly onFieldChange: (field: RegisterTextFieldName, value: string) => void;
  readonly onToggleExpertise: (value: string) => void;
}

export const ProfessionalSection = memo(function ProfessionalSection({
  specialization,
  expertise,
  fieldErrors,
  isSubmitting,
  onFieldChange,
  onToggleExpertise,
}: ProfessionalSectionProps) {
  const { t } = useTranslation();
  const idPrefix = useId();
  const specializationErrorId = `${idPrefix}-specialization-error`;
  const expertiseErrorId = `${idPrefix}-expertise-error`;
  const specializationA11y = fieldErrorA11yProps(specializationErrorId, fieldErrors.specialization);
  const specializationOptions = SPECIALIZATION_OPTIONS.map((opt) => ({ value: opt.value, label: t(opt.labelKey) }));

  return (
    <>
      <div>
        <label htmlFor="specialization" className={labelClass}>
          {t('admin.specialization')} *
        </label>
        <div className={selectWrapperClass}>
          <Dropdown
            id="specialization"
            value={specialization}
            options={specializationOptions}
            onChange={(value) => {
              onFieldChange('specialization', value);
            }}
            placeholder={t('admin.selectSpecialization')}
            disabled={isSubmitting}
            ariaInvalid={specializationA11y['aria-invalid']}
            ariaDescribedBy={specializationA11y['aria-describedby']}
          />
        </div>
        <FieldErrorText id={specializationErrorId} messageKey={fieldErrors.specialization} />
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
                  onChange={() => {
                    onToggleExpertise(opt.value);
                  }}
                  disabled={isSubmitting}
                  className={hiddenCheckboxClass}
                  {...fieldErrorA11yProps(expertiseErrorId, fieldErrors.expertise)}
                />
                <span
                  className={`${optionTileCheckboxClass} ${isSelected ? optionTileCheckboxActiveClass : optionTileCheckboxInactiveClass}`}
                >
                  {isSelected && (
                    <Check className="h-3 w-3 text-arsm-primary dark:text-arsm-on-accent-dark" strokeWidth={3} />
                  )}
                </span>
                <span className="min-w-0 whitespace-nowrap leading-tight">
                  {t(opt.labelKey)}
                </span>
              </label>
            );
          })}
        </div>
        <FieldErrorText id={expertiseErrorId} messageKey={fieldErrors.expertise} />
      </div>
    </>
  );
});
