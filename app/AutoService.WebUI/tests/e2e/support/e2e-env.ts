/**
 * Environment contract for the appointment flow end-to-end test.
 */
export interface AppointmentFlowEnv {
  mechanicEmail: string;
  mechanicPassword: string;
  wrongPassword: string;
  existingCustomerEmail: string;
}

/**
 * Environment contract for admin-level end-to-end tests.
 */
export interface AdminFlowEnv {
  adminEmail: string;
  adminPassword: string;
}

/**
 * Reads the first populated environment variable from an ordered fallback list.
 *
 * @param names - Candidate variable names in descending priority.
 * @returns The first non-empty variable value.
 * @throws Error when none of the provided variables are defined.
 */
function readFirstDefined(names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  throw new Error(`Missing required environment variable. Provide one of: ${names.join(', ')}`);
}

/**
 * Reads the first populated env variable, returning undefined when none are set.
 *
 * @param names - Candidate variable names in descending priority.
 */
function readOptional(names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

/**
 * Resolves environment values used by the appointment flow E2E scenario.
 *
 * Supports project-wide ARSM_TEST_* variables and optional ARSM_E2E_* aliases.
 */
export function getAppointmentFlowEnv(): AppointmentFlowEnv {
  return {
    mechanicEmail: readFirstDefined(['ARSM_E2E_MECHANIC_EMAIL', 'ARSM_TEST_MECHANIC_EMAIL']),
    mechanicPassword: readFirstDefined(['ARSM_E2E_MECHANIC_PASSWORD', 'ARSM_TEST_MECHANIC_PASSWORD']),
    wrongPassword: readFirstDefined(['ARSM_E2E_WRONG_PASSWORD', 'ARSM_TEST_WRONG_PASSWORD']),
    existingCustomerEmail: readFirstDefined(['ARSM_E2E_CUSTOMER_EMAIL', 'ARSM_TEST_CUSTOMER_EMAIL']),
  };
}

/**
 * Resolves environment values used by admin-level E2E scenarios.
 * Returns undefined when admin credentials are not configured.
 */
export function getAdminFlowEnv(): AdminFlowEnv | undefined {
  const adminEmail = readOptional(['ARSM_E2E_ADMIN_EMAIL', 'ARSM_TEST_ADMIN_EMAIL']);
  const adminPassword = readOptional(['ARSM_E2E_ADMIN_PASSWORD', 'ARSM_TEST_ADMIN_PASSWORD']);

  if (!adminEmail || !adminPassword) {
    return undefined;
  }

  return { adminEmail, adminPassword };
}

/**
 * Resolves the optional mechanic phone credential for phone-login tests.
 */
export function getMechanicPhone(): string | undefined {
  return readOptional(['ARSM_E2E_MECHANIC_PHONE', 'ARSM_TEST_MECHANIC_PHONE']);
}
