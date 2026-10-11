/** Query options of the own profile read, shared by the sidebar and the settings page. */

import { PROFILE_STALE_TIME_MS } from '../cache/cache-policy';
import { queryKeys, type AuthQueryScope } from '../cache/queryKeys';
import { profileService } from '../profile/profile.service';
import { scopedQueryOptions } from './scopedQueryOptions';

/** Profile read factories; every one takes the scope of useAuthQueryScope() first. */
export const profileQueries = {
  /** The profile of the signed-in user. */
  me: (scope: AuthQueryScope | null) =>
    scopedQueryOptions(
      scope,
      queryKeys.profile.me,
      (request) => profileService.getProfile(request),
      PROFILE_STALE_TIME_MS,
    ),
};
