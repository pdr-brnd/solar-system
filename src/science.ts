import type { CelestialBody } from "./planets";

export const AU_SCENE = 15;

export interface ScienceProfile {
  au: number;
  eccentricity: number;
  tiltDeg: number;
  albedo: number;
  atmosphere?: string;
}

export const SCIENCE: Record<string, ScienceProfile> = {
  Mercúrio: { au: 0.387, eccentricity: 0.2056, tiltDeg: 0.03, albedo: 0.12 },
  Vênus: { au: 0.723, eccentricity: 0.0068, tiltDeg: 177.4, albedo: 0.75, atmosphere: "#e8d5a3" },
  Terra: { au: 1, eccentricity: 0.0167, tiltDeg: 23.44, albedo: 0.3, atmosphere: "#7ec8ff" },
  Marte: { au: 1.524, eccentricity: 0.0934, tiltDeg: 25.19, albedo: 0.25, atmosphere: "#c9896a" },
  Júpiter: { au: 5.203, eccentricity: 0.0489, tiltDeg: 3.13, albedo: 0.52, atmosphere: "#d6b48a" },
  Saturno: { au: 9.537, eccentricity: 0.0565, tiltDeg: 26.73, albedo: 0.47, atmosphere: "#e6d3a8" },
  Urano: { au: 19.191, eccentricity: 0.0457, tiltDeg: 97.77, albedo: 0.51, atmosphere: "#9fe4ee" },
  Netuno: { au: 30.07, eccentricity: 0.0113, tiltDeg: 28.32, albedo: 0.41, atmosphere: "#6f93e8" },
  Ceres: { au: 2.77, eccentricity: 0.0758, tiltDeg: 4, albedo: 0.09 },
  Plutão: { au: 39.48, eccentricity: 0.2488, tiltDeg: 122.5, albedo: 0.49 },
  Haumea: { au: 43.13, eccentricity: 0.191, tiltDeg: 126, albedo: 0.51 },
  Makemake: { au: 45.43, eccentricity: 0.159, tiltDeg: 29, albedo: 0.81 },
  Éris: { au: 67.86, eccentricity: 0.436, tiltDeg: 78, albedo: 0.96 },
  Lua: { au: 0.00257, eccentricity: 0.0549, tiltDeg: 6.68, albedo: 0.12 },
};

export function scienceOf(name: string): ScienceProfile | undefined {
  return SCIENCE[name];
}

export function semiMajorScene(data: CelestialBody, blend: number): number {
  const sci = SCIENCE[data.name];
  const real = (sci?.au ?? data.orbitRadius / AU_SCENE) * AU_SCENE;
  return data.orbitRadius + (real - data.orbitRadius) * blend;
}

export function eccentricityOf(data: CelestialBody): number {
  if (data.kind === "moon") return SCIENCE[data.name]?.eccentricity ?? 0.04;
  return SCIENCE[data.name]?.eccentricity ?? 0.02;
}

export function axialTiltRad(name: string): number {
  const deg = SCIENCE[name]?.tiltDeg ?? 0;
  return (deg * Math.PI) / 180;
}

export function solveKepler(M: number, e: number): { rFactor: number; nu: number } {
  let E = M;
  for (let i = 0; i < 8; i++) E = M + e * Math.sin(E);
  const nu =
    2 *
    Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  const rFactor = (1 - e * e) / (1 + e * Math.cos(nu));
  return { rFactor, nu };
}

export function ellipsePoint(a: number, e: number, M: number): { x: number; z: number } {
  const { rFactor, nu } = solveKepler(M, e);
  const r = a * rFactor;
  return { x: Math.cos(nu) * r, z: Math.sin(nu) * r };
}

export function earthSeason(date: Date): { name: string; hemisphere: string; subsolar: number } {
  const start = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = (date.getTime() - start) / 86_400_000;
  const tilt = 23.44;
  const subsolar = tilt * Math.sin(((2 * Math.PI) / 365.25) * (day - 80));
  // SH: autumn Mar–May, winter Jun–Aug, spring Sep–Nov, summer Dec–Feb
  const m = date.getUTCMonth();
  let name = "Verão";
  if (m >= 2 && m <= 4) name = "Outono";
  else if (m >= 5 && m <= 7) name = "Inverno";
  else if (m >= 8 && m <= 10) name = "Primavera";
  return { name, hemisphere: "sul", subsolar };
}

export function apparentMagnitude(
  name: string,
  distSunAu: number,
  distEarthAu: number,
): number {
  const sci = SCIENCE[name];
  const albedo = sci?.albedo ?? 0.2;
  const phase = Math.max(0.08, 1 / (1 + distEarthAu));
  const h = -26.7 + 2.5 * Math.log10(1 / Math.max(albedo, 0.04));
  return h + 5 * Math.log10(Math.max(distSunAu * distEarthAu, 1e-6)) - 2.5 * Math.log10(phase);
}

export function sceneToAu(sceneDist: number): number {
  return sceneDist / AU_SCENE;
}

export type SkyAlignment = "eclipse-lunar" | "eclipse-solar" | "trânsito de Vênus" | null;

export function detectAlignment(
  sun: { x: number; y: number; z: number },
  earth: { x: number; y: number; z: number },
  moon: { x: number; y: number; z: number } | null,
  venus: { x: number; y: number; z: number } | null,
): SkyAlignment {
  const sub = (a: typeof sun, b: typeof sun) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
  const dot = (a: typeof sun, b: typeof sun) => a.x * b.x + a.y * b.y + a.z * b.z;
  const len = (a: typeof sun) => Math.hypot(a.x, a.y, a.z);
  const align = (a: typeof sun, b: typeof sun) => {
    const la = len(a);
    const lb = len(b);
    if (la < 1e-6 || lb < 1e-6) return 0;
    return dot(a, b) / (la * lb);
  };

  if (moon) {
    const earthFromSun = sub(earth, sun);
    const moonFromEarth = sub(moon, earth);
    const moonFromSun = sub(moon, sun);
    const lunar = align(earthFromSun, moonFromEarth);
    if (lunar > 0.997 && len(moonFromEarth) < 3.2) return "eclipse-lunar";
    const solar = align(moonFromSun, sub(earth, sun));
    const moonCloser = len(moonFromSun) < len(earthFromSun);
    if (solar > 0.9985 && moonCloser && len(moonFromEarth) < 3.2) return "eclipse-solar";
  }

  if (venus) {
    const earthFromSun = sub(earth, sun);
    const venusFromSun = sub(venus, sun);
    const venusCloser = len(venusFromSun) < len(earthFromSun);
    const line = align(venusFromSun, earthFromSun);
    if (venusCloser && line > 0.999) return "trânsito de Vênus";
  }
  return null;
}
