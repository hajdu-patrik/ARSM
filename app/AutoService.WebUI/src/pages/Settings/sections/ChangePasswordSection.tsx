/** Settings change-password card: the shared change-password form under its section title. */

import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { ChangePasswordForm, type ChangePasswordFormProps } from '../../../components/common/ChangePasswordForm';
import { cardClass, sectionTitleClass } from '../../../utils/formStyles';

/** Password update section rendered on the settings page. */
export const ChangePasswordSection = memo(function ChangePasswordSection(props: ChangePasswordFormProps) {
  const { t } = useTranslation();

  return (
    <div className={cardClass}>
      <h2 className={sectionTitleClass}>
        {t('settings.changePassword')}
      </h2>

      <ChangePasswordForm {...props} />
    </div>
  );
});
