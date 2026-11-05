/** The `GET /api/auth/validate` call shared by the session restore and the live channel's expiry probe. */

import type { AxiosResponse } from 'axios';
import { apiClient } from '../http/api.client';
import type { ValidateTokenResponse } from '../../types/auth/login.types';

/** Resolves with 200 or 401 and never redirects to /500 itself. */
export function requestValidate(): Promise<AxiosResponse<ValidateTokenResponse>> {
  return apiClient.get<ValidateTokenResponse>('/api/auth/validate', {
    validateStatus: (status) => status === 200 || status === 401,
    skipErrorRedirect: true,
  });
}
