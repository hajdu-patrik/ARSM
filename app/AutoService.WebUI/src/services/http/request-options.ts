/** Per-call options of a read endpoint that can also run as a silent background refetch. */
export interface SilentRequestOptions {
  /** When `true`, a server error does not redirect to the /500 page; the error still propagates. */
  readonly skipErrorRedirect?: boolean | undefined;
}
