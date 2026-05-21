type EnvMap = Record<string, string | undefined>;

export interface AppointmentFlowEnv {
  readonly mechanicEmail: string;
  readonly mechanicPassword: string;
  readonly customerEmail?: string;
  readonly wrongPassword?: string;
}

export interface AdminFlowEnv {
  readonly adminEmail: string;
  readonly adminPassword: string;
}

const DEFAULT_MOCK_CREDENTIAL = 'mock-credential-token';
const DEFAULT_INVALID_MOCK_CREDENTIAL = `${DEFAULT_MOCK_CREDENTIAL}-invalid`;

const FALLBACK_APPOINTMENT_ENV: AppointmentFlowEnv = {
  mechanicEmail: 'gabor.kovacs@example.com',
  mechanicPassword: DEFAULT_MOCK_CREDENTIAL,
  customerEmail: 'anna.toth@example.com',
  wrongPassword: DEFAULT_INVALID_MOCK_CREDENTIAL,
};

const FALLBACK_ADMIN_ENV: AdminFlowEnv = {
  adminEmail: 'admin.mechanic@example.test',
  adminPassword: DEFAULT_MOCK_CREDENTIAL,
};

function getProcessEnv(): EnvMap {
  const runtime = globalThis as typeof globalThis & { process?: { env?: EnvMap } };
  return runtime.process?.env ?? {};
}

function readOptionalEnv(name: string, env: EnvMap): string | undefined {
  const value = env[name];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function readRequiredEnvWithFallback(name: string, env: EnvMap, fallback: string): string {
  const value = env[name];
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

/**
 * Loads appointment flow credentials from environment variables.
 * Expects variables to be set in .secrets file loaded by the test runner.
 * @throws Error if required variables are missing
 */
export function getAppointmentFlowEnv(): AppointmentFlowEnv {
  const env = getProcessEnv();

  return {
    mechanicEmail: readRequiredEnvWithFallback('ARSM_TEST_MECHANIC_EMAIL', env, FALLBACK_APPOINTMENT_ENV.mechanicEmail),
    mechanicPassword: readRequiredEnvWithFallback('ARSM_TEST_MECHANIC_PASSWORD', env, FALLBACK_APPOINTMENT_ENV.mechanicPassword),
    customerEmail: readOptionalEnv('ARSM_TEST_CUSTOMER_EMAIL', env) ?? FALLBACK_APPOINTMENT_ENV.customerEmail,
    wrongPassword: readOptionalEnv('ARSM_TEST_WRONG_PASSWORD', env) ?? FALLBACK_APPOINTMENT_ENV.wrongPassword,
  };
}

/**
 * Loads admin flow credentials from environment variables.
 * Expects variables to be set in .secrets file loaded by the test runner.
 * @throws Error if required variables are missing
 */
export function getAdminFlowEnv(): AdminFlowEnv {
  const env = getProcessEnv();

  return {
    adminEmail: readRequiredEnvWithFallback('ARSM_TEST_ADMIN_EMAIL', env, FALLBACK_ADMIN_ENV.adminEmail),
    adminPassword: readRequiredEnvWithFallback('ARSM_TEST_ADMIN_PASSWORD', env, FALLBACK_ADMIN_ENV.adminPassword),
  };
}