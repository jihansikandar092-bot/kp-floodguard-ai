import {describe,it,expect} from "vitest";
import {annualStatistics,collectionFailure,historicalSource} from "@/lib/history/statistics";

function days(year:number) {
 const dates=[];
 for(let d=Date.UTC(year-1,11,30);d<Date.UTC(year+1,0,1);d+=86400000) dates.push(new Date(d).toISOString().slice(0,10));
 return dates;
}
describe("historical yearly statistics",()=>{
 it("stores only complete years from 2010 through last year",()=>{const dates=days(2010); const result=annualStatistics(dates,dates.map(()=>2),"discharge",2011); expect(result).toHaveLength(1); expect(result[0]).toMatchObject({year:2010,max_discharge_m3s:2});});
 it("computes rolling three-day maximum across the year boundary",()=>{const dates=days(2010);const values=dates.map(()=>1);values[0]=10;values[1]=20;expect(annualStatistics(dates,values,"rainfall",2010)[0]).toMatchObject({max_rain_1d_mm:1,max_rain_3d_mm:31,total_rain_mm:365});});
 it("never treats missing precipitation as zero",()=>{const dates=days(2010);const values:(number|null)[]=dates.map(()=>1);values[50]=null;expect(annualStatistics(dates,values,"rainfall",2010)).toEqual([]);});
 it("counts leap-year days",()=>{const dates=days(2012);expect(annualStatistics(dates,dates.map(()=>1),"rainfall",2012).find(r=>r.year===2012)?.total_rain_mm).toBe(366);});
 it("pauses on any historical HTTP 429 for the next hourly run",()=>{expect(collectionFailure(429).status).toBe("paused");expect(collectionFailure(503).status).toBe("error");});
 it("does not call archived forecast years reanalysis",()=>{expect(historicalSource(2025)).toBe("GloFAS archived forecast; Open-Meteo ERA5 reanalysis");});
});