/** Credentials the E2E login and appointment flows sign in with. */
export interface AppointmentFlowEnv {
  readonly mechanicEmail: string;
  readonly mechanicPassword: string;
  readonly customerEmail: string;
  readonly wrongPassword: string;
}

const DEFAULT_MOCK_CREDENTIAL = 'mock-credential-token';

/** Mock-only values taken when the matching ARSM_TEST_* variable is unset or blank. */
const FALLBACK_APPOINTMENT_ENV: AppointmentFlowEnv = {
  mechanicEmail: 'gabor.kovacs@example.com',
  mechanicPassword: DEFAULT_MOCK_CREDENTIAL,
  customerEmail: 'anna.toth@example.com',
  wrongPassword: `${DEFAULT_MOCK_CREDENTIAL}-invalid`,
};

function readEnvWithFallback(name: string, fallback: string): string {
  const value = process.env[name];
  return value !== undefined && value.trim().length > 0 ? value : fallback;
}

/** Loads appointment flow credentials from environment variables (set in .secrets, loaded by the test runner). */
export function getAppointmentFlowEnv(): AppointmentFlowEnv {
  return {
    mechanicEmail: readEnvWithFallback('ARSM_TEST_MECHANIC_EMAIL', FALLBACK_APPOINTMENT_ENV.mechanicEmail),
    mechanicPassword: readEnvWithFallback('ARSM_TEST_MECHANIC_PASSWORD', FALLBACK_APPOINTMENT_ENV.mechanicPassword),
    customerEmail: readEnvWithFallback('ARSM_TEST_CUSTOMER_EMAIL', FALLBACK_APPOINTMENT_ENV.customerEmail),
    wrongPassword: readEnvWithFallback('ARSM_TEST_WRONG_PASSWORD', FALLBACK_APPOINTMENT_ENV.wrongPassword),
  };
}
