import { describe, expect, it } from "vitest";
import { toDistrict } from "@/lib/data/districts";
import { filterDistricts } from "@/lib/data/district-filter";
import { fetchLiveData } from "@/lib/api/live-data";

const row = { id: "tank", slug: "tank", name_en: "Tank", name_ur: "ٹانک", name_ps: null, lat: 32.217, lng: 70.383, region: null };
describe("district reference coverage", () => {
  it("keeps table-owned focus membership and coordinate provenance", () => {
    expect(toDistrict({ ...row, is_ardc: true, coordinates_approximate: true })).toMatchObject({ isArdc: true, coordinatesApproximate: true });
    expect(toDistrict({ ...row, is_ardc: null }).isArdc).toBe(false);
  });
  it("filters Southern and Merged districts without dropping existing references", () => {
    const districts = [toDistrict({ ...row, is_ardc: true }), toDistrict({ ...row, id: "swat", name_en: "Swat", is_ardc: false })];
    expect(filterDistricts(districts, "", true).map((d) => d.id)).toEqual(["tank"]);
    expect(filterDistricts(districts, "ٹانک", true).map((d) => d.id)).toEqual(["tank"]);
    expect(filterDistricts(districts, "", false)).toHaveLength(2);
  });
  it("includes all 22 references in only two batched provider calls", async () => {
    const references = Array.from({ length: 22 }, (_, i) => ({ ...row, id: String(i), name: String(i) }));
    const urls: URL[] = [];
    const fetcher: typeof fetch = async (input) => {
      const url = new URL(String(input)); urls.push(url);
      const body = url.hostname.startsWith("flood") ? { daily: { time: [], river_discharge: [] } } : { current: {}, hourly: {}, daily: {} };
      return Response.json(references.map(() => body));
    };
    const result = await fetchLiveData(fetcher, references);
    expect(result.districts.map((d) => d.id)).toEqual(references.map((d) => d.id));
    expect(urls).toHaveLength(2);
    expect(urls.every((url) => url.searchParams.get("latitude")?.split(",").length === 22)).toBe(true);
  });
});