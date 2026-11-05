/** Customer e-mail dialog state of the quote send flow: saves the typed address to the customer, then hands back to the send. */
import { useCallback, useState } from 'react';
import { isAxiosError } from 'axios';
import { useMutation } from '@tanstack/react-query';
import { customerRegistryService } from '../../../services/customers/customer-registry.service';
import {
  extractServerFieldErrors,
  getFirstFieldErrorMessage,
  normalizeServerFieldErrors,
  type ServerErrorBody,
} from '../../../utils/serverValidation';
import { mapCustomerValidationMessageToKey } from '../../Customers/helpers';
import { QUOTE_WRITE_NETWORK_MODE } from './quoteMutation.helpers';
import { useQuoteCache } from './useQuoteCache';

/** The quote whose send the dialog is holding: its id, the vehicle that leads to the customer and the version to send with. */
export interface CustomerEmailTarget {
  readonly quoteId: number;
  readonly vehicleId: number;
  readonly version: number;
}

interface SaveCustomerEmailVariables {
  readonly target: CustomerEmailTarget;
  readonly email: string;
}

/** Reads the vehicle's customer, then saves it with the typed address and every other field unchanged. */
async function saveCustomerEmail({ target, email }: SaveCustomerEmailVariables): Promise<void> {
  const silent = { skipErrorRedirect: true };
  const vehicle = await customerRegistryService.getVehicle(target.vehicleId, silent);
  const customer = await customerRegistryService.getCustomer(vehicle.customer.id, silent);

  await customerRegistryService.updateCustomer(customer.id, {
    firstName: customer.firstName,
    middleName: customer.middleName,
    lastName: customer.lastName,
    email,
    phoneNumber: customer.phoneNumber,
  }, silent);
}

/** Message key shown when a failure carries no usable detail. */
const SAVE_FAILED_KEY = 'customers.errors.saveFailed';

/** The customer-form message key of a failed read or save: a field message first, else the detail, else the save fallback. */
function resolveErrorKey(error: unknown): string {
  if (!isAxiosError<ServerErrorBody>(error)) {
    return SAVE_FAILED_KEY;
  }

  const data = error.response?.data;
  const fieldErrors = normalizeServerFieldErrors(extractServerFieldErrors(data), mapCustomerValidationMessageToKey);
  const detail = data?.detail;

  return getFirstFieldErrorMessage(fieldErrors) ?? (detail ? mapCustomerValidationMessageToKey(detail) : SAVE_FAILED_KEY);
}

interface UseQuoteCustomerEmailParams {
  showErrorToast: (messageKey: string) => void;
}

/** Whether the key names the email field itself; every other failure is a generic one and stays toast-only. */
function isEmailFieldKey(key: string): boolean {
  return key.startsWith('common.validation.') || key === 'customers.errors.emailExists';
}

export function useQuoteCustomerEmail({ showErrorToast }: UseQuoteCustomerEmailParams) {
  const { invalidateCustomers } = useQuoteCache();
  const [target, setTarget] = useState<CustomerEmailTarget | null>(null);
  const [email, setEmailValue] = useState('');
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const { mutate, isPending: isSavingCustomerEmail } = useMutation({
    networkMode: QUOTE_WRITE_NETWORK_MODE,
    mutationFn: saveCustomerEmail,
    onSuccess: () => {
      invalidateCustomers();
    },
    onError: (error) => {
      const key = resolveErrorKey(error);

      if (isEmailFieldKey(key)) {
        setErrorKey(key);
      } else {
        showErrorToast(key);
      }
    },
  });

  /** Opens the dialog with an empty field: the stored address is missing or unusable. */
  const openCustomerEmailDialog = useCallback((nextTarget: CustomerEmailTarget) => {
    setEmailValue('');
    setErrorKey(null);
    setTarget(nextTarget);
  }, []);

  /** Closes the dialog and leaves the draft as it is; ignored while the save runs. */
  const closeCustomerEmailDialog = useCallback(() => {
    if (!isSavingCustomerEmail) {
      setTarget(null);
    }
  }, [isSavingCustomerEmail]);

  const setCustomerEmail = useCallback((value: string) => {
    setEmailValue(value);
    setErrorKey(null);
  }, []);

  /** Saves the typed address; once it is stored the dialog closes and `onSaved` resumes the send. */
  const confirmCustomerEmail = useCallback((onSaved: (saved: CustomerEmailTarget) => void) => {
    if (target === null) {
      return;
    }

    setErrorKey(null);
    mutate({ target, email: email.trim() }, {
      onSuccess: () => {
        setTarget(null);
        onSaved(target);
      },
    });
  }, [email, mutate, target]);

  return {
    customerEmail: email,
    customerEmailErrorKey: errorKey,
    isCustomerEmailDialogOpen: target !== null,
    isSavingCustomerEmail,
    openCustomerEmailDialog,
    closeCustomerEmailDialog,
    setCustomerEmail,
    confirmCustomerEmail,
  };
}
