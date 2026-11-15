// Service labels only. Live status is read from stored health records, never this registry.
export const INTEGRATIONS = [
  {
    service: "Open-Meteo",
    name: "Open-Meteo weather",
    purpose: "Stored rainfall, temperature, humidity and wind.",
  },
  {
    service: "GloFAS",
    name: "GloFAS modelled discharge",
    purpose: "River discharge forecasts, not gauge depths or official danger marks.",
  },
  {
    service: "Database",
    name: "Database",
    purpose:
      "District references, monitoring snapshots, risk assessments and coordinator-reviewed requests.",
  },
  {
    service: "AI chat",
    name: "AI chat",
    purpose: "Natural-language flood safety questions answered by the built-in AI assistant.",
  },
  {
    service: "Historical data",
    name: "Historical data",
    purpose:
      "Hourly collection of annual GloFAS discharge and ERA5 rainfall statistics, with saved progress and rate-limit pauses.",
  },
  {
    service: "Email alerts",
    name: "Email alerts",
    purpose:
      "Confirmation and alert emails via Resend. Resend test sender, reaches the project owner only.",
  },
  {
    service: "Web push",
    name: "Web push",
    purpose: "Browser notifications for subscribed citizens through their browser's push service.",
  },
] as const;
export const PLANNED_SERVICES = ["Retell AI", "SMS", "ML model"] as const;
