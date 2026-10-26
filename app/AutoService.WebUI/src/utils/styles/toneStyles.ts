/** Shared semantic color tones: one light+dark recipe per tone/surface family; components
 * choose a tone and never re-type palette classes (see app/AutoService.WebUI/CLAUDE.md). */

export type SemanticTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

/** The signal subset used by feedback surfaces, filter chips and status signals. */
export type SignalTone = Extract<SemanticTone, 'success' | 'warning' | 'error'>;

/** Soft pill recipe (border, background, text) for status badges and status pills; the light success and error text use the AA badge tokens. */
export const toneBadgeClasses: Record<SemanticTone, string> = {
  neutral: 'border-ui-border bg-ui-toggle text-ui-label',
  info: 'border-ui-info-border/70 bg-ui-info-bg text-ui-info-text',
  success: 'border-ui-success-border/70 bg-arsm-success-soft text-arsm-badge-success-text dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark',
  warning: 'border-ui-warning-border/70 bg-ui-warning-bg text-ui-warning-text',
  error: 'border-arsm-error-border/70 bg-arsm-error-soft text-arsm-badge-error-text dark:border-arsm-error-dark/70 dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light',
};

/** Solid status-dot fill (badge dots, calendar day dots, status filter chips). */
export const toneDotClasses: Record<SemanticTone, string> = {
  neutral: 'bg-arsm-status-dot-fallback',
  info: 'bg-arsm-info-ring',
  success: 'bg-arsm-success-accent',
  warning: 'bg-arsm-warning-accent',
  error: 'bg-arsm-error-accent',
};

/** Feedback surface recipe (border, background, text) for toasts, inline notices and alert panels. */
export const toneFeedbackClasses: Record<SignalTone, string> = {
  success: 'border-ui-success-border/60 bg-ui-success-bg text-ui-success-text',
  warning: 'border-ui-warning-border/60 bg-ui-warning-bg text-ui-warning-text',
  error: 'border-arsm-error-border/60 bg-ui-error-bg text-arsm-error-text dark:border-arsm-error-dark/60 dark:text-arsm-error-text-light',
};

/** Tone-colored text for inline status copy (due dates, destructive section copy, tone icons). */
export const toneTextClasses: Record<Extract<SemanticTone, 'neutral' | 'success' | 'warning' | 'error'>, string> = {
  neutral: 'text-ui-label',
  success: 'text-ui-success-text',
  warning: 'text-ui-warning-text',
  error: 'text-arsm-error-text dark:text-arsm-error-text-light',
};

/** Interaction states of a tone-colored toggle filter chip. */
export interface ToneFilterChipClasses {
  /** Resting look while the filter is off: the badge tone at reduced strength. */
  readonly inactive: string;
  readonly inactiveHover: string;
  readonly inactivePress: string;
  /** Look while the filter is on: the full badge tone plus a tone outline (no layout shift). */
  readonly active: string;
  readonly activeHover: string;
  readonly activePress: string;
}

/** Toggle filter chip recipe per signal tone (for example the scheduler month status filters). */
export const toneFilterChipClasses: Record<SignalTone, ToneFilterChipClasses> = {
  warning: {
    inactive: 'border-ui-warning-border/65 bg-ui-warning-bg/65 text-ui-warning-text',
    inactiveHover: 'hover:border-ui-warning-border/80 hover:bg-ui-warning-bg/80',
    inactivePress: 'active:border-ui-warning-border active:bg-ui-warning-bg active:saturate-125',
    active: 'border-ui-warning-border bg-ui-warning-bg text-ui-warning-text outline-2 outline-ui-warning-border/35',
    activeHover: 'hover:border-ui-warning-border hover:bg-ui-warning-bg',
    activePress: 'active:border-ui-warning-border active:bg-ui-warning-bg active:saturate-150 active:brightness-95',
  },
  success: {
    inactive: 'border-ui-success-border/65 bg-arsm-success-soft/65 text-arsm-badge-success-text dark:bg-arsm-success-bg-dark/65 dark:text-arsm-success-text-dark',
    inactiveHover: 'hover:border-ui-success-border/80 hover:bg-arsm-success-soft/80 dark:hover:bg-arsm-success-bg-dark/80',
    inactivePress: 'active:border-ui-success-border active:bg-arsm-success-soft active:saturate-125 dark:active:bg-arsm-success-bg-dark',
    active: 'border-ui-success-border bg-arsm-success-soft text-arsm-badge-success-text outline-2 outline-ui-success-border/35 dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark',
    activeHover: 'hover:border-ui-success-border hover:bg-arsm-success-soft dark:hover:bg-arsm-success-bg-dark',
    activePress: 'active:border-ui-success-border active:bg-arsm-success-soft active:saturate-150 active:brightness-95 dark:active:bg-arsm-success-bg-dark',
  },
  error: {
    inactive: 'border-arsm-error-border/65 bg-arsm-error-soft/65 text-arsm-badge-error-text dark:border-arsm-error-dark/65 dark:bg-arsm-error-bg-dark/65 dark:text-arsm-error-text-light',
    inactiveHover: 'hover:border-arsm-error-border/80 hover:bg-arsm-error-soft/80 dark:hover:border-arsm-error-dark/80 dark:hover:bg-arsm-error-bg-dark/80',
    inactivePress: 'active:border-arsm-error-border active:bg-arsm-error-soft active:saturate-125 dark:active:border-arsm-error-dark dark:active:bg-arsm-error-bg-dark',
    active: 'border-arsm-error-border bg-arsm-error-soft text-arsm-badge-error-text outline-2 outline-arsm-error-border/35 dark:border-arsm-error-dark dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:outline-arsm-error-dark/35',
    activeHover: 'hover:border-arsm-error-border hover:bg-arsm-error-soft dark:hover:border-arsm-error-dark dark:hover:bg-arsm-error-bg-dark',
    activePress: 'active:border-arsm-error-border active:bg-arsm-error-soft active:saturate-150 active:brightness-95 dark:active:border-arsm-error-dark dark:active:bg-arsm-error-bg-dark',
  },
};
