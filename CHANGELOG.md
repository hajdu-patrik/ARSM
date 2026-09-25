# Changelog

All notable changes to this project. The format follows [Keep a Changelog](https://keepachangelog.com/);
dates are ISO 8601. Every entry ends with a development-time / cost metrics line - see
`CLAUDE.md` -> Changelog & Development Metrics for how it's measured.

---

## [Unreleased]

### Fixed
- Scheduler: a background refresh trigger (SSE live-update, profile-picture update, or the periodic
  poll) that arrived while a previous refresh pass was still in flight was silently dropped instead
  of being retried, so an edited appointment's change could go unreflected in the UI until the next,
  unrelated trigger happened to fire. `useSchedulerDataSync`'s background-refresh task now queues one
  trailing pass instead of dropping the trigger.
- Scheduler: the query-cache write for a mutated appointment (`writeAppointmentToSchedulerCache`)
  bucketed by UTC day/month while the Zustand store and the month-query keys it feeds use local time,
  so an appointment could be dropped from, or misplaced in, the cached "today"/month bucket whenever
  its local and UTC calendar day differ. Both bucket checks now use local time, matching the rest of
  the scheduler data path.

_Dev time: ~6m wall-clock (implementation only - excludes the preceding investigation and
clarification discussion). Cost: not measured (direct session work, no token-spend API)._
