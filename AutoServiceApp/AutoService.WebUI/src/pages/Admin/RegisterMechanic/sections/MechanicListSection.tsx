import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { adminService } from '../../../../services/admin.service';
import { useToastStore } from '../../../../store/toast.store';
import { Modal } from '../../../../components/common/Modal';
import type { MechanicListItem } from '../../../../services/admin.service';

interface MechanicListSectionProps {
  readonly refreshKey: number;
}

export const MechanicListSection = memo(function MechanicListSection({ refreshKey }: MechanicListSectionProps) {
  const { t } = useTranslation();
  const showSuccessToast = useToastStore((state) => state.showSuccess);
  const showErrorToast = useToastStore((state) => state.showError);

  const [mechanics, setMechanics] = useState<MechanicListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<MechanicListItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadMechanics = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await adminService.listMechanics();
      setMechanics(data);
    } catch {
      showErrorToast('admin.mechanicListError');
    } finally {
      setIsLoading(false);
    }
  }, [showErrorToast]);

  useEffect(() => {
    void loadMechanics();
  }, [loadMechanics, refreshKey]);

  const openDeleteModal = useCallback((mechanic: MechanicListItem) => {
    setDeleteTarget(mechanic);
  }, []);

  const closeDeleteModal = useCallback(() => {
    if (isDeleting) return;
    setDeleteTarget(null);
  }, [isDeleting]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      await adminService.deleteMechanic(deleteTarget.personId);
      setMechanics((prev) => prev.filter((m) => m.personId !== deleteTarget.personId));
      showSuccessToast('admin.mechanicDeleted', { email: deleteTarget.email });
      setDeleteTarget(null);
    } catch {
      showErrorToast('admin.mechanicDeleteFailed');
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, showErrorToast, showSuccessToast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#C9B3FF] border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-[#D8D2E9] bg-[#F6F4FB] p-5 dark:border-[#3A3154] dark:bg-[#13131B] sm:p-6">
        <h2 className="mb-4 text-lg font-semibold text-[#2C2440] dark:text-[#EDE8FA]">
          {t('admin.mechanicList')}
        </h2>

        {mechanics.length === 0 ? (
          <p className="text-sm text-[#5E5672] dark:text-[#CFC5EA]">{t('admin.noMechanics')}</p>
        ) : (
          <div className="space-y-3">
            {mechanics.map((mechanic) => (
              <div
                key={mechanic.personId}
                className="flex items-center justify-between rounded-xl border border-[#D8D2E9] bg-white px-4 py-3 dark:border-[#3A3154] dark:bg-[#1A1A25]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#2C2440] dark:text-[#EDE8FA] truncate">
                      {mechanic.lastName} {mechanic.firstName}
                      {mechanic.middleName ? ` ${mechanic.middleName}` : ''}
                    </p>
                    {mechanic.isAdmin && (
                      <span className="inline-flex items-center rounded-full bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#5E5672] dark:text-[#CFC5EA] truncate">{mechanic.email}</p>
                </div>

                {!mechanic.isAdmin && (
                  <button
                    type="button"
                    onClick={() => openDeleteModal(mechanic)}
                    title={t('admin.deleteMechanic')}
                    className="ml-3 flex-shrink-0 rounded-lg p-2 text-red-500 transition hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={closeDeleteModal}
        title={t('admin.deleteMechanicModalTitle')}
        footer={(
          <>
            <button
              type="button"
              onClick={closeDeleteModal}
              disabled={isDeleting}
              className="inline-flex items-center justify-center rounded-xl border border-[#D8D2E9] bg-transparent px-4 py-2 text-sm font-medium text-[#5E5672] transition hover:bg-[#EFEBFA] disabled:cursor-not-allowed disabled:opacity-70 dark:border-[#3A3154] dark:text-[#CFC5EA] dark:hover:bg-[#241F33]"
            >
              {t('settings.cancel')}
            </button>
            <button
              type="button"
              onClick={() => { void handleDelete(); }}
              disabled={isDeleting}
              className="inline-flex items-center justify-center rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-400"
            >
              {isDeleting ? t('admin.deleting') : t('admin.confirmDelete')}
            </button>
          </>
        )}
      >
        <p className="text-sm text-[#5E5672] dark:text-[#CFC5EA]">
          {t('admin.deleteMechanicWarning', {
            name: deleteTarget ? `${deleteTarget.firstName} ${deleteTarget.lastName}` : '',
            email: deleteTarget?.email ?? '',
          })}
        </p>
      </Modal>
    </>
  );
});
