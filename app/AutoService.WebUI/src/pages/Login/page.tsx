/** Login page: email or phone identifier login modes with localized feedback. */
import { memo, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { ThemeLanguageControls } from '../../components/layout/ThemeLanguageControls';
import { FieldErrorText } from '../../components/common/FieldErrorText';
import { Image } from '../../components/common/Image';
import { fieldErrorA11yProps } from '../../utils/fieldA11y';
import {
  buttonClass,
  centeredAmbientOrbLayoutClass,
  displayHeadingTextClass,
  getSegmentedControlOptionClass,
  inputClass,
  inputGroupContainerClass,
  labelClass,
  largeIconClass,
  mutedMetaTextClass,
  mutedSecondaryTextClass,
  passwordToggleButtonClass,
  segmentedControlClass,
  uppercaseMetaLabelTextClass,
} from '../../utils/formStyles';
import { useLoginForm } from './useLoginForm';

const LoginComponent = memo(function Login() {
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-arsm-surface px-3 pb-6 pt-24 text-ui-text dark:bg-arsm-deepest sm:px-4 sm:pb-8 sm:pt-8">
      <div
        aria-hidden="true"
        className={`arsm-auth-ambient ${centeredAmbientOrbLayoutClass}`}
      />
      <div
        aria-hidden="true"
        className="arsm-auth-sheen pointer-events-none absolute inset-0 z-0"
      />

      <ThemeLanguageControls />

      <div className="relative z-10 w-full max-w-[28rem] max-[320px]:max-w-[19.5rem]">
        <div className="relative overflow-hidden rounded-3xl border border-ui-border bg-ui-card/95 p-5 backdrop-blur-md max-[320px]:p-4 sm:p-8">
          <div className="mb-6 flex flex-col items-center text-center max-[320px]:mb-5 sm:mb-8">
            <div className="mt-1 flex items-center justify-center">
              <Image
                src="/AppLogoFrameBlack.webp"
                alt={translate('login.logoAlt')}
                width={789}
                height={662}
                fetchPriority="high"
                decoding="async"
                className="block h-20 w-auto select-none opacity-75 dark:hidden sm:h-24"
              />
              <Image
                src="/AppLogoFrameWhite.webp"
                alt={translate('login.logoAlt')}
                width={789}
                height={662}
                fetchPriority="high"
                decoding="async"
                className="hidden h-20 w-auto select-none opacity-75 dark:block sm:h-24"
              />
            </div>
            <h1 className={`mt-2 text-balance ${displayHeadingTextClass}`}>
              {translate('login.title')}
            </h1>
            <p className={`mt-2 ${mutedSecondaryTextClass}`}>{translate('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5" noValidate>
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

          <p className={`mt-4 ${mutedMetaTextClass} sm:mt-5 sm:text-sm`}>
            {translate('login.helpText')}
          </p>
        </div>
      </div>
    </main>
  );
});

LoginComponent.displayName = 'Login';

/** Public login route component. */
export const Login = LoginComponent;
