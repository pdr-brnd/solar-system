/** Mean orbital longitudes (deg) at J2000 and mean motion (deg/day). */
export interface KeplerBody {
  name: string;
  L0: number;
  n: number;
  inclinationDeg: number;
}

export const KEPLER_PLANETS: KeplerBody[] = [
  { name: "Mercúrio", L0: 252.250_906, n: 4.092_334_436, inclinationDeg: 7.0 },
  { name: "Vênus", L0: 181.979_801, n: 1.602_130_357, inclinationDeg: 3.39 },
  { name: "Terra", L0: 100.466_457, n: 0.985_647_358, inclinationDeg: 0 },
  { name: "Marte", L0: 355.433_275, n: 0.524_032_928, inclinationDeg: 1.85 },
  { name: "Júpiter", L0: 34.351_484, n: 0.083_085_262, inclinationDeg: 1.3 },
  { name: "Saturno", L0: 50.077_471, n: 0.033_444_228, inclinationDeg: 2.49 },
  { name: "Urano", L0: 314.055_005, n: 0.011_728_579, inclinationDeg: 0.77 },
  { name: "Netuno", L0: 304.348_665, n: 0.005_981_061, inclinationDeg: 1.77 },
  { name: "Ceres", L0: 95.989, n: 0.214, inclinationDeg: 10.6 },
  { name: "Plutão", L0: 238.929, n: 0.003_964, inclinationDeg: 17.16 },
  { name: "Haumea", L0: 215.5, n: 0.003_47, inclinationDeg: 28.2 },
  { name: "Makemake", L0: 79.3, n: 0.003_19, inclinationDeg: 29.0 },
  { name: "Éris", L0: 35.95, n: 0.001_77, inclinationDeg: 44.0 },
];

const J2000 = Date.UTC(2000, 0, 1, 12);

export function julianDaysFromJ2000(date: Date): number {
  return (date.getTime() - J2000) / 86_400_000;
}

export function meanLongitudeRad(body: KeplerBody, date: Date): number {
  const d = julianDaysFromJ2000(date);
  const deg = ((body.L0 + body.n * d) % 360 + 360) % 360;
  return (deg * Math.PI) / 180;
}

export function keplerByName(name: string): KeplerBody | undefined {
  return KEPLER_PLANETS.find((b) => b.name === name);
}

/** Approximate Earth vernal equinox: ~March 20. */
export function isNearEquinox(date: Date, windowDays = 3): "março" | "setembro" | null {
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const mar = month === 2 && Math.abs(day - 20) <= windowDays;
  const sep = month === 8 && Math.abs(day - 22) <= windowDays;
  if (mar) return "março";
  if (sep) return "setembro";
  return null;
}

export async function tryFetchHorizonsSample(date: Date): Promise<boolean> {
  const day = date.toISOString().slice(0, 10);
  const next = new Date(date.getTime() + 86_400_000).toISOString().slice(0, 10);
  const url =
    "https://ssd.jpl.nasa.gov/api/horizons.api?format=json" +
    "&COMMAND='399'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'" +
    "&CENTER='500@10'&VEC_TABLE='1'&OUT_UNITS='AU'" +
    `&START_TIME='${day}'&STOP_TIME='${next}'&STEP_SIZE='1 d'`;
  try {
    const res = await fetch(url, { mode: "cors" });
    return res.ok;
  } catch {
    return false;
  }
}
