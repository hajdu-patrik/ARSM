/** Dialog that sets a temporary password for one mechanic: what the reset does, the password field and the confirm step. */

import { memo, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound } from 'lucide-react';
import { ConfirmModal } from '../../../../components/common/ConfirmModal';
import { PasswordInputWithToggle } from '../../../../components/common/PasswordInputWithToggle';
import type { MechanicListItem } from '../../../../services/admin/admin.service';
import { fieldErrorA11yProps } from '../../../../utils/fieldA11y';
import { mutedBodyTextClass } from '../../../../utils/formStyles';
import { MIN_PASSWORD_LENGTH } from '../../../../utils/validation';
import { buildMechanicDisplayName } from '../helpers';

interface TemporaryPasswordFieldProps {
  readonly value: string;
  readonly errorKey: string | undefined;
  readonly isDisabled: boolean;
  readonly onChange: (value: string) => void;
}

/** The temporary-password input; it mounts with the dialog, so its visibility and autofill lock start fresh for every mechanic. */
function TemporaryPasswordField({ value, errorKey, isDisabled, onChange }: TemporaryPasswordFieldProps) {
  const { t } = useTranslation();
  const inputId = useId();
  const errorId = useId();
  const [isVisible, setIsVisible] = useState(false);
  const [isLocked, setIsLocked] = useState(true);

  return (
    <div className="mt-4 text-left">
      <PasswordInputWithToggle
        id={inputId}
        label={t('admin.temporaryPassword')}
        value={value}
        placeholder={t('admin.temporaryPasswordPlaceholder')}
        isVisible={isVisible}
        isSubmitting={isDisabled}
        isLocked={isLocked}
        onChange={onChange}
        onFocus={() => {
          setIsLocked(false);
        }}
        onToggleVisibility={() => {
          setIsVisible((wasVisible) => !wasVisible);
        }}
        inputName="account-security-temporary"
        toggleAriaLabel={isVisible ? t('settings.hidePassword') : t('settings.showPassword')}
        hintText={t('common.validation.passwordHint')}
        a11yProps={fieldErrorA11yProps(errorId, errorKey)}
        errorId={errorId}
        errorKey={errorKey}
      />
    </div>
  );
}

interface MechanicPasswordResetModalProps {
  /** The mechanic whose password is reset; the dialog is open while it is set. */
  readonly target: MechanicListItem | null;
  readonly temporaryPassword: string;
  /** Message key of the server's verdict on the password, shown under the field. */
  readonly passwordError: string | undefined;
  readonly isResetting: boolean;
  readonly onPasswordChange: (value: string) => void;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}

/** Confirm dialog of the admin password reset; saving stays disabled until the password has the minimum length. */
export const MechanicPasswordResetModal = memo(function MechanicPasswordResetModal({
  target,
  temporaryPassword,
  passwordError,
  isResetting,
  onPasswordChange,
  onClose,
  onConfirm,
}: MechanicPasswordResetModalProps) {
  const { t } = useTranslation();

  return (
    <ConfirmModal
      isOpen={target !== null}
      title={t('admin.resetPassword')}
      isBusy={isResetting}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmLabel={t('admin.resetPassword')}
      busyLabel={t('admin.resettingPassword')}
      icon={KeyRound}
      confirmDisabled={temporaryPassword.length < MIN_PASSWORD_LENGTH}
    >
      {target !== null && (
        <>
          <p className={`break-words ${mutedBodyTextClass} [overflow-wrap:anywhere]`}>
            {t('admin.resetPasswordMessage', { name: buildMechanicDisplayName(target), email: target.email })}
          </p>

          <TemporaryPasswordField
            value={temporaryPassword}
            errorKey={passwordError}
            isDisabled={isResetting}
            onChange={onPasswordChange}
          />
        </>
      )}
    </ConfirmModal>
  );
});
