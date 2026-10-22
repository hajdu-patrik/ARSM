/** Login form state: field values, submit-time validation that focuses the first invalid field, and the login request. */

import { useCallback, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate } from 'react-router';
import { authService } from '../../services/auth/auth.service';
import { useToastStore } from '../../store/toast.store';
import type { LoginRequest } from '../../types/auth/login.types';
import { logError } from '../../utils/devLog';
import {
  NO_LOGIN_FIELD_ERRORS,
  collectLoginFieldErrors,
  getIdentifierErrorKey,
  hasLoginFieldErrors,
  parseIdentifierByMethod,
  preloadPhoneLibrary,
  resolveLoginError,
  type LoginError,
  type LoginFieldErrors,
  type LoginMethod,
  type ParsedIdentifier,
} from './login.helpers';

/** An identifier that passed validation, as an email address or a normalized phone number. */
type ValidIdentifier = Exclude<ParsedIdentifier, { kind: 'invalid' }>;

type ShowErrorToast = (messageKey: string, messageValues?: Record<string, string | number>) => string;

/** The request body for a valid identifier; the field of the other login method is left out. */
function buildLoginRequest(identifier: ValidIdentifier, password: string): LoginRequest {
  return {
    email: identifier.kind === 'email' ? identifier.email : undefined,
    phoneNumber: identifier.kind === 'phone' ? identifier.phoneNumber : undefined,
    password,
  };
}

/** Shows the toast of a failed login attempt; an unknown identifier names the method that was used. */
function showLoginFailure(showErrorToast: ShowErrorToast, error: LoginError, method: LoginMethod): void {
  if (error.key === 'login.identifierNotFound') {
    showErrorToast(method === 'email' ? 'login.identifierNotFoundEmail' : 'login.identifierNotFoundPhone');
    return;
  }

  if (error.key === 'login.attemptsExceededWithDuration') {
    showErrorToast(error.key, { minutes: error.minutes, count: error.minutes });
    return;
  }

  showErrorToast(error.key);
}

export function useLoginForm() {
  const navigate = useNavigate();
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);
  const identifierInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>(NO_LOGIN_FIELD_ERRORS);
  const [isLoading, setIsLoading] = useState(false);

  const changeIdentifier = useCallback((value: string) => {
    setIdentifier(value);
    setFieldErrors((previous) => ({ ...previous, identifier: undefined }));
  }, []);

  const changePassword = useCallback((value: string) => {
    setPassword(value);
    setFieldErrors((previous) => ({ ...previous, password: undefined }));
  }, []);

  const changeLoginMethod = useCallback((method: LoginMethod) => {
    setLoginMethod(method);
    setIdentifier('');
    setFieldErrors(NO_LOGIN_FIELD_ERRORS);

    if (method === 'phone') {
      preloadPhoneLibrary();
    }
  }, []);

  /** Shows the field messages, moves focus to the first invalid field and toasts a malformed identifier. */
  const reportInvalidFields = useCallback((errors: LoginFieldErrors, parsedIdentifier: ParsedIdentifier) => {
    // The messages must be in the DOM before focus moves, so a screen reader announces the field with its error.
    flushSync(() => {
      setIsLoading(false);
      setFieldErrors(errors);
    });

    const firstInvalidInput = errors.identifier === undefined ? passwordInputRef.current : identifierInputRef.current;
    firstInvalidInput?.focus();

    if (parsedIdentifier.kind === 'invalid' && parsedIdentifier.reason !== 'required') {
      showErrorToast(getIdentifierErrorKey(parsedIdentifier.reason));
    }
  }, [showErrorToast]);

  /** Sends the login request, then navigates home or toasts the failure; the password is cleared either way. */
  const attemptLogin = useCallback(async (validIdentifier: ValidIdentifier) => {
    try {
      await authService.login(buildLoginRequest(validIdentifier, password));
      showSuccessToast('login.success');
      void navigate('/');
    } catch (error) {
      showLoginFailure(showErrorToast, resolveLoginError(error), loginMethod);
    } finally {
      setPassword('');
      setIsLoading(false);
    }
  }, [loginMethod, navigate, password, showErrorToast, showSuccessToast]);

  /** Validates every field, then either reports the invalid ones or sends the login request. */
  const submit = useCallback(async () => {
    setIsLoading(true);

    let parsedIdentifier: ParsedIdentifier;
    try {
      parsedIdentifier = await parseIdentifierByMethod(identifier, loginMethod);
    } catch (error) {
      logError('login.parseIdentifier', error);
      setIsLoading(false);
      showErrorToast('login.error');
      return;
    }

    const errors = collectLoginFieldErrors(parsedIdentifier, password);
    if (parsedIdentifier.kind === 'invalid' || hasLoginFieldErrors(errors)) {
      reportInvalidFields(errors, parsedIdentifier);
      return;
    }

    await attemptLogin(parsedIdentifier);
  }, [attemptLogin, identifier, loginMethod, password, reportInvalidFields, showErrorToast]);

  const handleSubmit = useCallback((event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isLoading) {
      void submit();
    }
  }, [isLoading, submit]);

  return {
    identifier,
    password,
    loginMethod,
    fieldErrors,
    isLoading,
    identifierInputRef,
    passwordInputRef,
    changeIdentifier,
    changePassword,
    changeLoginMethod,
    handleSubmit,
  };
}
