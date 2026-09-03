export type BodyKind = "star" | "planet" | "dwarf" | "moon" | "comet" | "mission";

export interface RingSpec {
  inner: number;
  outer: number;
  texture?: string;
  color?: string;
  opacity?: number;
}

export interface CelestialBody {
  name: string;
  kind: BodyKind;
  /** Visual radius (scene units, didactic scale) */
  radius: number;
  /** Radius relative to Earth in the “tamanhos relativos” mode */
  radiusEarth?: number;
  /** Distance from parent center */
  orbitRadius: number;
  /** Full orbit duration in Earth days */
  orbitDays: number;
  /** Axial spin duration in Earth days */
  spinDays: number;
  /** Orbit inclination in radians */
  inclination: number;
  color: string;
  texture?: string;
  cloudTexture?: string;
  description: string;
  facts: Record<string, string>;
  moons?: CelestialBody[];
  rings?: RingSpec;
  /** Tint multiplier when reusing a shared rocky texture */
  tint?: string;
}

function moon(
  name: string,
  radius: number,
  orbitRadius: number,
  orbitDays: number,
  spinDays: number,
  inclination: number,
  description: string,
  facts: Record<string, string>,
  tint = "#c8c2b4",
): CelestialBody {
  return {
    name,
    kind: "moon",
    radius,
    orbitRadius,
    orbitDays,
    spinDays,
    inclination,
    color: tint,
    texture: "/textures/2k_moon.jpg",
    tint,
    description,
    facts,
  };
}

export const SUN: CelestialBody = {
  name: "Sol",
  kind: "star",
  radius: 4.2,
  radiusEarth: 12,
  orbitRadius: 0,
  orbitDays: 0,
  spinDays: 25,
  inclination: 0,
  color: "#ffb347",
  texture: "/textures/2k_sun.jpg",
  description: "Estrela anã amarela no centro do Sistema Solar.",
  facts: {
    Tipo: "Estrela G2V",
    Diâmetro: "1.392.700 km",
    Temperatura: "~5.500 °C (superfície)",
  },
};

