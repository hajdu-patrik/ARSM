import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { appointmentService } from '../../../services/scheduler/appointment.service';
import type { SchedulerCustomerLookupDto } from '../../../types/scheduler/scheduler.types';
import type { LookupMode, LookupState } from '../components/intake/SchedulerIntakeModal.types';

interface UseSchedulerIntakeLookupParams {
  readonly onLookupReset: () => void;
  readonly onLookupFound: (lookup: SchedulerCustomerLookupDto) => void;
  readonly setErrorKey: (key: string | null) => void;
}

const LOOKUP_DEBOUNCE_MS = 280;

/** Owns scheduler intake lookup state with live customer filtering by name and license plate. */
export function useSchedulerIntakeLookup({
  onLookupReset,
  onLookupFound,
  setErrorKey,
}: UseSchedulerIntakeLookupParams) {
  const lookupRequestIdRef = useRef(0);
  const [currentLookupMode, setCurrentLookupMode] = useState<LookupMode>('name');
  const [lookupState, setLookupState] = useState<LookupState>('idle');
  const [customerLookup, setCustomerLookup] = useState<SchedulerCustomerLookupDto | null>(null);
  const [nameLookupResults, setNameLookupResults] = useState<SchedulerCustomerLookupDto[]>([]);
  const [email, setEmail] = useState('');
  const [licensePlateLookup, setLicensePlateLookup] = useState('');
  const [nameLookup, setNameLookup] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const resetLookupState = useCallback(() => {
    setLookupState('idle');
    setCustomerLookup(null);
    setNameLookupResults([]);
    setIsSearching(false);
  }, []);

  const resetLookupDependentState = useCallback(() => {
    resetLookupState();
    onLookupReset();
  }, [onLookupReset, resetLookupState]);

  const resetLookupForm = useCallback(() => {
    lookupRequestIdRef.current += 1;
    setCurrentLookupMode('name');
    resetLookupState();
    setEmail('');
    setLicensePlateLookup('');
    setNameLookup('');
  }, [resetLookupState]);

  const applyFoundLookup = useCallback((lookup: SchedulerCustomerLookupDto) => {
    setLookupState('found');
    setCustomerLookup(lookup);
    setNameLookupResults([]);
    setEmail(lookup.email);
    onLookupFound(lookup);
  }, [onLookupFound]);

  const handleEmailChange = useCallback((value: string) => {
    setEmail(value);
    setErrorKey(null);
  }, [setErrorKey]);

  const handleLicensePlateLookupChange = useCallback((value: string) => {
    setCurrentLookupMode('licensePlate');
    setLicensePlateLookup(value.toUpperCase());
    setEmail('');
    resetLookupDependentState();
    setErrorKey(null);
  }, [resetLookupDependentState, setErrorKey]);

  const handleNameLookupChange = useCallback((value: string) => {
    setCurrentLookupMode('name');
    setNameLookup(value);
    setEmail('');
    resetLookupDependentState();
    setErrorKey(null);
  }, [resetLookupDependentState, setErrorKey]);

  const handleLookup = useCallback(async () => {
    const normalizedName = nameLookup.trim();
    const normalizedPlate = licensePlateLookup.trim().toUpperCase();

    if (normalizedName.length === 0 && normalizedPlate.length === 0) {
      lookupRequestIdRef.current += 1;
      resetLookupState();
      return;
    }

    const lookupQuery = normalizedPlate.length > 0 ? normalizedPlate : normalizedName;
    const requestId = ++lookupRequestIdRef.current;

    setIsSearching(true);
    setErrorKey(null);

    try {
      const results = await appointmentService.findCustomersByName(lookupQuery, 10);
      if (lookupRequestIdRef.current !== requestId) {
        return;
      }

      const filteredResults = results.filter((result) => (
        matchesNameFilter(result, normalizedName) &&
        matchesLicensePlateFilter(result, normalizedPlate)
      ));

      setCustomerLookup(null);
      setNameLookupResults(filteredResults);
      setLookupState(filteredResults.length > 0 ? 'name-results' : 'not-found');
    } catch {
      if (lookupRequestIdRef.current !== requestId) {
        return;
      }

      resetLookupDependentState();
      setErrorKey('scheduler.intake.errors.searchFailed');
    } finally {
      if (lookupRequestIdRef.current === requestId) {
        setIsSearching(false);
      }
    }
  }, [licensePlateLookup, nameLookup, resetLookupDependentState, resetLookupState, setErrorKey]);

  useEffect(() => {
    if (nameLookup.trim().length === 0 && licensePlateLookup.trim().length === 0) {
      lookupRequestIdRef.current += 1;
      setIsSearching(false);
      return;
    }

    const timeoutId = globalThis.setTimeout(() => {
      void handleLookup();
    }, LOOKUP_DEBOUNCE_MS);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [handleLookup, licensePlateLookup, nameLookup]);

  const state = useMemo(() => ({
    lookupMode: currentLookupMode,
    lookupState,
    customerLookup,
    nameLookupResults,
    email,
    licensePlateLookup,
    nameLookup,
    isSearching,
  }), [currentLookupMode, customerLookup, email, isSearching, licensePlateLookup, lookupState, nameLookup, nameLookupResults]);

  const actions = useMemo(() => ({
    handleEmailChange,
    handleLicensePlateLookupChange,
    handleNameLookupChange,
    handleSelectNameLookupResult: applyFoundLookup,
    resetLookupForm,
  }), [
    applyFoundLookup,
    handleEmailChange,
    handleLicensePlateLookupChange,
    handleNameLookupChange,
    resetLookupForm,
  ]);

  return { state, actions };
}

function matchesNameFilter(customer: SchedulerCustomerLookupDto, normalizedName: string): boolean {
  if (normalizedName.length === 0) {
    return true;
  }

  const fullName = [customer.firstName, customer.middleName, customer.lastName]
    .filter((part): part is string => Boolean(part && part.trim().length > 0))
    .join(' ')
    .toUpperCase();

  return fullName.includes(normalizedName.toUpperCase());
}

function matchesLicensePlateFilter(customer: SchedulerCustomerLookupDto, normalizedPlate: string): boolean {
  if (normalizedPlate.length === 0) {
    return true;
  }

  return customer.vehicles.some((vehicle) => vehicle.licensePlate.toUpperCase().includes(normalizedPlate));
}