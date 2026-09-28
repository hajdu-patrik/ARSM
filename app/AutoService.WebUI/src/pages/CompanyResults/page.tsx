/** Company results page: accepted quotes for a period with pending/expired/rejected, a monthly and VAT breakdown; a quote counts in its creation month, so past months never change retroactively. */
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useToastStore } from '../../store/toast.store';
import {
  mutedSecondaryTextClass,
  pageHeaderWithSubtitleClass,
  pageShellClass,
  pageSubtitleClass,
  pageTitleClass,
} from '../../utils/formStyles';
import { useCompanyResults } from './hooks/useCompanyResults';
import { PeriodPicker } from './components/PeriodPicker';
import { CompanyResultSummary } from './components/CompanyResultSummary';
import { CompanyResultMonthList } from './components/CompanyResultMonthList';
import { VatBreakdownList } from './components/VatBreakdownList';

const CompanyResultsPageComponent = memo(function CompanyResultsPage() {
  const { t, i18n } = useTranslation();
  const showErrorToast = useToastStore((state) => state.showError);
  const { year, month, setYear, setMonth, result, isLoading } = useCompanyResults({ showErrorToast });

  return (
    <div className={`${pageShellClass} flex flex-col gap-6`}>
      <header className={pageHeaderWithSubtitleClass}>
        <h1 className={pageTitleClass}>{t('nav.companyResults')}</h1>
        <p className={pageSubtitleClass}>{t('companyResults.pageDescription')}</p>
      </header>

      <PeriodPicker
        t={t}
        locale={i18n.language}
        year={year}
        month={month}
        onYearChange={setYear}
        onMonthChange={setMonth}
      />

      {isLoading && (
        <p className={`py-6 text-center ${mutedSecondaryTextClass}`}>{t('companyResults.loading')}</p>
      )}

      {!isLoading && result && (
        <>
          <CompanyResultSummary t={t} locale={i18n.language} result={result} />
          <CompanyResultMonthList t={t} locale={i18n.language} months={result.months} />
          <VatBreakdownList t={t} locale={i18n.language} rows={result.acceptedVatBreakdown} />
        </>
      )}

      {!isLoading && !result && (
        <p data-testid="company-results-unavailable" className={`py-6 text-center ${mutedSecondaryTextClass}`}>
          {t('companyResults.errors.loadFailed')}
        </p>
      )}
    </div>
  );
});

CompanyResultsPageComponent.displayName = 'CompanyResultsPage';

/** Company results route component. */
export const CompanyResultsPage = CompanyResultsPageComponent;
