import { useSuspenseQuery } from "@tanstack/react-query";
import { historicalOptions } from "@/lib/history/history-query";
import { Panel } from "./Panel";
import { RainfallChart, RiverChart } from "./Charts";

export function HistoricalStatistics({
  districtId,
  districtName,
}: {
  districtId?: string;
  districtName?: string;
}) {
  const { data } = useSuspenseQuery(historicalOptions());
  const rows = data.stats.filter((r) => r.district_id === districtId);
  const progress = data.progress.find((r) => r.district_id === districtId);
  const updated = rows
    .map((r) => r.fetched_at)
    .filter((t): t is string => Boolean(t))
    .sort()
    .at(-1);
  return (
    <section className="space-y-4" aria-label="Annual historical statistics">
      <h2 className="text-lg font-semibold">
        Historical modelled data{districtName ? ` · ${districtName}` : ""}
      </h2>
      <p className="text-xs text-muted-foreground">
        Sources: Open-Meteo GloFAS and ERA5. Modelled datasets, not official flood records. GloFAS
        reanalysis: 2010–2021; 2022 combines reanalysis and archived forecasts; 2023 onward is
        archived forecast data. No year is classified as a flood year.
      </p>
      {updated && (
        <p className="text-xs text-muted-foreground">
          Last updated: {updated.replace("T", " ").slice(0, 19)} UTC
        </p>
      )}
      {!districtId ? (
        <p>Select a district</p>
      ) : (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            {data.error ??
              (progress?.status === "complete"
                ? `${rows.length} years collected`
                : "Historical data is still being collected")}{" "}
            · {progress?.status ?? "pending"}
            {progress
              ? ` · ${progress.phase} · updated ${progress.updated_at.replace("T", " ").slice(0, 19)} UTC`
              : ""}
            {progress?.last_error ? ` · ${progress.last_error}` : ""}
          </p>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel
              title="Annual peak river discharge (GloFAS reanalysis)"
              subtitle="m³/s · archived forecasts from July 2022"
              bodyClassName="h-72"
            >
              {rows.some((r) => r.max_discharge_m3s !== null) ? (
                <RiverChart
                  data={rows.map((r) => ({ day: String(r.year), discharge: r.max_discharge_m3s }))}
                />
              ) : (
                <p>Historical data is still being collected</p>
              )}
            </Panel>
            <Panel
              title="Annual maximum 3-day rainfall (ERA5)"
              subtitle="mm · rolling 3-day totals ending within each year"
              bodyClassName="h-72"
            >
              {rows.some((r) => r.max_rain_3d_mm !== null) ? (
                <RainfallChart
                  data={rows.map((r) => ({ day: String(r.year), rainfall: r.max_rain_3d_mm }))}
                />
              ) : (
                <p>Historical data is still being collected</p>
              )}
            </Panel>
          </div>
          {rows.length > 0 && (
            <details className="text-xs">
              <summary className="cursor-pointer text-water">Annual values and sources</summary>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr>
                      <th>Year</th>
                      <th>Peak m³/s</th>
                      <th>Max 1-day mm</th>
                      <th>Max 3-day mm</th>
                      <th>Total mm</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.year}>
                        <td>{r.year}</td>
                        <td>{r.max_discharge_m3s ?? "Not available"}</td>
                        <td>{r.max_rain_1d_mm ?? "Not available"}</td>
                        <td>{r.max_rain_3d_mm ?? "Not available"}</td>
                        <td>{r.total_rain_mm ?? "Not available"}</td>
                        <td>{r.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </>
      )}
    </section>
  );
}
