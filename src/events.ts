export interface TimelineEvent {
  id: string;
  date: string;
  title: string;
  kind: "missão" | "céu" | "descoberta";
  body?: string;
  detail: string;
}

export const TIMELINE_EVENTS: TimelineEvent[] = [
  {
    id: "sputnik",
    date: "1957-10-04",
    title: "Sputnik 1",
    kind: "missão",
    detail: "Primeiro satélite artificial em órbita.",
  },
  {
    id: "gagarin",
    date: "1961-04-12",
    title: "Gagarin",
    kind: "missão",
    body: "Terra",
    detail: "Primeiro humano no espaço.",
  },
  {
    id: "apollo11",
    date: "1969-07-20",
    title: "Apollo 11",
    kind: "missão",
    body: "Lua",
    detail: "Primeiros passos na Lua.",
  },
  {
    id: "pioneer10",
    date: "1972-03-02",
    title: "Pioneer 10",
    kind: "missão",
    body: "Júpiter",
    detail: "Primeira sonda a Júpiter e ao espaço interestelar.",
  },
  {
    id: "voyager2",
    date: "1977-08-20",
    title: "Voyager 2",
    kind: "missão",
    body: "Voyager 2",
    detail: "Lançamento da Voyager 2.",
  },
  {
    id: "voyager1",
    date: "1977-09-05",
    title: "Voyager 1",
    kind: "missão",
    body: "Voyager 1",
    detail: "Lançamento da Voyager 1.",
  },
  {
    id: "voyager-jupiter",
    date: "1979-03-05",
    title: "Voyager em Júpiter",
    kind: "missão",
    body: "Júpiter",
    detail: "Sobrevoo de Júpiter pela Voyager 1.",
  },
  {
    id: "halley-1986",
    date: "1986-02-09",
    title: "Halley no periélio",
    kind: "céu",
    body: "Halley",
    detail: "Última passagem visível do cometa de Halley.",
  },
  {
    id: "hubble",
    date: "1990-04-24",
    title: "Hubble",
    kind: "missão",
    detail: "Lançamento do telescópio espacial Hubble.",
  },
  {
    id: "pluto-dwarf",
    date: "2006-08-24",
    title: "Plutão reclassificado",
    kind: "descoberta",
    body: "Plutão",
    detail: "IAU define planeta-anão; Plutão deixa de ser o 9º planeta.",
  },
  {
    id: "newhorizons",
    date: "2015-07-14",
    title: "New Horizons",
    kind: "missão",
    body: "Plutão",
    detail: "Sobrevoo de Plutão.",
  },
  {
    id: "jwst",
    date: "2021-12-25",
    title: "James Webb",
    kind: "missão",
    body: "James Webb",
    detail: "Lançamento do JWST rumo ao ponto L2.",
  },
  {
    id: "equinox-2026",
    date: "2026-03-20",
    title: "Equinócio de março",
    kind: "céu",
    body: "Terra",
    detail: "Início do outono no hemisfério sul.",
  },
];

export const TIMELINE_START = Date.UTC(1957, 0, 1);
export const TIMELINE_END = Date.UTC(2035, 11, 31);

export function dateToSlider(date: Date): number {
  const t = date.getTime();
  return (t - TIMELINE_START) / (TIMELINE_END - TIMELINE_START);
}

export function sliderToDate(t: number): Date {
  return new Date(TIMELINE_START + t * (TIMELINE_END - TIMELINE_START));
}

export function eventsNear(date: Date, windowMs = 1000 * 60 * 60 * 24 * 20): TimelineEvent[] {
  const t = date.getTime();
  return TIMELINE_EVENTS.filter((ev) => Math.abs(Date.parse(ev.date) - t) <= windowMs);
}

export function formatDatePt(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
