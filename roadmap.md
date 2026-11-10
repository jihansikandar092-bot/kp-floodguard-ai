# Live monitoring
- [ ] Store independent successful monitoring snapshots and refresh every 30 minutes with bounded retries.
- [ ] Read snapshots without visitor-triggered server provider calls; selected-district browser fallback only without snapshots.
- [ ] Verify tests, preview and published behavior; report any deployment blocker.
- [x] Diagnose hosted 429 logs, add per-provider diagnostics, independent metrics, successful server caching and stale timestamps; verify Swat/Bannu in local preview.
- [ ] Verify updated hosted Worker responses: invocation tool targets an unpublished build (404), and direct hosted preview access returns 401. Hosted rate-limit recovery remains unverified.
- [x] Fetch and validate key-free weather and GloFAS forecasts.
- [x] Connect dashboard and map with honest live/sample labels and unavailable states.
- [x] Update integrations and verify data flow and failure behavior.