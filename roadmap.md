# Live monitoring
- [x] Store independent successful monitoring snapshots and refresh every 30 minutes with bounded retries.
- [x] Read snapshots without visitor-triggered server provider calls; selected-district browser fallback only without snapshots.
- [x] Verify 15 tests and preview Swat/Bannu/map/mobile; authenticated refresh saved all 12 districts, both APIs returned 200, visitors made no provider calls.
- [x] Diagnose hosted 429 logs, add per-provider diagnostics, independent metrics, successful server caching and stale timestamps; verify Swat/Bannu in local preview.
- [ ] Verify published scheduled refresh and browser fallback: blocked by no published deployment (project URL tool reports published_url null; primary host returns 404 "No published build"). Publish is required before hosted verification.
- [x] Fetch and validate key-free weather and GloFAS forecasts.
- [x] Connect dashboard and map with honest live/sample labels and unavailable states.
- [x] Update integrations and verify data flow and failure behavior.