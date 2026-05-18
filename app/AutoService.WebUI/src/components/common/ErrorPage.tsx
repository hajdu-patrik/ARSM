/**
 * Shared full-page error display component.
 *
 * Renders a branded, responsive error state with a configurable image,
 * background code, title, subtitle, CTA button, and optional countdown.
 * @module components/common/ErrorPage
 */
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { buttonClass } from '../../utils/formStyles';
import { getCachedErrorIllustrationSource } from '../../utils/errorIllustrationCache';
import { ThemeLanguageControls } from '../layout/ThemeLanguageControls';
import { Image } from './Image';

/** Props for the {@link ErrorPage} component. */
interface ErrorPageProps {
	/** Public path to the illustration image (e.g. `/Error-404.webp`). */
	readonly imageSrc: string;
	/** Accessible alt text for the illustration image. */
	readonly imageAlt: string;
	/** Large decorative background watermark text (e.g. `"404"`, `"500"`). */
	readonly backgroundCode: string;
	/** i18n key for the page heading. */
	readonly titleKey: string;
	/** i18n key for the subtitle paragraph. */
	readonly subtitleKey: string;
	/** i18n key for the primary CTA button label. */
	readonly ctaTextKey: string;
	/** Called when the CTA button is activated. */
	readonly onCtaClick: () => void;
	/** i18n key for the countdown label shown above remaining seconds. */
	readonly countdownLabelKey?: string;
	/** Remaining seconds for an optional countdown display. */
	readonly secondsLeft?: number;
}

/** Props for the compact countdown block shown on timed redirects. */
interface ErrorPageCountdownProps {
	readonly label: string;
	readonly secondsLeft: number;
}

const errorPageCtaClass = `${buttonClass} mt-5 w-full px-8 py-3 sm:w-auto sm:text-base`;

/**
 * Displays the optional redirect countdown section in error states.
 */
const ErrorPageCountdown = memo(function ErrorPageCountdown({ label, secondsLeft }: ErrorPageCountdownProps) {
	return (
		<div className="mt-6 border-t border-arsm-border pt-4 text-center dark:border-arsm-border-dark">
			<p className="text-[11px] uppercase tracking-[0.2em] text-arsm-muted dark:text-arsm-muted-dark">
				{label}
			</p>
			<p className="mt-1 text-3xl font-semibold leading-none text-arsm-primary dark:text-arsm-primary-dark">
				{String(secondsLeft).padStart(2, '0')}
			</p>
		</div>
	);
});

ErrorPageCountdown.displayName = 'ErrorPageCountdown';

/**
 * Composes the shared error-page layout with decorative watermark and optional countdown.
 */
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
	const [resolvedImageSrc, setResolvedImageSrc] = useState(imageSrc);

	useEffect(() => {
		let isDisposed = false;
		let cleanup: (() => void) | undefined;

		setResolvedImageSrc(imageSrc);

		void (async () => {
			const cachedSource = await getCachedErrorIllustrationSource(imageSrc);
			if (isDisposed) {
				cachedSource.dispose?.();
				return;
			}

			cleanup = cachedSource.dispose;
			setResolvedImageSrc(cachedSource.src);
		})();

		return () => {
			isDisposed = true;
			cleanup?.();
		};
	}, [imageSrc]);

	return (
		<div className="relative min-h-screen overflow-hidden bg-arsm-surface text-arsm-primary dark:bg-arsm-surface-dark dark:text-arsm-primary-dark">
			<div aria-hidden="true" className="error-page-ambient pointer-events-none absolute left-1/2 top-1/2 z-0 h-[120vmax] w-[120vmax] -translate-x-1/2 -translate-y-1/2 rounded-full" />
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
						<div className="relative flex min-h-[260px] items-center justify-center overflow-hidden rounded-2xl border border-arsm-border bg-arsm-toggle-bg p-4 dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark max-[320px]:min-h-[210px] sm:min-h-[320px]">
							<div aria-hidden="true" className="error-page-illustration-glow pointer-events-none absolute inset-0" />
							<Image
								src={resolvedImageSrc}
								alt={imageAlt}
								className="relative z-10 h-auto w-[min(78%,404px)] select-none max-[404px]:w-[76%]"
								draggable={false}
							/>
						</div>

						<div className="flex min-w-0 flex-col justify-center rounded-2xl border border-arsm-border bg-arsm-input/95 p-5 text-center backdrop-blur-sm dark:border-arsm-border-dark dark:bg-arsm-card-dark/92 max-[320px]:p-4 sm:p-6 lg:p-8">
							<h1 className="text-2xl font-semibold leading-tight text-arsm-primary dark:text-arsm-primary-dark sm:text-3xl lg:text-4xl">
								{translate(titleKey)}
							</h1>
							<p className="mt-3 text-sm text-arsm-muted dark:text-arsm-muted-dark sm:text-base">
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

/** Reusable full-page error component for 404, 500, and similar states. */
export const ErrorPage = ErrorPageComponent;