/** Distances and sizes are stylized for readability, not to scale. */
export const PLANETS: CelestialBody[] = [
  {
    name: "Mercúrio",
    kind: "planet",
    radius: 0.38,
    radiusEarth: 0.38,
    orbitRadius: 8,
    orbitDays: 88,
    spinDays: 59,
    inclination: 0.12,
    color: "#b1b1b1",
    texture: "/textures/2k_mercury.jpg",
    description: "O planeta mais próximo do Sol, rochoso e sem atmosfera densa.",
    facts: {
      Ordem: "1º",
      "Ano orbital": "88 dias",
      Luas: "Nenhuma",
    },
  },
  {
    name: "Vênus",
    kind: "planet",
    radius: 0.72,
    radiusEarth: 0.95,
    orbitRadius: 11,
    orbitDays: 225,
    spinDays: 243,
    inclination: 0.06,
    color: "#e0c088",
    texture: "/textures/2k_venus_surface.jpg",
    description: "Planeta envolto em nuvens densas e efeito estufa extremo.",
    facts: {
      Ordem: "2º",
      "Ano orbital": "225 dias",
      Luas: "Nenhuma",
      Atmosfera: "CO₂ denso",
    },
  },
  {
    name: "Terra",
    kind: "planet",
    radius: 0.78,
    radiusEarth: 1,
    orbitRadius: 15,
    orbitDays: 365,
    spinDays: 1,
    inclination: 0.04,
    color: "#3d7ad6",
    texture: "/textures/2k_earth_daymap.jpg",
    cloudTexture: "/textures/2k_earth_clouds.jpg",
    description: "Nosso planeta — oceano, atmosfera e vida.",
    facts: {
      Ordem: "3º",
      "Ano orbital": "365 dias",
      Luas: "1 (Lua)",
    },
    moons: [
      moon("Lua", 0.22, 1.85, 27.3, 27.3, 0.09, "Satélite natural da Terra.", {
        Tipo: "Lua",
        Órbita: "27,3 dias",
        Distância: "~384.400 km",
      }),
    ],
  },
  {
    name: "Marte",
    kind: "planet",
    radius: 0.52,
    radiusEarth: 0.53,
    orbitRadius: 19,
    orbitDays: 687,
    spinDays: 1.03,
    inclination: 0.08,
    color: "#c1440e",
    texture: "/textures/2k_mars.jpg",
    description: "O planeta vermelho, com calotas polares e vulcões gigantes.",
    facts: {
      Ordem: "4º",
      "Ano orbital": "687 dias",
      Luas: "2 (Fobos, Deimos)",
    },
    moons: [
      moon("Fobos", 0.08, 0.95, 0.32, 0.32, 0.02, "Lua interna de Marte, em órbita muito baixa.", {
        Diâmetro: "~22 km",
        Órbita: "7,7 h",
      }, "#a89080"),
      moon("Deimos", 0.06, 1.45, 1.26, 1.26, 0.03, "Lua externa de Marte, irregular e pequena.", {
        Diâmetro: "~12 km",
        Órbita: "1,3 dias",
      }, "#9a8b7a"),
    ],
  },
  {
    name: "Júpiter",
    kind: "planet",
    radius: 2.1,
    radiusEarth: 11.2,
    orbitRadius: 30,
    orbitDays: 4333,
    spinDays: 0.41,
    inclination: 0.03,
    color: "#c9956a",
    texture: "/textures/2k_jupiter.jpg",
    description: "Gigante gasoso — o maior planeta do Sistema Solar.",
    facts: {
      Ordem: "5º",
      "Ano orbital": "~12 anos",
      Luas: "95+ conhecidas",
      Destaque: "Grande Mancha Vermelha",
    },
    moons: [
      moon("Io", 0.28, 3.0, 1.77, 1.77, 0.01, "A lua vulcânica de Júpiter.", {
        Grupo: "Galileana",
        Órbita: "1,8 dias",
      }, "#d4b56a"),
      moon("Europa", 0.25, 3.7, 3.55, 3.55, 0.015, "Superfície gelada com oceano subterrâneo.", {
        Grupo: "Galileana",
        Órbita: "3,5 dias",
      }, "#c9b8a0"),
      moon("Ganimedes", 0.36, 4.6, 7.15, 7.15, 0.02, "A maior lua do Sistema Solar.", {
        Grupo: "Galileana",
        Órbita: "7,2 dias",
      }, "#8f8174"),
      moon("Calisto", 0.33, 5.6, 16.7, 16.7, 0.025, "Lua antiga e densamente craterizada.", {
        Grupo: "Galileana",
        Órbita: "16,7 dias",
      }, "#6e655c"),
      moon("Amalteia", 0.1, 2.5, 0.5, 0.5, 0.04, "Lua interior irregular de Júpiter.", {
        Grupo: "Interior",
        Órbita: "12 h",
      }, "#8a5a3a"),
      moon("Himalia", 0.12, 7.2, 250, 250, 0.35, "Lua irregular do grupo Himalia.", {
        Grupo: "Irregular",
        Órbita: "~250 dias",
      }, "#7a7068"),
    ],
  },
  {
    name: "Saturno",
    kind: "planet",
    radius: 1.75,
    radiusEarth: 9.45,
    orbitRadius: 40,
    orbitDays: 10759,
    spinDays: 0.45,
    inclination: 0.05,
    color: "#e6d3a3",
    texture: "/textures/2k_saturn.jpg",
    description: "Famoso pelo sistema de anéis brilhantes.",
    facts: {
      Ordem: "6º",
      "Ano orbital": "~29 anos",
      Luas: "140+ conhecidas",
      Anéis: "Gelo e poeira",
    },
    rings: {
      inner: 2.35,
      outer: 3.85,
      texture: "/textures/2k_saturn_ring_alpha.png",
      color: "#d9c39a",
      opacity: 0.92,
    },
    moons: [
      moon("Mimas", 0.12, 2.55, 0.94, 0.94, 0.02, "Lua com a grande cratera Herschel.", {
        Órbita: "0,9 dias",
      }, "#bdb6aa"),
      moon("Encélado", 0.14, 2.85, 1.37, 1.37, 0.02, "Geysers de gelo no polo sul.", {
        Órbita: "1,4 dias",
      }, "#e8f0f5"),
      moon("Tétis", 0.18, 3.15, 1.89, 1.89, 0.02, "Lua gelada com grande cânion.", {
        Órbita: "1,9 dias",
      }, "#d8d2c8"),
      moon("Dione", 0.18, 3.45, 2.74, 2.74, 0.02, "Terrenos brilhantes e crateras.", {
        Órbita: "2,7 dias",
      }, "#cfc8bc"),
      moon("Reia", 0.22, 3.9, 4.52, 4.52, 0.03, "Segunda maior lua de Saturno.", {
        Órbita: "4,5 dias",
      }, "#c4bdb0"),
      moon("Titã", 0.4, 4.7, 15.95, 15.95, 0.04, "Atmosfera densa e lagos de metano.", {
        Órbita: "16 dias",
        Destaque: "Atmosfera de N₂",
      }, "#c4a46a"),
      moon("Hiperião", 0.1, 5.3, 21.3, 21.3, 0.1, "Lua esponjosa de rotação caótica.", {
        Órbita: "21 dias",
      }, "#a89070"),
      moon("Jápeto", 0.22, 6.2, 79.3, 79.3, 0.12, "Dois hemisférios com brilhos contrastantes.", {
        Órbita: "79 dias",
      }, "#6a5a4a"),
      moon("Febe", 0.11, 7.4, 550, 550, 0.55, "Lua retrógrada e irregular.", {
        Órbita: "~550 dias",
      }, "#5a5048"),
    ],
  },
  {
    name: "Urano",
    kind: "planet",
    radius: 1.15,
    radiusEarth: 4.0,
    orbitRadius: 50,
    orbitDays: 30687,
    spinDays: 0.72,
    inclination: 0.1,
    color: "#7fd3e0",
    texture: "/textures/2k_uranus.jpg",
    description: "Gigante de gelo com eixo de rotação bastante inclinado.",
    facts: {
      Ordem: "7º",
      "Ano orbital": "~84 anos",
      Luas: "28 conhecidas",
      Tipo: "Gigante de gelo",
    },
    rings: {
      inner: 1.55,
      outer: 2.05,
      color: "#9ab0b8",
      opacity: 0.35,
    },
    moons: [
      moon("Miranda", 0.12, 2.3, 1.41, 1.41, 0.08, "Terrenos extremos e penhascos gigantes.", {
        Órbita: "1,4 dias",
      }, "#b0aaa0"),
      moon("Ariel", 0.16, 2.7, 2.52, 2.52, 0.05, "Superfície jovem com cânions.", {
        Órbita: "2,5 dias",
      }, "#c2bbb0"),
      moon("Umbriel", 0.16, 3.1, 4.14, 4.14, 0.05, "Lua escura e craterizada.", {
        Órbita: "4,1 dias",
      }, "#6e6860"),
      moon("Titânia", 0.2, 3.6, 8.71, 8.71, 0.04, "Maior lua de Urano.", {
        Órbita: "8,7 dias",
      }, "#9a9288"),
      moon("Oberon", 0.19, 4.1, 13.46, 13.46, 0.04, "Lua externa com crateras antigas.", {
        Órbita: "13,5 dias",
      }, "#8a8278"),
    ],
  },
  {
    name: "Netuno",
    kind: "planet",
    radius: 1.1,
    radiusEarth: 3.88,
    orbitRadius: 58,
    orbitDays: 60190,
    spinDays: 0.67,
    inclination: 0.07,
    color: "#3b6fd8",
    texture: "/textures/2k_neptune.jpg",
    description: "O planeta mais distante, com ventos extremamente fortes.",
    facts: {
      Ordem: "8º",
      "Ano orbital": "~165 anos",
      Luas: "16 conhecidas",
      Destaque: "Ventos supersônicos",
    },
    moons: [
      moon("Proteu", 0.14, 2.4, 1.12, 1.12, 0.03, "Lua irregular e escura de Netuno.", {
        Órbita: "1,1 dias",
      }, "#6a6560"),
      moon("Tritão", 0.3, 3.2, 5.88, 5.88, 0.4, "Lua retrógrada com gêiseres de nitrogênio.", {
        Órbita: "5,9 dias (retrógrada)",
        Destaque: "Órbita retrógrada",
      }, "#c8c0b0"),
      moon("Nereida", 0.1, 5.5, 360, 360, 0.5, "Órbita altamente excêntrica.", {
        Órbita: "~360 dias",
      }, "#8a8478"),
    ],
  },
];

