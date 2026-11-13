<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Monitoring architecture
- Read public monitoring_snapshots through createServerFn and shared 15-minute Query options; only authenticated 30-minute scheduled refreshes fetch all fixed district coordinates, avoiding visitor-driven Worker provider requests.
- Keep GloFAS model discharge in m³/s separate from risk estimates and historical records; never infer gauge depth or danger thresholds from flow, because discharge is not gauge depth.
- Missing provider metrics remain null; aggregates use available districts only with explicit coverage, never treating unavailable values as zero.
- Scheduled refreshes retry transient failures at most three times with 2s/4s backoff and 6s timeouts, stop on 429 until the next run, and retain independent last-success metrics/timestamps; record runs and service health for auditable failures. Use Request.waitUntil for bounded background completion on Nitro Workers.
- Direct browser CORS fallback is limited to the selected district with missing metrics or newest source older than six hours, never persists visitor data, and shares a 15-minute client cache; disable focus/reconnect retries and expose stored age separately.
- District reference rows own public reference counts; keep unknown translations and classification fields null rather than inventing them.
- Read optional paid weather configuration only during scheduled refresh; strip credentials from diagnostics and retry logs.
- Shared assistant events and request formatting/filtering live in client-safe utilities, so component exports remain Fast Refresh compatible; standard shadcn utility exports are allowlisted and integration-managed generated files are excluded from lint.
- Use Router dehydrate/hydrate hooks with the existing root Query provider to reuse the same blocking monitoring snapshot on server and client; map tiles use the key-free OpenStreetMap endpoint.

## Server and access security
- Use TanStack Start file-based routing and never edit generated routeTree.gen.ts; this preserves generated route consistency.
- Express visual styling through semantic Tailwind design tokens; this preserves theme consistency.
- Server code runs on Cloudflare Workers (workerd, not Node.js): no fs or native modules, read process.env only inside handlers, and do not compress responses; these constraints preserve Worker runtime compatibility.
- Secrets live only in server environment variables, never in code, docs or browser; this prevents credential disclosure.
- Enable Row Level Security on every application table; this enforces access control at the database boundary.
- Keep monitoring run logs service-role-only; public snapshot reads must match an existing district and the stored metric identity and contain weather or flood data, preserving citizen access without unrestricted row policies.
- Store roles in a separate user_roles table and check them server-side with a security-definer has_role() function, never in client storage; this prevents privilege escalation and recursive role-policy checks.
- District references (names, coordinates) load from the `districts` table via a shared district-list query; code only supplies tehsil/river labels by id, so the table stays the single source of monitored districts.
- Freshness labels: under 1 h Live, 1–3 h Delayed (X h), over 3 h Outdated; only Outdated uses the emergency colour, so normal readings never look like warnings.
- Snapshot merges retain last good values per metric and record them in retainedMetrics; monitoring_runs.trigger_source distinguishes schedule from manual runs (manual calls send trigger: "manual").
- Emergency requests are inserted only through a validated server function (per-IP hashed hourly limit, codes from a DB trigger); coordinator/admin roles gate reads and updates via has_role(), so citizen data never reaches the browser unauthenticated.
