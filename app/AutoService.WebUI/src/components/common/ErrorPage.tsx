/** Shared full-page error display: image, background code, title, subtitle, CTA and optional countdown. */
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
	buttonClass,
	centeredAmbientOrbLayoutClass,
	defaultBorderToneClass,
	mutedSecondaryTextClass,
	relativeOverflowBorderLayoutClass,
	uppercaseMetaLabelTextClass,
} from '../../utils/formStyles';
import { getCachedErrorIllustrationSource } from '../../utils/errorIllustrationCache';
import { ThemeLanguageControls } from '../layout/ThemeLanguageControls';
import { Image } from './Image';

interface ErrorPageProps {
	readonly imageSrc: string;
	readonly imageAlt: string;
	/** Large decorative background watermark text (e.g. `"404"`, `"500"`). */
	readonly backgroundCode: string;
	readonly titleKey: string;
	readonly subtitleKey: string;
	readonly ctaTextKey: string;
	readonly onCtaClick: () => void;
	readonly countdownLabelKey?: string;
	readonly secondsLeft?: number;
}

interface ErrorPageCountdownProps {
	readonly label: string;
	readonly secondsLeft: number;
}

const errorPageCtaClass = `${buttonClass} mt-5 w-full sm:w-auto`;

const ErrorPageCountdown = memo(function ErrorPageCountdown({ label, secondsLeft }: ErrorPageCountdownProps) {
	return (
		<div className="mt-6 border-t border-ui-border pt-4 text-center">
			<p className={uppercaseMetaLabelTextClass}>
				{label}
			</p>
			<p className="mt-1 text-3xl font-semibold leading-none text-ui-text">
				{String(secondsLeft).padStart(2, '0')}
			</p>
		</div>
	);
});

ErrorPageCountdown.displayName = 'ErrorPageCountdown';

const ErrorPageComponent = memo(function ErrorPage({
	imageSrc,
	imageAlt,
	backgroundCode,
	titleKey,
	subtitleKey,
	ctaTextKey,
	onCtaClick,
	countdownLabelKey,
	secondsLeft,
}: ErrorPageProps) {
	const { t: translate } = useTranslation();
	const [resolvedImage, setResolvedImage] = useState({ imageSrc, src: imageSrc });
	const resolvedImageSrc = resolvedImage.imageSrc === imageSrc ? resolvedImage.src : imageSrc;

	useEffect(() => {
		// The flag is a property, because TypeScript narrows a captured `let` to `false` inside the async body
		// although the cleanup flips it during the await.
		const lifecycle = { isDisposed: false };
		let cleanup: (() => void) | undefined;

		void (async () => {
			const cachedSource = await getCachedErrorIllustrationSource(imageSrc);
			if (lifecycle.isDisposed) {
				cachedSource.dispose?.();
				return;
			}

			cleanup = cachedSource.dispose;
			setResolvedImage({ imageSrc, src: cachedSource.src });
		})();

		return () => {
			lifecycle.isDisposed = true;
			cleanup?.();
		};
	}, [imageSrc]);

	return (
		<div className="relative min-h-screen overflow-hidden bg-ui-surface text-ui-text">
			<div aria-hidden="true" className={`error-page-ambient ${centeredAmbientOrbLayoutClass}`} />
			<ThemeLanguageControls />
			<main className="relative z-10 mx-auto flex min-h-screen min-w-0 w-full max-w-[1920px] items-center justify-center px-3 pt-24 sm:px-6 sm:pt-0">
				<span
					aria-hidden="true"
					className="pointer-events-none absolute left-1/2 top-1/2 -z-10 -translate-x-1/2 -translate-y-1/2 select-none text-[14rem] font-bold leading-none text-arsm-primary/[0.05] dark:text-arsm-primary-dark/[0.08] sm:text-[22rem] lg:text-[34rem] xl:text-[42rem]"
				>
					{backgroundCode}
				</span>
				<section className="relative min-w-0 w-full max-w-[74rem]">
					<div className="grid min-w-0 items-stretch gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
						<div className={`${relativeOverflowBorderLayoutClass} ${defaultBorderToneClass} flex min-h-[260px] items-center justify-center bg-ui-toggle p-4 max-[320px]:min-h-[210px] sm:min-h-[320px]`}>
							<div aria-hidden="true" className="error-page-illustration-glow pointer-events-none absolute inset-0" />
							<Image
								src={resolvedImageSrc}
								alt={imageAlt}
								className="relative z-10 h-auto w-[min(78%,404px)] select-none max-[404px]:w-[76%]"
								draggable={false}
							/>
						</div>

						<div className="flex min-w-0 flex-col justify-center rounded-2xl border border-ui-border bg-arsm-input/95 p-5 text-center backdrop-blur-sm dark:bg-arsm-card-dark/92 max-[320px]:p-4 sm:p-6 lg:p-8">
							<h1 className="text-2xl font-semibold leading-tight text-ui-text sm:text-3xl lg:text-4xl">
								{translate(titleKey)}
							</h1>
							<p className={`mt-3 ${mutedSecondaryTextClass} sm:text-base`}>
								{translate(subtitleKey)}
							</p>
							<button type="button" onClick={onCtaClick} className={errorPageCtaClass}>
								{translate(ctaTextKey)}
							</button>
							{secondsLeft !== undefined && (
								<ErrorPageCountdown
									label={translate(countdownLabelKey ?? 'notFound.redirectIn')}
									secondsLeft={secondsLeft}
								/>
							)}
						</div>
					</div>
				</section>
			</main>
		</div>
	);
});

ErrorPageComponent.displayName = 'ErrorPage';

export const ErrorPage = ErrorPageComponent;