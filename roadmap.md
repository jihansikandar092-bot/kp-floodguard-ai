# Live monitoring
## Southern and Merged coverage
- [x] Preserve existing references: 22 total, 12 focus rows, ten approximate headquarters coordinates flagged for owner review.
- [x] Add district search/group filtering, 12 map outlines and stored-risk landing focus section; preview and published checks pass, including Tank emergency/assistant choices.
- [x] Verify real preview refresh: 22/22 successful, both providers 200; published Bannu/Tank/Lakki Marwat/D.I. Khan values and five affected pages verified, 89 tests and lint pass, automatic build OK.
- [ ] Successful scheduled/hosted refresh: blocked by provider daily-limit 429. Published manual invocation retained all 22 real snapshots; schedule path pauses until 00:00 UTC. History discovers all 22 references (12 focus progress rows) but collection awaits existing rate-limit spacing. Separate type-check output is unavailable; platform-managed validation only.
## Chat hardening and grounding
- [x] Enforce validated UUID/1000-character/language input and atomic approved IP limits; 400 input checks and actual preview/published 16th-call 429 verified.
- [x] Use saved webhook configuration, compact five-horizon risk/alerts context and safe translated automatic intake fallback; timeout and wrong-URL/restoration unit tests passed.
- [x] Remove webhook references, add data-time rendering and verify translated automatic intake fallback in preview/published.
- [ ] Verify a real grounded chat reply and data-time display: saved n8n webhook returns HTTP 200 with only myField, not an AI reply, even after owner updated it. Wrong-URL test covered helper configuration in isolated tests; live secret was not deliberately changed again.
## Historical collection
- [x] Extend existing yearly statistics and add resumable, exclusive hourly collection progress.
- [x] Add real selected-district annual discharge/rainfall charts with accurate source coverage labels.
- [x] Verify statistics, rate-limit/resume rules, preview and published charts. Swat/Bannu: 16 complete years each, 2010–2025; published collection returned 202, then stored Charsadda HTTP 429 pause. Remaining districts await hourly provider availability; no invented data.
## Real-data cleanup and integration health
- [x] Audit code and database; before/after findings delivered, three owner-retained verification requests unchanged.
- [x] Remove obsolete demo UI, unused illustrative chart and unsupported landing/footer claims; hide unimplemented voice control.
- [x] Read integration statuses from service_health; monitoring writes genuine metric timestamps and safe errors, authenticated checks record database/history availability, real chat records success. No historical import job exists: availability is checked and shown honestly as Not connected.
- [x] Show actual source timestamps in footer; seven preview/published pages HTTP 200, real n8n chat HTTP 200 in both (280/261-character replies), no browser errors or mobile overflow; 69 tests, lint and automatic type-check/build passed. Published error-log search returned no entries.
## Partial-score safety
- [x] Store factor coverage and translated partial notes without changing score calculation; 168 stored assessments checked, zero coverage mismatches.
- [x] Prevent partial batches from resolving alerts; partial creation/resolution tests pass in isolated PostgreSQL, 66 total tests passed.
- [x] Verify real stored scores in preview and on the published dashboard/map, including English/Urdu/Pashto RTL notes for Swat and Bannu, 7-day map details, no browser errors or narrow-screen overflow; lint and automatic type-check/build passed. Alerts remain genuinely empty; no test alerts added to the app database.
## Predictive Risk Outlook
- [x] Audit current forecasts, alerts and pages.
- [x] Store and compute five horizons with translated reasons and snapshot freshness; 60 rows for 12 districts. Existing retained weather lacks full 168-hour coverage, shown as unavailable; future scheduled requests cover eight calendar days.
- [x] Predictive alert escalation, quiet de-escalation, two-run resolution and stale protection; isolated PostgreSQL tests pass.
- [x] Outlook strip/chart, map selector and grouped /alerts page; desktop/mobile preview verified.
- [x] Published and tested Swat/Bannu dashboard, map (12 markers, 48 h selected), /alerts and mobile width: HTTP 200, no browser errors. Real stored factors checked; 62 tests, lint and automatic type-check/build pass. Published error-log search returned no Worker entries.
## System-generated alerts
- [x] Audit existing risk assessments and alert panel; no sample list remains.
- [x] Add public-read/server-write alerts and atomic assessment transition trigger.
- [x] Show active and seven-day resolved alerts with official sources and safety disclaimer.
- [x] Verify seven database transition/access tests, 52 total tests, lint and automatic build; desktop/mobile dashboard reads the real empty alerts table without browser errors. No live risk rise has occurred since installation; no fabricated alerts were added.

- [x] Add district reference storage, monitoring run history and service health; verified 12 districts, 12 snapshots and 1 successful run.
- [x] Stop retries on 429, support optional paid weather configuration, and verify retention and six-hour fallback rules in 19 passing tests.
- [x] Remove invented observations, six alerts, generated historical series and seven seeded requests; connect landing numbers to stored readings.
- [x] Resolve authored-code lint findings; verify automatic build OK and seven preview pages with no browser errors.
- [ ] Separate type-check evidence: running server does not expose a type-check service; manual project typechecks are platform-managed.
- [ ] Complete unknown district Pashto translations, region and ARDC classification: await verified reference information, currently null.
- [x] Store independent successful monitoring snapshots and refresh every 30 minutes with bounded retries.
- [x] Read snapshots without visitor-triggered server provider calls; selected-district fallback only for missing or older-than-six-hour snapshots.
- [x] Verify 15 tests and preview Swat/Bannu/map/mobile; authenticated refresh saved all 12 districts, both APIs returned 200, visitors made no provider calls.
- [x] Diagnose hosted 429 logs, add per-provider diagnostics, independent metrics, successful server caching and stale timestamps; verify Swat/Bannu in local preview.
- [x] Verify published scheduled refresh and browser fallback: publishing was declined; primary host returns 404. Hosted verification requires publication.
- [x] Fetch and validate key-free weather and GloFAS forecasts.
- [x] Connect dashboard and map with real stored values, timestamps and unavailable states instead of sample observations.
- [x] Update integrations and verify data flow and failure behavior.
- [x] Coordinator role for jihansikandar092@gmail.com — account created by user, role granted 2026-11-14
- [x] Signed-in preview test passed: 3 requests visible, phones masked with Reveal, status change saved (restored to pending); blank render was slow first load
- [ ] Publish and test coordinator login on the published site (redirect, login, no-role Access denied with throwaway account, delete it)
- [x] On HTTP 429 daily-limit: scheduled runs pause until 00:00 UTC, record 'paused until 00:00 UTC' in monitoring_runs, auto-resume at midnight; verified with live trigger and 37 passing tests
