/**
 * Integration registry. Every integration is "not_connected" until it has been
 * wired up AND tested. The UI reads this to show honest status labels.
 */
export type IntegrationStatus = "not_connected" | "connected";

export interface Integration {
  id: string;
  name: string;
  purpose: string;
  powers: string;
  status: IntegrationStatus;
}

export const INTEGRATIONS: Integration[] = [
  {
    id: "open-meteo",
    name: "Open-Meteo Weather API",
    purpose: "Rainfall, temperature, humidity and wind per district.",
    powers: "Dashboard weather cards, rainfall charts, map details",
    status: "connected",
  },
  {
    id: "glofas",
    name: "GloFAS River Flood Data",
    purpose: "River discharge and flood forecasts for KP river basins.",
    powers: "River discharge forecasts and map details (no gauge depths or danger thresholds)",
    status: "connected",
  },
  {
    id: "ml-api",
    name: "Python ML Prediction API",
    purpose: "Flood-risk scores trained on weather and historical flood data.",
    powers: "District risk categories, risk comparison chart",
    status: "not_connected",
  },
  {
    id: "openai",
    name: "OpenAI Emergency Chatbot",
    purpose: "Natural-language understanding of emergency messages.",
    powers: "AI Emergency Assistant (currently a guided intake flow)",
    status: "not_connected",
  },
  {
    id: "retell",
    name: "Retell AI Voice Agent",
    purpose: "Voice calls and spoken emergency reporting.",
    powers: "Microphone button in the assistant",
    status: "not_connected",
  },
  {
    id: "n8n",
    name: "n8n Automation Workflows",
    purpose: "Routes new requests to coordinators, SMS and alert channels.",
    powers: "Emergency request submission pipeline",
    status: "not_connected",
  },
  {
    id: "google-sheets",
    name: "Google Sheets Request Database",
    purpose: "Shared storage of rescue requests for coordinators.",
    powers: "Rescue Coordination Dashboard",
    status: "not_connected",
  },
];

export function isConnected(id: string) {
  return INTEGRATIONS.find((i) => i.id === id)?.status === "connected";
}
