import { createServerFn } from "@tanstack/react-start";

export const getDistrictList = createServerFn({ method: "GET" }).handler(async () => {
  const { readDistricts } = await import("./public-db.server");
  return readDistricts();
});
