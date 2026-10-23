/** Login page: email or phone identifier login modes with localized feedback. */
import { memo, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { AuthPageLayout } from '../../components/layout/AuthPageLayout';
import { FieldErrorText } from '../../components/common/FieldErrorText';
import { fieldErrorA11yProps } from '../../utils/fieldA11y';
import {
  buttonClass,
  getSegmentedControlOptionClass,
  inputClass,
  inputGroupContainerClass,
  labelClass,
  largeIconClass,
  mutedMetaTextClass,
  passwordToggleButtonClass,
  segmentedControlClass,
  uppercaseMetaLabelTextClass,
} from '../../utils/formStyles';
import { useLoginForm } from './useLoginForm';

export const Login = memo(function Login() {
  const { t: translate } = useTranslation();
  const identifierErrorId = useId();
  const passwordErrorId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const {
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
  } = useLoginForm();

  const isEmailMode = loginMethod === 'email';
  const identifierLabel = isEmailMode ? translate('common.fields.email') : translate('login.phone');
  const identifierPlaceholder = isEmailMode ? translate('login.emailPlaceholder') : translate('login.phonePlaceholder');
  const identifierPattern = isEmailMode ? undefined : String.raw`[0-9+()\s-]+`;

  return (
    <AuthPageLayout title={translate('login.title')} subtitle={translate('login.subtitle')}>
      <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4.5" noValidate>
        <fieldset aria-label={translate('login.loginMethodLabel')}>
          <legend className={`mb-2 ${uppercaseMetaLabelTextClass}`}>
            {translate('login.loginMethodLabel')}
          </legend>
          <div className={segmentedControlClass}>
            <button
              type="button"
              onClick={() => {
                changeLoginMethod('email');
              }}
              className={getSegmentedControlOptionClass(isEmailMode)}
              aria-pressed={isEmailMode}
              disabled={isLoading}
            >
              {translate('common.fields.email')}
            </button>
            <button
              type="button"
              onClick={() => {
                changeLoginMethod('phone');
              }}
              className={getSegmentedControlOptionClass(!isEmailMode)}
              aria-pressed={!isEmailMode}
              disabled={isLoading}
            >
              {translate('login.phone')}
            </button>
          </div>
        </fieldset>

        <div>
          <label htmlFor="identifier" className={labelClass}>
            {identifierLabel}
          </label>
          <input
            ref={identifierInputRef}
            id="identifier"
            type={isEmailMode ? 'email' : 'tel'}
            autoComplete={isEmailMode ? 'username' : 'tel'}
            inputMode={isEmailMode ? 'email' : 'tel'}
            pattern={identifierPattern}
            value={identifier}
            onChange={(event) => {
              changeIdentifier(event.target.value);
            }}
            placeholder={identifierPlaceholder}
            className={inputClass}
            required
            disabled={isLoading}
            {...fieldErrorA11yProps(identifierErrorId, fieldErrors.identifier)}
          />
          <FieldErrorText id={identifierErrorId} messageKey={fieldErrors.identifier} />
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>
            {translate('common.fields.password')}
          </label>
          <div className={inputGroupContainerClass}>
            <input
              ref={passwordInputRef}
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => {
                changePassword(event.target.value);
              }}
              placeholder={translate('login.loginPassword')}
              className={`${inputClass} pr-12`}
              required
              disabled={isLoading}
              {...fieldErrorA11yProps(passwordErrorId, fieldErrors.password)}
            />
            <button
              type="button"
              onClick={() => {
                setShowPassword((previousValue) => !previousValue);
              }}
              className={passwordToggleButtonClass}
              aria-label={showPassword ? translate('login.hidePassword') : translate('login.showPassword')}
              disabled={isLoading}
            >
              {showPassword ? (
                <EyeOff className={largeIconClass} aria-hidden="true" />
              ) : (
                <Eye className={largeIconClass} aria-hidden="true" />
              )}
            </button>
          </div>
          <FieldErrorText id={passwordErrorId} messageKey={fieldErrors.password} />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`${buttonClass} mt-1.5 w-full`}
          aria-busy={isLoading}
        >
          {isLoading ? translate('login.loading') : translate('login.submit')}
        </button>
      </form>

      <p className={`mt-3 ${mutedMetaTextClass} sm:mt-5 sm:text-sm`}>
        {translate('login.helpText')}
      </p>
    </AuthPageLayout>
  );
});
