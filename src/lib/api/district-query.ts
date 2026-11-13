import { queryOptions } from "@tanstack/react-query";
import { getDistrictList } from "./districts.functions";

export const districtListOptions = () =>
  queryOptions({
    queryKey: ["district-list"],
    queryFn: () => getDistrictList(),
    staleTime: 60 * 60 * 1000,
  });
