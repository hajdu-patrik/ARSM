/**
 * Shared semantic color tones.
 *
 * One light + dark color recipe per tone and per surface family, so a status, notice, toast, filter
 * chip or tone-colored text reads the same wherever it appears. Components choose a tone (usually
 * through a feature-owned status-to-tone map) and never re-type the palette classes themselves.
 */

/** Every semantic tone a recipe can cover. */
export type SemanticTone = 'neutral' | 'info' | 'success' | 'warning' | 'error';

/** The signal subset used by feedback surfaces, filter chips and status signals. */
export type SignalTone = Extract<SemanticTone, 'success' | 'warning' | 'error'>;

/** Soft pill recipe (border, background, text) for status badges and status pills. */
export const toneBadgeClasses: Record<SemanticTone, string> = {
  neutral: 'border-arsm-border bg-arsm-toggle-bg text-arsm-label dark:border-arsm-border-dark dark:bg-arsm-toggle-bg-dark dark:text-arsm-label-dark',
  info: 'border-arsm-info-border/70 bg-arsm-info-bg text-arsm-info-text dark:border-arsm-info-border-dark/70 dark:bg-arsm-info-bg-dark dark:text-arsm-info-text-dark',
  success: 'border-arsm-success-border/70 bg-arsm-success-soft text-arsm-success-text dark:border-arsm-success-border-dark/70 dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark',
  warning: 'border-arsm-warning-border/70 bg-arsm-warning-bg text-arsm-warning-text dark:border-arsm-warning-border-dark/70 dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark',
  error: 'border-arsm-error-border/70 bg-arsm-error-soft text-arsm-error-text dark:border-arsm-error-dark/70 dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light',
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
  success: 'border-arsm-success-border/60 bg-arsm-success-bg text-arsm-success-text dark:border-arsm-success-border-dark/60 dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark',
  warning: 'border-arsm-warning-border/60 bg-arsm-warning-bg text-arsm-warning-text dark:border-arsm-warning-border-dark/60 dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark',
  error: 'border-arsm-error-border/60 bg-arsm-error-bg text-arsm-error-text dark:border-arsm-error-dark/60 dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light',
};

/** Tone-colored text for inline status copy (due dates, destructive section copy, tone icons). */
export const toneTextClasses: Record<Extract<SemanticTone, 'neutral' | 'warning' | 'error'>, string> = {
  neutral: 'text-arsm-label dark:text-arsm-label-dark',
  warning: 'text-arsm-warning-text dark:text-arsm-warning-text-dark',
  error: 'text-arsm-error-text dark:text-arsm-error-text-light',
};

/** Interaction states of a tone-colored toggle filter chip. */
export interface ToneFilterChipClasses {
  /** Resting look while the filter is off: the badge tone at reduced strength. */
  readonly inactive: string;
  readonly inactiveHover: string;
  readonly inactivePress: string;
  /** Look while the filter is on: the full badge tone plus a tone ring. */
  readonly active: string;
  readonly activeHover: string;
  readonly activePress: string;
}

/** Toggle filter chip recipe per signal tone (for example the scheduler month status filters). */
export const toneFilterChipClasses: Record<SignalTone, ToneFilterChipClasses> = {
  warning: {
    inactive: 'border-arsm-warning-border/65 bg-arsm-warning-bg/65 text-arsm-warning-text dark:border-arsm-warning-border-dark/65 dark:bg-arsm-warning-bg-dark/65 dark:text-arsm-warning-text-dark',
    inactiveHover: 'hover:border-arsm-warning-border/80 hover:bg-arsm-warning-bg/80 dark:hover:border-arsm-warning-border-dark/80 dark:hover:bg-arsm-warning-bg-dark/80',
    inactivePress: 'active:border-arsm-warning-border active:bg-arsm-warning-bg active:saturate-125 dark:active:border-arsm-warning-border-dark dark:active:bg-arsm-warning-bg-dark',
    active: 'border-arsm-warning-border bg-arsm-warning-bg text-arsm-warning-text ring-2 ring-arsm-warning-border/35 dark:border-arsm-warning-border-dark dark:bg-arsm-warning-bg-dark dark:text-arsm-warning-text-dark dark:ring-arsm-warning-border-dark/35',
    activeHover: 'hover:border-arsm-warning-border hover:bg-arsm-warning-bg dark:hover:border-arsm-warning-border-dark dark:hover:bg-arsm-warning-bg-dark',
    activePress: 'active:border-arsm-warning-border active:bg-arsm-warning-bg active:saturate-150 active:brightness-95 dark:active:border-arsm-warning-border-dark dark:active:bg-arsm-warning-bg-dark',
  },
  success: {
    inactive: 'border-arsm-success-border/65 bg-arsm-success-soft/65 text-arsm-success-text dark:border-arsm-success-border-dark/65 dark:bg-arsm-success-bg-dark/65 dark:text-arsm-success-text-dark',
    inactiveHover: 'hover:border-arsm-success-border/80 hover:bg-arsm-success-soft/80 dark:hover:border-arsm-success-border-dark/80 dark:hover:bg-arsm-success-bg-dark/80',
    inactivePress: 'active:border-arsm-success-border active:bg-arsm-success-soft active:saturate-125 dark:active:border-arsm-success-border-dark dark:active:bg-arsm-success-bg-dark',
    active: 'border-arsm-success-border bg-arsm-success-soft text-arsm-success-text ring-2 ring-arsm-success-border/35 dark:border-arsm-success-border-dark dark:bg-arsm-success-bg-dark dark:text-arsm-success-text-dark dark:ring-arsm-success-border-dark/35',
    activeHover: 'hover:border-arsm-success-border hover:bg-arsm-success-soft dark:hover:border-arsm-success-border-dark dark:hover:bg-arsm-success-bg-dark',
    activePress: 'active:border-arsm-success-border active:bg-arsm-success-soft active:saturate-150 active:brightness-95 dark:active:border-arsm-success-border-dark dark:active:bg-arsm-success-bg-dark',
  },
  error: {
    inactive: 'border-arsm-error-border/65 bg-arsm-error-soft/65 text-arsm-error-text dark:border-arsm-error-dark/65 dark:bg-arsm-error-bg-dark/65 dark:text-arsm-error-text-light',
    inactiveHover: 'hover:border-arsm-error-border/80 hover:bg-arsm-error-soft/80 dark:hover:border-arsm-error-dark/80 dark:hover:bg-arsm-error-bg-dark/80',
    inactivePress: 'active:border-arsm-error-border active:bg-arsm-error-soft active:saturate-125 dark:active:border-arsm-error-dark dark:active:bg-arsm-error-bg-dark',
    active: 'border-arsm-error-border bg-arsm-error-soft text-arsm-error-text ring-2 ring-arsm-error-border/35 dark:border-arsm-error-dark dark:bg-arsm-error-bg-dark dark:text-arsm-error-text-light dark:ring-arsm-error-dark/35',
    activeHover: 'hover:border-arsm-error-border hover:bg-arsm-error-soft dark:hover:border-arsm-error-dark dark:hover:bg-arsm-error-bg-dark',
    activePress: 'active:border-arsm-error-border active:bg-arsm-error-soft active:saturate-150 active:brightness-95 dark:active:border-arsm-error-dark dark:active:bg-arsm-error-bg-dark',
  },
};
