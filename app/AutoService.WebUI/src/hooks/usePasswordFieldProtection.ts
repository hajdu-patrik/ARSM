/** Autofill and lock protection hooks of the password-change form. */

import { useEffect, type Dispatch, type SetStateAction } from 'react';
import { PASSWORD_FIELD_IDS } from '../utils/passwordFormPolicy';

interface AutofillResetCallbacks {
  readonly onCurrentPasswordChange: (value: string) => void;
  readonly onNewPasswordChange: (value: string) => void;
  readonly onConfirmNewPasswordChange: (value: string) => void;
}

/** Locks a password field again after its controlled value is cleared. */
export function useLockFieldWhenEmpty(value: string, setLocked: Dispatch<SetStateAction<boolean>>): void {
  useEffect(() => {
    if (value.length === 0) {
      setLocked(true);
    }
  }, [setLocked, value]);
}

/** Clears browser/password-manager autofill from the change-password form. */
export function useClearAutofilledCredentials({
  onCurrentPasswordChange,
  onNewPasswordChange,
  onConfirmNewPasswordChange,
}: AutofillResetCallbacks): void {
  useEffect(() => {
    const clearAutofilledPasswordField = (inputId: string, onChange: (value: string) => void) => {
      const input = document.getElementById(inputId);
      if (!(input instanceof HTMLInputElement)) {
        return;
      }

      if (input.value.length > 0) {
        input.value = '';
        onChange('');
      }
    };

    const frameId = globalThis.requestAnimationFrame(() => {
      clearAutofilledPasswordField(PASSWORD_FIELD_IDS.currentPassword, onCurrentPasswordChange);
      clearAutofilledPasswordField(PASSWORD_FIELD_IDS.newPassword, onNewPasswordChange);
      clearAutofilledPasswordField(PASSWORD_FIELD_IDS.confirmNewPassword, onConfirmNewPasswordChange);
    });

    return () => {
      globalThis.cancelAnimationFrame(frameId);
    };
  }, [onConfirmNewPasswordChange, onCurrentPasswordChange, onNewPasswordChange]);
}
