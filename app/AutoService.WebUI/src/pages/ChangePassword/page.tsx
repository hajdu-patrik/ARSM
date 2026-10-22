/** Change-password page of an account whose password an administrator reset: the one page it can use until the
 * temporary password is replaced, with the shared form and a way to log out. */

import { memo, useCallback, type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { LogOut } from 'lucide-react';
import { ChangePasswordForm } from '../../components/common/ChangePasswordForm';
import { AuthPageLayout } from '../../components/layout/AuthPageLayout';
import { usePasswordChange } from '../../hooks/usePasswordChange';
import { authService } from '../../services/auth/auth.service';
import { useAuthStore } from '../../store/auth.store';
import { useToastStore } from '../../store/toast.store';
import { logError } from '../../utils/devLog';
import { defaultIconClass, secondaryButtonClass } from '../../utils/formStyles';

/** Route component that makes a signed-in user replace the temporary password before using the app. */
export const ChangePasswordPage = memo(function ChangePasswordPage() {
  const { t } = useTranslation();
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);
  const setMustChangePassword = useAuthStore((state) => state.setMustChangePassword);

  // Clearing the flag is all it takes: the route guard then sends the user on to the scheduler.
  const handlePasswordChanged = useCallback(() => {
    setMustChangePassword(false);
  }, [setMustChangePassword]);

  const {
    currentPassword,
    newPassword,
    confirmNewPassword,
    fieldErrors,
    isChangingPassword,
    changeCurrentPassword,
    changeNewPassword,
    changeConfirmNewPassword,
    validatePasswordChange,
    submitPasswordChange,
  } = usePasswordChange({ showSuccessToast, showErrorToast, onChanged: handlePasswordChanged });

  const handleSubmit = useCallback((event: SyntheticEvent) => {
    event.preventDefault();

    if (validatePasswordChange()) {
      submitPasswordChange();
    }
  }, [submitPasswordChange, validatePasswordChange]);

  // The guard sends the signed-out user to the login page.
  const handleLogout = useCallback(() => {
    authService.logout().catch((error: unknown) => {
      logError('changePassword.logout', error);
    });
  }, []);

  return (
    <AuthPageLayout title={t('changePassword.title')} subtitle={t('changePassword.message')}>
      <ChangePasswordForm
        currentPassword={currentPassword}
        newPassword={newPassword}
        confirmNewPassword={confirmNewPassword}
        fieldErrors={fieldErrors}
        isSubmitting={isChangingPassword}
        onCurrentPasswordChange={changeCurrentPassword}
        onNewPasswordChange={changeNewPassword}
        onConfirmNewPasswordChange={changeConfirmNewPassword}
        onSubmit={handleSubmit}
      />

      <button type="button" onClick={handleLogout} className={`mt-3 w-full ${secondaryButtonClass}`}>
        <LogOut className={defaultIconClass} />
        <span>{t('layout.logout')}</span>
      </button>
    </AuthPageLayout>
  );
});
