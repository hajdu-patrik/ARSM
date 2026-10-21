/** Confirm-variant `Modal` with the shared Cancel / confirm footer; the confirm button shows `busyLabel` while busy. */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import { buttonClass, dangerButtonClass, defaultIconClass, secondaryButtonClass } from '../../utils/formStyles';
import { Modal } from './Modal';

interface ConfirmModalProps {
  readonly isOpen: boolean;
  readonly title: string;
  readonly isBusy: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
  readonly confirmLabel: string;
  readonly busyLabel: string;
  readonly icon: LucideIcon;
  readonly tone?: 'primary' | 'danger';
  readonly confirmDisabled?: boolean;
  readonly confirmTestId?: string;
  readonly children: ReactNode;
}

/** Confirmation dialog: the caller passes the message as children and keeps its own busy guard in `onClose`. */
export function ConfirmModal({
  isOpen,
  title,
  isBusy,
  onClose,
  onConfirm,
  confirmLabel,
  busyLabel,
  icon: Icon,
  tone = 'primary',
  confirmDisabled = false,
  confirmTestId,
  children,
}: ConfirmModalProps) {
  const { t } = useTranslation();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      variant="confirm"
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={isBusy} className={secondaryButtonClass}>
            {t('common.actions.cancel')}
          </button>
          <button
            data-testid={confirmTestId}
            type="button"
            onClick={onConfirm}
            disabled={isBusy || confirmDisabled}
            aria-busy={isBusy}
            className={tone === 'danger' ? dangerButtonClass : buttonClass}
          >
            <Icon className={defaultIconClass} />
            <span>{isBusy ? busyLabel : confirmLabel}</span>
          </button>
        </>
      )}
    >
      {children}
    </Modal>
  );
}