export const DWARF_PLANETS: CelestialBody[] = [
  {
    name: "Ceres",
    kind: "dwarf",
    radius: 0.28,
    radiusEarth: 0.07,
    orbitRadius: 23.5,
    orbitDays: 1682,
    spinDays: 0.38,
    inclination: 0.18,
    color: "#a8a29a",
    texture: "/textures/2k_ceres_fictional.jpg",
    description: "Planeta-anão no cinturão de asteroides — o maior objeto da região.",
    facts: {
      Região: "Cinturão de asteroides",
      "Ano orbital": "~4,6 anos",
      Tipo: "Planeta-anão",
    },
  },
  {
    name: "Plutão",
    kind: "dwarf",
    radius: 0.35,
    radiusEarth: 0.18,
    orbitRadius: 68,
    orbitDays: 90560,
    spinDays: 6.4,
    inclination: 0.3,
    color: "#c4a882",
    texture: "/textures/2k_pluto.jpg",
    description: "Planeta-anão do cinturão de Kuiper, com coração de gelo famoso.",
    facts: {
      Região: "Cinturão de Kuiper",
      "Ano orbital": "~248 anos",
      Luas: "5 (Caronte + 4)",
    },
    moons: [
      moon("Caronte", 0.18, 1.1, 6.4, 6.4, 0.02, "Lua gigante de Plutão — quase um sistema duplo.", {
        Órbita: "6,4 dias",
      }, "#9a9088"),
      moon("Nix", 0.05, 1.55, 24.9, 24.9, 0.05, "Lua pequena de Plutão.", {
        Órbita: "~25 dias",
      }, "#b0aaa0"),
      moon("Hidra", 0.05, 1.85, 38.2, 38.2, 0.06, "Lua externa do sistema plutoniano.", {
        Órbita: "~38 dias",
      }, "#a8a298"),
    ],
  },
  {
    name: "Haumea",
    kind: "dwarf",
    radius: 0.26,
    radiusEarth: 0.12,
    orbitRadius: 72,
    orbitDays: 103774,
    spinDays: 0.16,
    inclination: 0.4,
    color: "#d8d0c4",
    texture: "/textures/2k_haumea_fictional.jpg",
    description: "Planeta-anão alongado que gira muito rápido.",
    facts: {
      Região: "Cinturão de Kuiper",
      "Ano orbital": "~284 anos",
      Forma: "Elipsoide",
    },
    moons: [
      moon("Hiʻiaka", 0.08, 1.2, 49, 49, 0.08, "Maior lua de Haumea.", { Órbita: "~49 dias" }),
      moon("Namaka", 0.06, 0.9, 18, 18, 0.1, "Lua interna de Haumea.", { Órbita: "~18 dias" }),
    ],
  },
  {
    name: "Makemake",
    kind: "dwarf",
    radius: 0.27,
    radiusEarth: 0.12,
    orbitRadius: 75,
    orbitDays: 112897,
    spinDays: 0.95,
    inclination: 0.35,
    color: "#c49a6c",
    texture: "/textures/2k_makemake_fictional.jpg",
    description: "Planeta-anão gelado do cinturão de Kuiper.",
    facts: {
      Região: "Cinturão de Kuiper",
      "Ano orbital": "~309 anos",
      Superfície: "Metano congelado",
    },
  },
  {
    name: "Éris",
    kind: "dwarf",
    radius: 0.34,
    radiusEarth: 0.18,
    orbitRadius: 82,
    orbitDays: 203830,
    spinDays: 1.08,
    inclination: 0.55,
    color: "#d0d4d8",
    texture: "/textures/2k_eris_fictional.jpg",
    description: "Um dos maiores planetas-anões — descoberta ajudou a redefinir Plutão.",
    facts: {
      Região: "Disco disperso",
      "Ano orbital": "~558 anos",
      Lua: "Disnomia",
    },
    moons: [
      moon("Disnomia", 0.08, 1.15, 15.8, 15.8, 0.05, "Única lua conhecida de Éris.", {
        Órbita: "~16 dias",
      }, "#b8b4ae"),
    ],
  },
];

export interface BeltSpec {
  name: string;
  inner: number;
  outer: number;
  count: number;
  color: number;
  size: number;
  opacity: number;
  thickness: number;
}

export const ASTEROID_BELT: BeltSpec = {
  name: "Cinturão de asteroides",
  inner: 21.5,
  outer: 26.5,
  count: 3200,
  color: 0xb9a892,
  size: 0.12,
  opacity: 0.9,
  thickness: 1.2,
};

export const KUIPER_BELT: BeltSpec = {
  name: "Cinturão de Kuiper",
  inner: 64,
  outer: 86,
  count: 4500,
  color: 0x8fa4c4,
  size: 0.1,
  opacity: 0.75,
  thickness: 3.5,
};
