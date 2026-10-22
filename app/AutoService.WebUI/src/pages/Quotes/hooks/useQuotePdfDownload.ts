/** Quote PDF download: every status is printable; a failed binary response has no validation detail, so it is one toast. */
import { useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { quoteService } from '../../../services/quotes/quote.service';
import { saveBlobAsFile } from '../helpers';
import { QUOTE_WRITE_NETWORK_MODE } from './quoteMutation.helpers';

/** The two quote fields a download needs: the id to fetch and the number that names a file without a header. */
interface PdfDownloadTarget {
  id: number;
  quoteNumber: string;
}

interface UseQuotePdfDownloadParams {
  showErrorToast: (messageKey: string) => void;
}

export function useQuotePdfDownload({ showErrorToast }: UseQuotePdfDownloadParams) {
  const { mutate, isPending: isDownloadingPdf } = useMutation({
    networkMode: QUOTE_WRITE_NETWORK_MODE,
    mutationFn: async (quote: PdfDownloadTarget) => {
      const { blob, fileName } = await quoteService.downloadPdf(quote.id);
      saveBlobAsFile(blob, fileName ?? `${quote.quoteNumber}.pdf`);
    },
    onError: () => {
      showErrorToast('quotes.errors.pdfDownloadFailed');
    },
  });

  const handleDownloadPdf = useCallback((quote: PdfDownloadTarget) => {
    mutate(quote);
  }, [mutate]);

  return { isDownloadingPdf, handleDownloadPdf };
}
