/** Password-change workflow of Settings: the shared form state plus the confirmation step before the request. */

import { useCallback, useState, type SyntheticEvent } from 'react';
import { usePasswordChange, type UsePasswordChangeParams } from '../../../hooks/usePasswordChange';

export function usePasswordChangeSettings(params: UsePasswordChangeParams) {
  const { validatePasswordChange, submitPasswordChange, ...passwordChange } = usePasswordChange(params);
  const { isChangingPassword } = passwordChange;
  const [isPasswordChangeConfirmOpen, setIsPasswordChangeConfirmOpen] = useState(false);

  const handlePasswordChangeConfirmed = useCallback(() => {
    setIsPasswordChangeConfirmOpen(false);
    submitPasswordChange();
  }, [submitPasswordChange]);

  const handlePasswordChangeRequest = useCallback((event: SyntheticEvent) => {
    event.preventDefault();

    if (validatePasswordChange()) {
      setIsPasswordChangeConfirmOpen(true);
    }
  }, [validatePasswordChange]);

  const closePasswordChangeConfirm = useCallback(() => {
    if (!isChangingPassword) {
      setIsPasswordChangeConfirmOpen(false);
    }
  }, [isChangingPassword]);

  return {
    ...passwordChange,
    isPasswordChangeConfirmOpen,
    handlePasswordChangeRequest,
    handlePasswordChangeConfirmed,
    closePasswordChangeConfirm,
  };
}
