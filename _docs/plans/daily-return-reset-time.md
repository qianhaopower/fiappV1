# Daily Return Reset Time Plan

## Goal

Daily returns should use a user-facing "habit day," not UTC. The default should be 4:00 AM in the user's local timezone, with a setting that lets users change when their day resets.

## Product Recommendation

Do not keep UTC as the default reset behavior. A daily habit app should follow the user's lived day. A Melbourne user whose "new day" starts at 10:00 AM or 11:00 AM will experience the app as incorrect.

Recommended first version:

- Default to 4:00 AM local time.
- Add a simple reset-time setting with fixed options.
- Avoid fully custom time until users ask for it.

The product principle is that most users should never have to think about reset time, but users with night shifts, late routines, travel, or sleep issues should not be punished by the app's clock.

## Implementation Plan

### 1. Add Profile Settings

Add fields to the user profile:

- `timezone`: IANA timezone string, for example `Australia/Melbourne` or `America/New_York`.
- `dayResetTime`: minutes after local midnight, for example `240` for 4:00 AM.

Defaults:

- `timezone`: browser-detected timezone on first client load, fallback to `UTC` if unavailable.
- `dayResetTime`: `240`.

Existing profiles without these fields should receive defaults on read.

### 2. Create A Canonical Return-Day Helper

Replace the current UTC-only `todayUTC()` behavior with a helper such as:

```ts
returnDayForUser({
  now,
  timezone,
  resetMinutes,
})
```

Logic:

- Determine the user's local date and time.
- If local time is before `resetMinutes`, return yesterday's `YYYY-MM-DD`.
- Otherwise return today's `YYYY-MM-DD`.

Place this in `lib/returns/returns.ts` or a new focused module such as `lib/dates/returnDay.ts`.

Add unit tests for:

- Melbourne timezone.
- UTC timezone.
- US timezones.
- Before reset time.
- After reset time.
- DST edge cases.

### 3. Update `POST /api/return`

When `date` is omitted:

- Load the user's profile.
- Use `timezone` and `dayResetTime` to calculate the return date.
- Store the return using the existing key shape: `DATE#YYYY-MM-DD`.

Keep explicit `date` support for tests, admin workflows, or future backfill needs. Normal UI logging should omit `date`.

### 4. Update `GET /api/returns`

Generate the last N habit days using the user's configured timezone and reset time.

The response should include the server's current return date, for example:

```json
{
  "currentReturnDate": "2026-05-08",
  "returns": []
}
```

This prevents the Today page from independently calculating "today" and disagreeing with the server.

### 5. Update The Today Page

Stop importing `todayUTC()` client-side for deciding today's dot.

Instead:

- Use `currentReturnDate` from `GET /api/returns`.
- Find the current dot by matching `date === currentReturnDate`.
- Continue omitting `date` when calling `POST /api/return`.

This keeps the UI and API aligned.

### 6. Add Settings UI

Add an Account or Settings section for:

- Timezone display/select.
- "Day resets at" select or segmented control.

Initial reset-time options:

- Midnight
- 3:00 AM
- 4:00 AM recommended
- 6:00 AM

Avoid fully custom time in the first version unless there is a clear user need.

### 7. Migration And Backward Compatibility

No table migration is required.

Existing return records remain valid. Their dates were previously UTC-derived, but future records will use the configured habit-day date.

Profiles without `timezone` or `dayResetTime` should behave as:

- `timezone = UTC`
- `dayResetTime = 240`

Then, on the client, the app can update `timezone` to the browser-detected value when appropriate.

### 8. Docs And Tests

Update docs:

- API contract: define "today" as the user's configured return day.
- DB schema: document the new profile fields.
- Product/canon docs: explain reset-time behavior and defaults.

Add tests for:

- Default settings.
- Changing reset time.
- Logging before reset.
- Logging after reset.
- Date range generation in `GET /api/returns`.
- Today page using server-provided `currentReturnDate`.

## Open Decisions

- Should timezone be set automatically on first authenticated client load, or explicitly confirmed in Settings?
- Should changing reset time affect only future logs, or can it reinterpret today's current log during the same calendar day?
- Should travelers keep their home timezone or follow their device timezone?
- Do we need account-level timezone immediately, or can v1 derive it from the browser and only persist reset time?

## Suggested First Version

Ship timezone-aware daily returns with:

- Browser-detected timezone persisted to profile.
- 4:00 AM local reset by default.
- Fixed reset-time options in Account settings.
- Server-provided `currentReturnDate` in `GET /api/returns`.

This fixes the core daily-return bug while keeping the settings experience simple.
