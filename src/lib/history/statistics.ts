import { z } from "zod";

export const HISTORY_START_YEAR = 2010;
export const historyPayload = z.object({
  daily: z.object({
    time: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
    river_discharge: z.array(z.number().finite().nonnegative().nullable()).optional(),
    precipitation_sum: z.array(z.number().finite().nonnegative().nullable()).optional(),
  }),
});

export function annualStatistics(
  dates: string[],
  values: (number | null)[],
  kind: "discharge" | "rainfall",
  lastYear: number,
) {
  if (dates.length !== values.length) throw new Error("Historical response length mismatch");
  const byDate = new Map(dates.map((d, i) => [d, values[i]]));
  const result = [];
  for (let year = HISTORY_START_YEAR; year <= lastYear; year++) {
    const start = Date.UTC(year, 0, 1);
    const end = Date.UTC(year + 1, 0, 1);
    const daily: number[] = [];
    const rolling: number[] = [];
    let complete = true;
    for (let day = start; day < end; day += 86400000) {
      const date = new Date(day).toISOString().slice(0, 10);
      const value = byDate.get(date);
      if (value == null) {
        complete = false;
        break;
      }
      daily.push(value);
      if (kind === "rainfall") {
        const previous = [1, 2].map((offset) =>
          byDate.get(new Date(day - offset * 86400000).toISOString().slice(0, 10)),
        );
        if (previous.some((v) => v == null)) {
          complete = false;
          break;
        }
        rolling.push(value + (previous[0] ?? 0) + (previous[1] ?? 0));
      }
    }
    if (!complete) continue;
    const round = (v: number) => Math.round(v * 100) / 100;
    result.push({
      year,
      ...(kind === "discharge"
        ? {
            max_discharge_m3s: round(Math.max(...daily)),
            annual_max_discharge: round(Math.max(...daily)),
          }
        : {
            max_rain_1d_mm: round(Math.max(...daily)),
            max_rain_3d_mm: round(Math.max(...rolling)),
            total_rain_mm: round(daily.reduce((a, b) => a + b, 0)),
          }),
    });
  }
  return result;
}

export function historicalSource(year: number) {
  return `${year <= 2021 ? "GloFAS reanalysis" : year === 2022 ? "GloFAS reanalysis / archived forecast (transition July 2022)" : "GloFAS archived forecast"}; Open-Meteo ERA5 reanalysis`;
}

export function collectionFailure(status: number) {
  return status === 429
    ? {
        status: "paused" as const,
        last_error: "HTTP 429: collection paused until the next hourly run",
      }
    : { status: "error" as const, last_error: `Historical provider HTTP ${status}` };
}
