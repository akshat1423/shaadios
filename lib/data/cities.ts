import type { CityId } from "../types.ts";

/*
 * Typical-conditions index per city and month (Jan … Dec), each 0–10 where 10 is worst:
 *   rain  = chance a monsoon/winter downpour disrupts an outdoor function
 *   heat  = heat or humidity that makes an outdoor day miserable
 *   air   = smog / fog (flights, trains, outdoor events), mostly Oct–Feb in the north
 * These are curated approximations from long-term climate patterns, NOT a forecast. They exist so the optimiser can
 * rank months; the UI labels them "typical conditions". Replace with Open-Meteo archive normals for production, and
 * use the live forecast once a candidate date is within ~14 days.
 */
type Month12 = [number, number, number, number, number, number, number, number, number, number, number, number];
export interface Climate {
  rain: Month12;
  heat: Month12;
  air: Month12;
}

const NORTH_PLAINS: Climate = {
  rain: [2, 2, 1, 1, 2, 4, 8, 9, 7, 1, 0, 1],
  heat: [0, 0, 2, 6, 9, 9, 6, 5, 4, 2, 0, 0],
  air: [8, 4, 2, 2, 2, 1, 1, 1, 2, 6, 9, 9],
};
const ARID_WEST: Climate = {
  rain: [1, 1, 0, 0, 1, 3, 7, 8, 5, 1, 0, 0],
  heat: [0, 1, 3, 7, 9, 9, 6, 5, 5, 4, 1, 0],
  air: [4, 2, 1, 1, 1, 1, 1, 1, 1, 3, 5, 5],
};
const WEST_COAST: Climate = {
  rain: [0, 0, 0, 1, 3, 8, 10, 10, 8, 3, 1, 0],
  heat: [1, 2, 4, 6, 7, 5, 4, 4, 5, 6, 3, 1],
  air: [4, 3, 2, 1, 1, 0, 0, 0, 0, 2, 3, 4],
};
const PUNE: Climate = {
  rain: [0, 0, 0, 1, 2, 6, 7, 7, 6, 3, 1, 0],
  heat: [0, 2, 4, 6, 7, 4, 2, 2, 3, 5, 2, 0],
  air: [3, 2, 1, 1, 1, 0, 0, 0, 0, 2, 3, 3],
};
const SOUTH_EAST: Climate = {
  rain: [1, 0, 0, 1, 2, 3, 3, 4, 4, 8, 10, 7],
  heat: [2, 3, 5, 7, 9, 8, 7, 7, 6, 5, 2, 1],
  air: [1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 2],
};
const BENGALURU: Climate = {
  rain: [0, 0, 1, 3, 5, 4, 4, 5, 7, 8, 5, 2],
  heat: [1, 2, 3, 5, 4, 2, 1, 1, 1, 1, 0, 0],
  air: [2, 2, 1, 1, 0, 0, 0, 0, 0, 1, 2, 2],
};
const HYDERABAD: Climate = {
  rain: [0, 0, 1, 1, 3, 4, 6, 7, 7, 5, 1, 0],
  heat: [1, 3, 5, 7, 9, 6, 3, 3, 3, 3, 1, 0],
  air: [3, 2, 1, 1, 1, 0, 0, 0, 0, 1, 2, 3],
};
const KOLKATA: Climate = {
  rain: [0, 1, 2, 3, 5, 7, 9, 9, 8, 5, 1, 0],
  heat: [0, 2, 5, 7, 8, 7, 6, 6, 6, 4, 1, 0],
  air: [6, 4, 2, 1, 1, 0, 0, 0, 0, 3, 5, 6],
};

export const CITIES: Record<CityId, { name: string; climate: Climate; airport: string }> = {
  delhi: { name: "Delhi NCR", climate: NORTH_PLAINS, airport: "DEL" },
  mumbai: { name: "Mumbai", climate: WEST_COAST, airport: "BOM" },
  bengaluru: { name: "Bengaluru", climate: BENGALURU, airport: "BLR" },
  hyderabad: { name: "Hyderabad", climate: HYDERABAD, airport: "HYD" },
  chennai: { name: "Chennai", climate: SOUTH_EAST, airport: "MAA" },
  kolkata: { name: "Kolkata", climate: KOLKATA, airport: "CCU" },
  jaipur: { name: "Jaipur", climate: ARID_WEST, airport: "JAI" },
  udaipur: { name: "Udaipur", climate: ARID_WEST, airport: "UDR" },
  lucknow: { name: "Lucknow", climate: NORTH_PLAINS, airport: "LKO" },
  pune: { name: "Pune", climate: PUNE, airport: "PNQ" },
  ahmedabad: { name: "Ahmedabad", climate: ARID_WEST, airport: "AMD" },
  chandigarh: { name: "Chandigarh", climate: NORTH_PLAINS, airport: "IXC" },
};

export const CITY_IDS = Object.keys(CITIES) as CityId[];
