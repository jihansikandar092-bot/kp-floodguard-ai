import { getDistrict } from "@/lib/data/districts";
export function getMonitoringSnapshot(districtId?: string) { return { district: districtId ? getDistrict(districtId) : undefined }; }
