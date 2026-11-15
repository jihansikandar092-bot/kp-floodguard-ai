# KP FloodGuard AI

KP FloodGuard AI provides stored environmental monitoring, experimental AI-assisted risk scoring and coordinator-reviewed emergency requests for Khyber Pakhtunkhwa.

## Implemented
- District references and monitoring snapshots are read from the database.
- The authenticated monitoring job refreshes Open-Meteo weather and GloFAS modelled river discharge every thirty minutes. Provider failures retain last-good metrics and timestamps.
- Risk estimates use documented rule-based factors and five forecast horizons. Missing factors retain null values; partial scores include a warning and cannot clear active alerts.
- Citizens can submit emergency requests; authenticated coordinators review and update them. The platform never dispatches rescue automatically.
- The assistant offers guided English/Urdu intake and natural-language chat through the existing n8n proxy. Service health reflects recorded outcomes, not assumptions.
- Service status and footer source timestamps come from stored records.

## Not connected
Retell AI, SMS and a trained ML model are planned only. No historical import job or verified historical records are currently connected. GloFAS discharge is not measured river depth or an official danger threshold.

## Safety
System-generated from modelled weather and river data. Experimental estimate, not an official warning. In immediate danger call Rescue 1122.

## Development
Use the existing React/TanStack Start application and Lovable-managed database. Install dependencies with `bun install`; run tests with `bun run test` and lint with `bun run lint`. Secrets remain server-side.
