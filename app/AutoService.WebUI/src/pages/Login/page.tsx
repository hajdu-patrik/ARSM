/**
 * Login page.
 * Supports email or phone identifier login modes and localized feedback.
 * @module pages/Login/page
 */
import { memo, useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';
import { authService } from '../../services/auth/auth.service';
import { useToastStore } from '../../store/toast.store';
import { ThemeLanguageControls } from '../../components/layout/ThemeLanguageControls';
import { Image } from '../../components/common/Image';
import {
	centeredAmbientOrbLayoutClass,
	buttonClass,
	getSegmentedControlOptionClass,
	inputClass,
	inputGroupContainerClass,
	labelClass,
	mutedMetaTextClass,
	mutedSecondaryTextClass,
	passwordToggleButtonClass,
	segmentedControlClass,
} from '../../utils/formStyles';
import { parseIdentifierByMethod, resolveLoginError, type LoginMethod } from './login.helpers';

type InvalidIdentifierReason = 'wrong_method_email' | 'wrong_method_phone' | 'format';

const LoginComponent = memo(function Login() {
	const navigate = useNavigate();
	const { t: translate } = useTranslation();
	const showSuccessToast = useToastStore((state) => state.showSuccess);
	const showErrorToast = useToastStore((state) => state.showError);

	const [identifier, setIdentifier] = useState('');
	const [password, setPassword] = useState('');
	const [loginMethod, setLoginMethod] = useState<LoginMethod>('email');
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);

	const showInvalidIdentifierError = useCallback((reason: InvalidIdentifierReason) => {
		if (reason === 'wrong_method_email') {
			showErrorToast('login.wrongMethodEmailInPhone');
			return;
		}

		if (reason === 'wrong_method_phone') {
			showErrorToast('login.wrongMethodPhoneInEmail');
			return;
		}

		showErrorToast('login.invalidFormat');
	}, [showErrorToast]);

	const showResolvedLoginError = useCallback((
		resolvedError: ReturnType<typeof resolveLoginError>,
		method: LoginMethod,
	) => {
		if (resolvedError.key === 'login.identifierNotFound') {
			showErrorToast(method === 'email' ? 'login.identifierNotFoundEmail' : 'login.identifierNotFoundPhone');
			return;
		}

		if (resolvedError.key === 'login.attemptsExceededWithDuration') {
			showErrorToast(resolvedError.key, { minutes: resolvedError.minutes });
			return;
		}

		showErrorToast(resolvedError.key);
	}, [showErrorToast]);

	const handleSubmit = useCallback(async (event: React.SyntheticEvent<HTMLFormElement>) => {
		event.preventDefault();

		const parsedIdentifier = parseIdentifierByMethod(identifier, loginMethod);

		if (parsedIdentifier.kind === 'invalid') {
			showInvalidIdentifierError(parsedIdentifier.reason);
			return;
		}

		setIsLoading(true);
		try {
			const loginRequest = {
				email: parsedIdentifier.kind === 'email' ? parsedIdentifier.email : undefined,
				phoneNumber: parsedIdentifier.kind === 'phone' ? parsedIdentifier.phoneNumber : undefined,
				password,
			};

			await authService.login(loginRequest);
			showSuccessToast('login.success');
			navigate('/');
		} catch (error) {
			const resolvedError = resolveLoginError(error);
			showResolvedLoginError(resolvedError, loginMethod);
		} finally {
			setPassword('');
			setIsLoading(false);
		}
	}, [identifier, loginMethod, navigate, password, showInvalidIdentifierError, showResolvedLoginError, showSuccessToast]);

	const handleLoginMethodChange = useCallback((method: LoginMethod) => {
		setLoginMethod(method);
		setIdentifier('');
	}, []);

	const identifierLabel = useMemo(
		() => (loginMethod === 'email' ? translate('login.email') : translate('login.phone')),
		[loginMethod, translate],
	);

	const identifierPlaceholder = useMemo(
		() => (loginMethod === 'email' ? translate('login.emailPlaceholder') : translate('login.phonePlaceholder')),
		[loginMethod, translate],
	);

	const identifierInputType = loginMethod === 'email' ? 'email' : 'tel';
	const identifierAutoComplete = loginMethod === 'email' ? 'username' : 'tel';
	const identifierInputMode = loginMethod === 'email' ? 'email' : 'tel';
	const identifierPattern = loginMethod === 'email' ? undefined : String.raw`[0-9+()\s-]+`;
	const canSubmit = identifier.trim().length > 0 && password.trim().length > 0 && !isLoading;

	return (
		<main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-arsm-surface px-3 pb-6 pt-24 text-arsm-primary dark:bg-arsm-deepest dark:text-arsm-primary-dark sm:px-4 sm:pb-8 sm:pt-8">
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
				<div className="relative overflow-hidden rounded-3xl border border-arsm-border bg-arsm-card/95 p-5 backdrop-blur-md dark:border-arsm-border-dark dark:bg-arsm-card-dark/95 max-[320px]:p-4 sm:p-8">
					<div
						aria-hidden="true"
						className="arsm-card-sheen pointer-events-none absolute inset-x-0 top-0 h-20"
					/>

					<div className="relative mb-6 flex flex-col items-center text-center max-[320px]:mb-5 sm:mb-8">
						<div className="mt-1 flex items-center justify-center">
							<Image
								src="/AppLogoFrameBlack.webp"
								alt={translate('login.logoAlt')}
								className="block h-20 w-auto select-none opacity-75 dark:hidden sm:h-24"
							/>
							<Image
								src="/AppLogoFrameWhite.webp"
								alt={translate('login.logoAlt')}
								className="hidden h-20 w-auto select-none opacity-75 dark:block sm:h-24"
							/>
						</div>
						<h1 className="mt-2 text-balance text-xl font-semibold text-arsm-primary dark:text-arsm-primary-dark sm:text-2xl">
							{translate('login.title')}
						</h1>
						<p className={`mt-2 ${mutedSecondaryTextClass}`}>{translate('login.subtitle')}</p>
					</div>

					<form onSubmit={handleSubmit} className="space-y-4 sm:space-y-4.5" noValidate>
						<div>
							<label htmlFor="identifier" className={labelClass}>
								{identifierLabel}
							</label>
							<input
								id="identifier"
								type={identifierInputType}
								autoComplete={identifierAutoComplete}
								inputMode={identifierInputMode}
								pattern={identifierPattern}
								value={identifier}
								onChange={(event) => {
									setIdentifier(event.target.value);
								}}
								placeholder={identifierPlaceholder}
								className={inputClass}
								required
								disabled={isLoading}
							/>
						</div>

						<div>
							<label htmlFor="password" className={labelClass}>
								{translate('login.passwordPlaceholder')}
							</label>
							<div className={inputGroupContainerClass}>
								<input
									id="password"
									type={showPassword ? 'text' : 'password'}
									autoComplete="current-password"
									value={password}
									onChange={(event) => {
										setPassword(event.target.value);
									}}
									placeholder={translate('login.loginPassword')}
									className={`${inputClass} pr-12`}
									required
									disabled={isLoading}
								/>
								<button
									type="button"
									onClick={() => setShowPassword((previousValue) => !previousValue)}
									className={passwordToggleButtonClass}
									aria-label={showPassword ? translate('login.hidePassword') : translate('login.showPassword')}
									disabled={isLoading}
								>
									{showPassword ? (
										<Eye className="h-5 w-5" aria-hidden="true" />
									) : (
										<EyeOff className="h-5 w-5" aria-hidden="true" />
									)}
								</button>
							</div>
						</div>

						<button
							type="submit"
							disabled={!canSubmit}
							className={`${buttonClass} mt-1.5 w-full sm:text-base`}
							aria-busy={isLoading}
						>
							{isLoading ? translate('login.loading') : translate('login.submit')}
						</button>

						<fieldset className="pt-1.5" aria-label={translate('login.loginMethodLabel')}>
							<legend className={`mb-2 font-medium uppercase tracking-wide ${mutedMetaTextClass}`}>
								{translate('login.loginMethodLabel')}
							</legend>
							<div className={segmentedControlClass}>
								<button
									type="button"
									onClick={() => handleLoginMethodChange('email')}
									className={getSegmentedControlOptionClass(loginMethod === 'email')}
									aria-pressed={loginMethod === 'email'}
									disabled={isLoading}
								>
									{translate('login.loginWithEmail')}
								</button>
								<button
									type="button"
									onClick={() => handleLoginMethodChange('phone')}
									className={getSegmentedControlOptionClass(loginMethod === 'phone')}
									aria-pressed={loginMethod === 'phone'}
									disabled={isLoading}
								>
									{translate('login.loginWithPhone')}
								</button>
							</div>
						</fieldset>
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

export const Login = LoginComponent;
