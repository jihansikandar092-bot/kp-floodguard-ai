import {
  annualStatistics,
  collectionFailure,
  historicalSource,
  historyPayload,
} from "./statistics";
import { recordServiceHealth } from "@/lib/api/service-health.server";

/** One district and one source per invocation. No visitor can call this privileged helper. */
export async function collectHistoricalBatch() {
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  const lastYear = new Date().getUTCFullYear() - 1;
  const { data: claims, error: claimError } = await admin.rpc("claim_historical_district", {
    _last_year: lastYear,
  });
  if (claimError) throw new Error("Historical job claim failed");
  const claim = claims?.[0];
  if (!claim) return { skipped: true };
  const { data: district, error: districtError } = await admin
    .from("districts")
    .select("lat,lng")
    .eq("id", claim.district_id)
    .single();
  const update = async (fields: {
    status: string;
    phase?: string;
    last_error: string | null;
    next_request_at?: string;
  }) => {
    const { error } = await admin
      .from("historical_job_progress")
      .update({
        ...fields,
        lease_until: null,
        updated_at: new Date().toISOString(),
        next_request_at: fields.next_request_at ?? new Date(Date.now() + 3000).toISOString(),
      })
      .eq("district_id", claim.district_id);
    if (error) throw new Error("Historical progress write failed");
  };
  try {
    if (districtError || !district) throw new Error("District reference unavailable");
    const rain = claim.phase === "rainfall";
    const url = new URL(
      rain
        ? "https://archive-api.open-meteo.com/v1/archive"
        : "https://flood-api.open-meteo.com/v1/flood",
    );
    url.search = new URLSearchParams({
      latitude: String(district.lat),
      longitude: String(district.lng),
      start_date: rain ? "2009-12-30" : "2010-01-01",
      end_date: `${lastYear}-12-31`,
      daily: rain ? "precipitation_sum" : "river_discharge",
      timezone: "UTC",
      ...(rain ? { models: "era5" } : {}),
    }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(18000) });
    console.info(
      "Historical provider",
      claim.district_id,
      claim.phase,
      response.status,
      url.toString(),
    );
    if (!response.ok) {
      await update({
        ...collectionFailure(response.status),
        ...(response.status === 429
          ? { next_request_at: new Date(Date.now() + 3600000).toISOString() }
          : {}),
      });
      await recordServiceHealth(
        "Historical data",
        false,
        `Historical provider HTTP ${response.status}`,
      );
      return { district: claim.district_id, httpStatus: response.status, saved: 0 };
    }
    const payload = historyPayload.parse(await response.json());
    const values = rain ? payload.daily.precipitation_sum : payload.daily.river_discharge;
    if (!values) throw new Error("Historical metric unavailable");
    const stats = annualStatistics(
      payload.daily.time,
      values,
      rain ? "rainfall" : "discharge",
      lastYear,
    );
    const at = new Date().toISOString();
    if (rain) {
      for (const row of stats) {
        const { error } = await admin
          .from("historical_stats")
          .update({ ...row, source: historicalSource(row.year), fetched_at: at })
          .eq("district_id", claim.district_id)
          .eq("year", row.year);
        if (error) throw new Error("Historical rainfall write failed");
      }
    } else {
      const rows = stats.flatMap((row) =>
        row.annual_max_discharge === undefined
          ? []
          : [
              {
                ...row,
                annual_max_discharge: row.annual_max_discharge,
                district_id: claim.district_id,
                source: historicalSource(row.year).split(";")[0] ?? "GloFAS",
                fetched_at: at,
              },
            ],
      );
      if (rows.length) {
        const { error } = await admin
          .from("historical_stats")
          .upsert(rows, { onConflict: "district_id,year" });
        if (error) throw new Error("Historical discharge write failed");
      }
    }
    const { count, error } = await admin
      .from("historical_stats")
      .select("id", { count: "exact", head: true })
      .eq("district_id", claim.district_id)
      .gte("year", 2010)
      .lte("year", lastYear)
      .not("max_discharge_m3s", "is", null)
      .not("max_rain_3d_mm", "is", null)
      .not("total_rain_mm", "is", null)
      .not("max_rain_1d_mm", "is", null);
    if (error) throw new Error("Historical completion check failed");
    const complete = count === lastYear - 2009;
    await update({
      status: complete ? "complete" : stats.length === lastYear - 2009 ? "pending" : "error",
      phase: rain ? "discharge" : "rainfall",
      last_error:
        stats.length === lastYear - 2009
          ? null
          : "Some years have missing daily values; incomplete years were not estimated",
    });
    if (complete) await recordServiceHealth("Historical data", true);
    return {
      district: claim.district_id,
      phase: claim.phase,
      saved: stats.length,
      complete,
      httpStatus: response.status,
    };
  } catch {
    await update({
      status: "error",
      last_error: "Historical collection failed or timed out; will retry next hourly run",
    });
    console.error("Historical collection failed", claim.district_id, claim.phase);
    return {
      district: claim.district_id,
      saved: 0,
      error: "Historical collection failed or timed out",
    };
  }
}
