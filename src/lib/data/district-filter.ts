import type { District } from "./districts";

export function filterDistricts(districts: District[], search: string, focusOnly: boolean) {
  const query = search.trim().toLocaleLowerCase();
  return districts.filter(
    (d) =>
      (!focusOnly || d.isArdc) &&
      [d.name, d.nameUr, d.namePs ?? "", d.id].some((name) =>
        name.toLocaleLowerCase().includes(query),
      ),
  );
}
