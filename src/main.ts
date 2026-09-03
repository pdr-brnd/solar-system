import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  ASTEROID_BELT,
  DWARF_PLANETS,
  KUIPER_BELT,
  PLANETS,
  SUN,
  type BeltSpec,
  type CelestialBody,
} from "./planets";
import {
  apparentMagnitude,
  axialTiltRad,
  detectAlignment,
  earthSeason,
  eccentricityOf,
  ellipsePoint,
  semiMajorScene,
  AU_SCENE,
} from "./science";
import {
  createAtmosphere,
  createEarthMaterial,
  EclipticMinimap,
  makeCityLights,
  renderComparator,
  TOUR_STOPS,
  updateEarthSun,
} from "./planetarium";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { buildBodyTree } from "./tree";
import type { BodyRuntime } from "./types";
import {
  dateToSlider,
  eventsNear,
  formatDatePt,
  sliderToDate,
  TIMELINE_EVENTS,
  type TimelineEvent,
} from "./events";
import {
  applyBodyScale,
  createCometTail,
  createHalleyBody,
  createMissionBody,
  createProbeMesh,
  halleyPosition,
  makeLabel,
  OrbitTrail,
  updateCometTail,
  voyagerPosition,
} from "./extras";
import { julianDaysFromJ2000, keplerByName, meanLongitudeRad, tryFetchHorizonsSample } from "./kepler";
import { playSelect, playUiClick, playWhoosh, setMuted, unlockAudio } from "./audio";

const canvas = document.querySelector<HTMLCanvasElement>("#scene")!;
const speedInput = document.querySelector<HTMLInputElement>("#speed")!;
const speedValue = document.querySelector<HTMLOutputElement>("#speed-value")!;
const pauseBtn = document.querySelector<HTMLButtonElement>("#pause")!;
const resetCameraBtn = document.querySelector<HTMLButtonElement>("#reset-camera")!;
const orbitsToggle = document.querySelector<HTMLInputElement>("#orbits")!;
const followToggle = document.querySelector<HTMLInputElement>("#follow")!;
const beltsToggle = document.querySelector<HTMLInputElement>("#belts")!;
const infoPanel = document.querySelector<HTMLElement>("#info")!;
const infoType = document.querySelector<HTMLElement>("#info-type")!;
const infoName = document.querySelector<HTMLElement>("#info-name")!;
const infoFacts = document.querySelector<HTMLElement>("#info-facts")!;
const focusBtn = document.querySelector<HTMLButtonElement>("#focus")!;
const simTimeEl = document.querySelector<HTMLElement>("#sim-time")!;
const treeRoot = document.querySelector<HTMLElement>("#body-tree")!;
const treeFilter = document.querySelector<HTMLInputElement>("#tree-filter")!;
const labelsToggle = document.querySelector<HTMLInputElement>("#labels")!;
const trailToggle = document.querySelector<HTMLInputElement>("#trail")!;
const relativeToggle = document.querySelector<HTMLInputElement>("#relative-scale")!;
const liveToggle = document.querySelector<HTMLInputElement>("#live-pos")!;
const soundToggle = document.querySelector<HTMLInputElement>("#sound")!;
const timelineInput = document.querySelector<HTMLInputElement>("#timeline")!;
const eventBanner = document.querySelector<HTMLElement>("#event-banner")!;
const eventChips = document.querySelector<HTMLElement>("#event-chips")!;
const ephemStatus = document.querySelector<HTMLElement>("#ephem-status")!;
const fullscreenBtn = document.querySelector<HTMLButtonElement>("#fullscreen")!;
const vrBtn = document.querySelector<HTMLButtonElement>("#vr-toggle")!;
const exitImmersiveBtn = document.querySelector<HTMLButtonElement>("#exit-immersive")!;
const screenshotBtn = document.querySelector<HTMLButtonElement>("#screenshot")!;
const shareBtn = document.querySelector<HTMLButtonElement>("#share-view")!;
const toastEl = document.querySelector<HTMLElement>("#toast")!;
const distanceInput = document.querySelector<HTMLInputElement>("#distance-scale")!;
const distanceValue = document.querySelector<HTMLOutputElement>("#distance-value")!;
const tourBtn = document.querySelector<HTMLButtonElement>("#tour")!;
const tourCaption = document.querySelector<HTMLElement>("#tour-caption")!;
const compareA = document.querySelector<HTMLElement>("#compare-a")!;
const compareB = document.querySelector<HTMLElement>("#compare-b")!;
const compareHint = document.querySelector<HTMLElement>("#compare-hint")!;
const minimapCanvas = document.querySelector<HTMLCanvasElement>("#minimap")!;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
  logarithmicDepthBuffer: true,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.sortObjects = true;
renderer.xr.enabled = true;

const labelRenderer = new CSS2DRenderer();
labelRenderer.setSize(window.innerWidth, window.innerHeight);
labelRenderer.domElement.style.position = "absolute";
labelRenderer.domElement.style.inset = "0";
labelRenderer.domElement.style.pointerEvents = "none";
document.querySelector("#app")!.append(labelRenderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03050a);
scene.fog = new THREE.FogExp2(0x03050a, 0.0028);

const camera = new THREE.PerspectiveCamera(
  55,
  window.innerWidth / window.innerHeight,
  0.05,
  4000,
);
camera.position.set(0, 36, 78);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 6;
controls.maxDistance = 280;
controls.maxPolarAngle = Math.PI * 0.92;
controls.target.set(0, 0, 0);

scene.add(new THREE.AmbientLight(0x1a2233, 0.45));
scene.add(new THREE.HemisphereLight(0x9eb6ff, 0x1a1208, 0.25));

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map<string, THREE.Texture>();

function loadTexture(path: string): THREE.Texture {
  let tex = textureCache.get(path);
  if (tex) return tex;
  tex = textureLoader.load(path);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  textureCache.set(path, tex);
  return tex;
}

const bodies: BodyRuntime[] = [];
const selectable: THREE.Object3D[] = [];
const orbitGroup = new THREE.Group();
const beltGroup = new THREE.Group();
const orbitByName = new Map<string, THREE.Object3D>();
const beltByName = new Map<string, THREE.Object3D>();
scene.add(orbitGroup, beltGroup);

let paused = false;
let speed = 1;
let simDate = new Date();
let selected: BodyRuntime | null = null;
let focusTarget: THREE.Object3D | null = null;
let relativeScaleOn = false;
let distanceBlend = 0;
let tourToken = 0;
const minimap = new EclipticMinimap(minimapCanvas);
const earthShadow = new THREE.Mesh(
  new THREE.ConeGeometry(1.1, 10, 28, 1, true),
  new THREE.MeshBasicMaterial({
    color: 0x050814,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
);
earthShadow.rotation.x = Math.PI;
earthShadow.visible = false;
scene.add(earthShadow);
const trail = new OrbitTrail();
const cometPos = new THREE.Vector3();
const sunWorld = new THREE.Vector3();
const clock = new THREE.Clock();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const tmp = new THREE.Vector3();
const followPos = new THREE.Vector3();
const labelWorld = new THREE.Vector3();
const coneAxis = new THREE.Vector3(0, 1, 0);
const shadowDir = new THREE.Vector3();

function createStarfield(count = 4000): THREE.Points {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const radius = 120 + Math.random() * 280;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = radius * Math.cos(phi);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xdde7ff,
    size: 0.4,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}

function createEllipseOrbit(
  a: number,
  e: number,
  inclination: number,
  opacity = 0.32,
  color = 0x6e8099,
): THREE.Line {
  const segments = 180;
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const M = (i / segments) * Math.PI * 2;
    const p = ellipsePoint(a, e, M);
    points.push(new THREE.Vector3(p.x, 0, p.z));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    depthTest: true,
  });
  const line = new THREE.LineLoop(geometry, material);
  line.rotation.x = inclination;
  line.renderOrder = 1;
  line.frustumCulled = false;
  line.position.y = 0.02;
  return line;
}

function createBodyMesh(data: CelestialBody): THREE.Mesh {
  const segments = data.kind === "moon" ? 32 : 64;
  const geometry = new THREE.SphereGeometry(data.radius, segments, segments);

  if (data.kind === "star") {
    const material = new THREE.MeshBasicMaterial({
      map: data.texture ? loadTexture(data.texture) : undefined,
      color: data.texture ? 0xffffff : data.color,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = data.name;
    mesh.userData.bodyName = data.name;
    return mesh;
  }

  const material = new THREE.MeshStandardMaterial({
    map: data.texture ? loadTexture(data.texture) : undefined,
    color: data.tint ? new THREE.Color(data.tint) : 0xffffff,
    roughness: data.kind === "planet" && /Júpiter|Saturno/.test(data.name) ? 0.75 : 0.9,
    metalness: 0.02,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = data.name;
  mesh.userData.bodyName = data.name;
  return mesh;
}

function addClouds(anchor: THREE.Object3D, data: CelestialBody): THREE.Mesh | undefined {
  if (!data.cloudTexture) return undefined;
  const clouds = new THREE.Mesh(
    new THREE.SphereGeometry(data.radius * 1.015, 64, 64),
    new THREE.MeshStandardMaterial({
      map: loadTexture(data.cloudTexture),
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      roughness: 1,
      metalness: 0,
    }),
  );
  clouds.renderOrder = 2;
  anchor.add(clouds);
  return clouds;
}

function addRings(anchor: THREE.Object3D, data: CelestialBody): void {
  if (!data.rings) return;

  const { inner, outer } = data.rings;
  const geometry = new THREE.RingGeometry(inner, outer, 128, 8);
  const pos = geometry.attributes.position;
  const uv = geometry.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const dist = Math.sqrt(x * x + y * y);
    const u = (dist - inner) / (outer - inner);
    uv.setXY(i, u, 0.5);
  }
  uv.needsUpdate = true;

  const material = new THREE.MeshBasicMaterial({
    color: data.rings.color ?? "#d9c39a",
    side: THREE.DoubleSide,
    transparent: true,
    opacity: data.rings.opacity ?? 0.85,
    depthWrite: false,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });

  if (data.rings.texture) {
    const ringTex = loadTexture(data.rings.texture);
    ringTex.wrapS = THREE.ClampToEdgeWrapping;
    ringTex.wrapT = THREE.ClampToEdgeWrapping;
    ringTex.magFilter = THREE.LinearFilter;
    ringTex.minFilter = THREE.LinearMipmapLinearFilter;
    ringTex.generateMipmaps = true;
    ringTex.anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
    material.map = ringTex;
    material.alphaMap = ringTex;
    material.opacity = 1;
  }

  const ring = new THREE.Mesh(geometry, material);
  // Flat on XZ — not parented to spinning surface mesh (avoids shimmer)
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.001;
  ring.renderOrder = 3;
  ring.name = `${data.name}-rings`;
  anchor.add(ring);
}

function createMinorMoonSwarm(
  parent: THREE.Object3D,
  count: number,
  inner: number,
  outer: number,
  thickness: number,
): THREE.Points {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = THREE.MathUtils.lerp(inner, outer, Math.random());
    const a = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * thickness;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(a) * r;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xc5c0b6,
    size: 0.045,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  points.name = "luas-menores";
  parent.add(points);
  return points;
}

function createBelt(spec: BeltSpec): THREE.Points {
  const positions = new Float32Array(spec.count * 3);
  const colors = new Float32Array(spec.count * 3);
  const base = new THREE.Color(spec.color);

  for (let i = 0; i < spec.count; i++) {
    const r = THREE.MathUtils.lerp(spec.inner, spec.outer, Math.random());
    const a = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.5) * spec.thickness;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = y;
    positions[i * 3 + 2] = Math.sin(a) * r;

    const shade = 0.65 + Math.random() * 0.45;
    colors[i * 3] = base.r * shade;
    colors[i * 3 + 1] = base.g * shade;
    colors[i * 3 + 2] = base.b * shade;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: spec.size,
    vertexColors: true,
    transparent: true,
    opacity: spec.opacity,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  points.name = spec.name;
  points.frustumCulled = false;
  return points;
}

function createSun(): BodyRuntime {
  const system = new THREE.Object3D();
  scene.add(system);
  const pivot = new THREE.Object3D();
  system.add(pivot);
  const anchor = new THREE.Object3D();
  pivot.add(anchor);

  const mesh = createBodyMesh(SUN);
  anchor.add(mesh);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(SUN.radius * 1.28, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff9a3c,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    }),
  );
  glow.renderOrder = 0;
  anchor.add(glow);

  const corona = new THREE.Mesh(
    new THREE.SphereGeometry(SUN.radius * 1.75, 32, 32),
    new THREE.MeshBasicMaterial({
      color: 0xff6a00,
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
    }),
  );
  corona.renderOrder = 0;
  anchor.add(corona);

  const light = new THREE.PointLight(0xffd09a, 220, 320, 1.5);
  anchor.add(light);

  selectable.push(mesh);
  const label = makeLabel(SUN.name);
  label.position.y = SUN.radius + 0.35;
  anchor.add(label);

  return {
    data: SUN,
    system,
    pivot,
    anchor,
    mesh,
    scaleTargets: [mesh, glow, corona],
    label,
    angle: 0,
    children: [],
  };
}

function createOrbitingBody(
  data: CelestialBody,
  parent: THREE.Object3D,
  isMoon = false,
  parentBody?: BodyRuntime,
): BodyRuntime {
  const system = new THREE.Object3D();
  parent.add(system);
  system.rotation.x = data.inclination;

  // Orbit path stays on `system` (does not spin with orbital angle) — fixes moon flicker
  if (isMoon) {
    const moonOrbit = createEllipseOrbit(data.orbitRadius, eccentricityOf(data), 0, 0.4, 0xa8bdd8);
    moonOrbit.position.y = 0.015;
    system.add(moonOrbit);
  }

  const pivot = new THREE.Object3D();
  system.add(pivot);

  const anchor = new THREE.Object3D();
  anchor.position.x = data.orbitRadius;
  pivot.add(anchor);

  const tiltGroup = new THREE.Group();
  tiltGroup.rotation.z = axialTiltRad(data.name);
  anchor.add(tiltGroup);

  const mesh = createBodyMesh(data);
  tiltGroup.add(mesh);
  addRings(tiltGroup, data);
  const clouds = addClouds(tiltGroup, data);
  const ring = tiltGroup.getObjectByName(`${data.name}-rings`);
  const scaleTargets: THREE.Object3D[] = [mesh];
  if (clouds) scaleTargets.push(clouds);
  if (ring) scaleTargets.push(ring);

  let earthMat: THREE.ShaderMaterial | undefined;
  if (data.name === "Terra" && data.texture) {
    earthMat = createEarthMaterial(
      loadTexture(data.texture),
      makeCityLights(),
      data.cloudTexture ? loadTexture(data.cloudTexture) : null,
    );
    mesh.material = earthMat;
  }

  const atmColor = data.name === "Terra" ? "#7ec8ff" : data.name === "Vênus" ? "#e8d5a3" : data.name === "Marte" ? "#c9896a" : data.name === "Júpiter" ? "#d6b48a" : data.name === "Saturno" ? "#e6d3a8" : data.name === "Urano" ? "#9fe4ee" : data.name === "Netuno" ? "#6f93e8" : undefined;
  let atmosphere: THREE.Mesh | undefined;
  if (atmColor) {
    atmosphere = createAtmosphere(data.radius, atmColor);
    tiltGroup.add(atmosphere);
    scaleTargets.push(atmosphere);
  }

  const label = makeLabel(data.name);
  label.position.y = data.radius + 0.2;
  anchor.add(label);

  selectable.push(mesh);

  const runtime: BodyRuntime = {
    data,
    system,
    pivot,
    anchor,
    mesh,
    clouds,
    scaleTargets,
    label,
    parent: parentBody,
    tiltGroup,
    atmosphere,
    ringMesh: ring instanceof THREE.Mesh ? ring : undefined,
    earthMat,
    angle: Math.random() * Math.PI * 2,
    children: [],
  };

  if (data.moons) {
    for (const m of data.moons) {
      runtime.children.push(createOrbitingBody(m, anchor, true, runtime));
    }
  }

  // Nuvem das luas menores / irregulares (além das nomeadas)
  if (data.name === "Júpiter") {
    createMinorMoonSwarm(anchor, 90, 5.8, 8.5, 1.8);
  } else if (data.name === "Saturno") {
    createMinorMoonSwarm(anchor, 130, 6.5, 9.5, 2.2);
  } else if (data.name === "Urano") {
    createMinorMoonSwarm(anchor, 28, 4.3, 5.8, 0.9);
  } else if (data.name === "Netuno") {
    createMinorMoonSwarm(anchor, 16, 4.0, 6.2, 1.0);
  }

  return runtime;
}

function rebuildPrimaryOrbits(list: CelestialBody[]): void {
  while (orbitGroup.children.length) {
    const child = orbitGroup.children[0];
    orbitGroup.remove(child);
    if (child instanceof THREE.Line) {
      child.geometry.dispose();
      (child.material as THREE.Material).dispose();
    }
  }
  orbitByName.clear();

  for (const body of list) {
    const color = body.kind === "dwarf" ? 0x8a7a5c : 0x6e8099;
    const opacity = body.kind === "dwarf" ? 0.28 : 0.32;
    const line = createEllipseOrbit(
      semiMajorScene(body, distanceBlend),
      eccentricityOf(body),
      body.inclination,
      opacity,
      color,
    );
    orbitGroup.add(line);
    orbitByName.set(body.name, line);
  }
}

function selectBody(body: BodyRuntime, focus = false): void {
  playSelect();
  trail.reset();
  showInfo(body);
  treeApi?.setSelected(body.data.name);
  treeApi?.expandTo(body.data.name);
  if (focus) {
    focusOn(body);
    followToggle.checked = true;
    focusTarget = body.mesh;
  } else if (followToggle.checked) {
    focusTarget = body.mesh;
  }
}

function setBodyVisible(body: BodyRuntime, visible: boolean): void {
  body.system.visible = visible;
  const orbit = orbitByName.get(body.data.name);
  if (orbit) {
    orbit.visible = visible && orbitsToggle.checked;
  }
}

function setBeltVisible(name: string, visible: boolean): void {
  const belt = beltByName.get(name);
  if (belt) belt.visible = visible && (beltsToggle?.checked ?? true);
}

function filterTree(query: string): void {
  const q = query.trim().toLowerCase();
  const nodes = treeRoot.querySelectorAll<HTMLElement>("li.tree-node");
  nodes.forEach((node) => node.classList.remove("is-filtered-out"));
  if (!q) return;

  nodes.forEach((node) => {
    const label = node.querySelector(".tree-label, .tree-group-label");
    const text = label?.textContent?.toLowerCase() ?? "";
    const selfMatch = text.includes(q);
    const childMatch = [...node.querySelectorAll(".tree-label, .tree-group-label")].some((el) =>
      (el.textContent ?? "").toLowerCase().includes(q),
    );
    if (!selfMatch && !childMatch) {
      node.classList.add("is-filtered-out");
    } else if (childMatch) {
      node.classList.add("is-open");
    }
  });
}

function kindLabel(kind: CelestialBody["kind"]): string {
  switch (kind) {
    case "star":
      return "Estrela";
    case "moon":
      return "Satélite";
    case "dwarf":
      return "Planeta-anão";
    case "comet":
      return "Cometa";
    case "mission":
      return "Missão";
    default:
      return "Planeta";
  }
}

function showInfo(body: BodyRuntime): void {
  selected = body;
  infoPanel.hidden = false;
  infoType.textContent = kindLabel(body.data.kind);
  infoName.textContent = body.data.name;
  infoFacts.innerHTML = "";
  for (const [key, value] of Object.entries(body.data.facts)) {
    const dt = document.createElement("dt");
    dt.textContent = key;
    const dd = document.createElement("dd");
    dd.textContent = value;
    infoFacts.append(dt, dd);
  }

  body.mesh.getWorldPosition(tmp);
  const distAu = tmp.length() / AU_SCENE;
  const earth = findRuntimeByName("Terra");
  earth?.mesh.getWorldPosition(followPos);
  const distEarthAu = earth ? tmp.distanceTo(followPos) / AU_SCENE : distAu;
  if (body.data.kind !== "star" && body.data.kind !== "mission") {
    const mag = apparentMagnitude(body.data.name, Math.max(distAu, 0.01), Math.max(distEarthAu, 0.01));
    appendFact("Magnitude aparente", mag.toFixed(1));
    appendFact("Excentricidade", eccentricityOf(body.data).toFixed(3));
  }
  if (body.data.name === "Terra") {
    const season = earthSeason(simDate);
    appendFact("Estação (HS)", season.name);
    appendFact("Inclinação axial", "23,4°");
  }
  const tilt = axialTiltRad(body.data.name);
  if (tilt > 0.05 && body.data.name !== "Terra") {
    appendFact("Inclinação axial", `${((tilt * 180) / Math.PI).toFixed(1)}°`);
  }

  const desc = document.createElement("dt");
  desc.textContent = "Sobre";
  const descVal = document.createElement("dd");
  descVal.textContent = body.data.description;
  infoFacts.append(desc, descVal);
  treeApi?.setSelected(body.data.name);
  renderComparator(compareA, compareB, body === sun ? null : body);
  compareHint.textContent =
    body === sun
      ? "Selecione um planeta para comparar com a Terra"
      : `${body.data.name} vs Terra (raios relativos)`;
}

function appendFact(key: string, value: string): void {
  const dt = document.createElement("dt");
  dt.textContent = key;
  const dd = document.createElement("dd");
  dd.textContent = value;
  infoFacts.append(dt, dd);
}

function findRuntimeByMesh(mesh: THREE.Object3D): BodyRuntime | null {
  const visit = (list: BodyRuntime[]): BodyRuntime | null => {
    for (const body of list) {
      if (body.mesh === mesh) return body;
      const nested = visit(body.children);
      if (nested) return nested;
    }
    return null;
  };
  return visit(bodies);
}

function focusOn(body: BodyRuntime): void {
  focusTarget = body.mesh;
  body.mesh.getWorldPosition(tmp);
  const distance = Math.max(body.data.radius * 8, 5);
  camera.position.copy(tmp).add(new THREE.Vector3(distance * 0.6, distance * 0.35, distance));
  controls.target.copy(tmp);
  controls.update();
}

function formatSimTime(date: Date): string {
  return formatDatePt(date);
}

function placeOnEllipse(body: BodyRuntime): void {
  if (body.data.orbitDays <= 0) return;
  if (body.data.kind === "comet" || body.data.kind === "mission") return;
  const a = body.parent ? body.data.orbitRadius : semiMajorScene(body.data, distanceBlend);
  const e = eccentricityOf(body.data);
  const p = ellipsePoint(a, e, body.angle);
  body.pivot.rotation.y = 0;
  body.anchor.position.set(p.x, 0, p.z);
}

function placeAllOrbits(list: BodyRuntime[]): void {
  for (const body of list) {
    placeOnEllipse(body);
    placeAllOrbits(body.children);
  }
}

function applyKeplerDate(date: Date): void {
  const visit = (list: BodyRuntime[]) => {
    for (const body of list) {
      const k = keplerByName(body.data.name);
      if (k && body.data.orbitDays > 0) {
        body.angle = meanLongitudeRad(k, date);
      }
      visit(body.children);
    }
  };
  visit(bodies);
  placeAllOrbits(bodies);
}

function updateBody(body: BodyRuntime, deltaDays: number, live: boolean): void {
  if (body.data.kind === "comet" || body.data.kind === "mission") {
    if (body.data.spinDays > 0) {
      body.mesh.rotation.y += (Math.PI * 2 * deltaDays) / body.data.spinDays;
    }
    return;
  }
  if (!live && body.data.orbitDays > 0) {
    const direction = body.data.name === "Tritão" || body.data.name === "Febe" ? -1 : 1;
    body.angle += (direction * Math.PI * 2 * deltaDays) / body.data.orbitDays;
  }
  placeOnEllipse(body);
  if (body.data.spinDays > 0) {
    body.mesh.rotation.y += (Math.PI * 2 * deltaDays) / body.data.spinDays;
  }
  if (body.clouds) {
    body.clouds.rotation.y += (Math.PI * 2 * deltaDays) / (body.data.spinDays * 1.3 || 1);
  }
  for (const child of body.children) {
    updateBody(child, deltaDays, live);
  }
}

function onPointerDown(event: PointerEvent): void {
  if (event.button !== 0) return;
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(selectable, false);
  if (!hits.length) return;
  const runtime = findRuntimeByMesh(hits[0].object);
  if (!runtime) return;
  selectBody(runtime, false);
}

function resize(): void {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  labelRenderer.setSize(window.innerWidth, window.innerHeight);
}

function setOrbitsVisible(visible: boolean): void {
  for (const [name, orbit] of orbitByName) {
    const body = findRuntimeByName(name);
    orbit.visible = visible && (body?.system.visible ?? true);
  }
  const visit = (list: BodyRuntime[]) => {
    for (const body of list) {
      for (const child of body.system.children) {
        if (child instanceof THREE.Line) {
          child.visible = visible && body.system.visible;
        }
      }
      visit(body.children);
    }
  };
  visit(bodies);
}

function findRuntimeByName(name: string): BodyRuntime | null {
  const visit = (list: BodyRuntime[]): BodyRuntime | null => {
    for (const body of list) {
      if (body.data.name === name) return body;
      const nested = visit(body.children);
      if (nested) return nested;
    }
    return null;
  };
  return visit(bodies);
}

// Build scene
scene.add(createStarfield());
let asteroidBelt = createBelt(ASTEROID_BELT);
let kuiperBelt = createBelt(KUIPER_BELT);
beltGroup.add(asteroidBelt, kuiperBelt);
beltByName.set(ASTEROID_BELT.name, asteroidBelt);
beltByName.set(KUIPER_BELT.name, kuiperBelt);

const sun = createSun();
bodies.push(sun);

for (const planet of PLANETS) {
  bodies.push(createOrbitingBody(planet, scene, false));
}
for (const dwarf of DWARF_PLANETS) {
  bodies.push(createOrbitingBody(dwarf, scene, false));
}

const halleyData = createHalleyBody();
const halley = createOrbitingBody(halleyData, scene, false);
halley.anchor.position.set(0, 0, 0);
const cometTail = createCometTail();
scene.add(cometTail);
bodies.push(halley);

function attachMission(name: string, description: string, facts: Record<string, string>, color: number): BodyRuntime {
  const data = createMissionBody(name, description, facts);
  const system = new THREE.Object3D();
  scene.add(system);
  const pivot = new THREE.Object3D();
  system.add(pivot);
  const anchor = new THREE.Object3D();
  pivot.add(anchor);
  const mesh = createProbeMesh(color);
  mesh.name = name;
  mesh.userData.bodyName = name;
  anchor.add(mesh);
  const label = makeLabel(name);
  label.position.y = 0.25;
  anchor.add(label);
  selectable.push(mesh);
  const runtime: BodyRuntime = {
    data,
    system,
    pivot,
    anchor,
    mesh,
    scaleTargets: [mesh],
    label,
    angle: 0,
    children: [],
  };
  bodies.push(runtime);
  return runtime;
}

const voyager1 = attachMission("Voyager 1", "Sonda interestelar no hemisfério norte da eclíptica.", {
  Lançamento: "5 set 1977",
  Status: "Espaço interestelar",
}, 0xd4ff8a);
const voyager2 = attachMission("Voyager 2", "Única sonda a visitar Urano e Netuno.", {
  Lançamento: "20 ago 1977",
  Status: "Espaço interestelar",
}, 0x8ad4ff);
const jwst = attachMission("James Webb", "Observatório no ponto L2 Terra–Sol.", {
  Lançamento: "25 dez 2021",
  Órbita: "Halo em L2",
}, 0xffd48a);

rebuildPrimaryOrbits([...PLANETS, ...DWARF_PLANETS]);
placeAllOrbits(bodies);
scene.add(trail.line);

let treeApi: ReturnType<typeof buildBodyTree> | null = null;
treeApi = buildBodyTree(treeRoot, bodies, {
  onSelect: (body) => selectBody(body, true),
  onToggleBody: setBodyVisible,
  onToggleBelt: setBeltVisible,
});

function toast(message: string): void {
  toastEl.hidden = false;
  toastEl.textContent = message;
  window.setTimeout(() => {
    toastEl.hidden = true;
  }, 2400);
}

function setSimDate(date: Date, fromSlider = false): void {
  simDate = date;
  if (!fromSlider) timelineInput.value = String(dateToSlider(date));
  if (liveToggle.checked) applyKeplerDate(simDate);
  refreshEvents();
}

function refreshEvents(): void {
  simTimeEl.textContent = formatSimTime(simDate);
  const near = eventsNear(simDate);
  if (near.length) {
    eventBanner.hidden = false;
    eventBanner.textContent = near.map((e) => e.title).join(" · ");
  } else {
    eventBanner.hidden = true;
  }
  eventChips.querySelectorAll(".event-chip").forEach((chip) => {
    const id = (chip as HTMLElement).dataset.id;
    chip.classList.toggle("is-active", near.some((e) => e.id === id));
  });
}

function jumpToEvent(ev: TimelineEvent): void {
  playUiClick();
  setSimDate(new Date(`${ev.date}T12:00:00Z`));
  if (ev.body) {
    const body = findRuntimeByName(ev.body);
    if (body) selectBody(body, true);
  }
}

eventChips.replaceChildren(
  ...TIMELINE_EVENTS.map((ev) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "event-chip";
    btn.dataset.id = ev.id;
    btn.textContent = ev.title;
    btn.title = `${ev.date} — ${ev.detail}`;
    btn.addEventListener("click", () => jumpToEvent(ev));
    return btn;
  }),
);

function setLabelsVisible(visible: boolean): void {
  if (!visible) {
    const visit = (list: BodyRuntime[]) => {
      for (const body of list) {
        if (body.label) body.label.visible = false;
        visit(body.children);
      }
    };
    visit(bodies);
  }
}

function isPrincipalLabel(body: BodyRuntime): boolean {
  return body.data.kind === "star" || body.data.kind === "planet";
}

function updateLabelLod(): void {
  if (!labelsToggle.checked) {
    setLabelsVisible(false);
    return;
  }

  const inspect = selected;

  const visit = (list: BodyRuntime[]) => {
    for (const body of list) {
      if (body.label) {
        if (!body.system.visible) {
          body.label.visible = false;
        } else {
          body.mesh.getWorldPosition(labelWorld);
          const dist = camera.position.distanceTo(labelWorld);
          const parent = body.parent;
          let show = false;

          if (isPrincipalLabel(body)) {
            show = dist < 180;
          } else if (body.data.kind === "moon") {
            const host = parent ?? body;
            host.mesh.getWorldPosition(tmp);
            const distHost = camera.position.distanceTo(tmp);
            const nearSystem = distHost < Math.max((parent?.data.radius ?? 1) * 18, 8);
            const related =
              inspect === body ||
              inspect === parent ||
              (inspect != null && inspect.parent === parent && parent != null);
            show = nearSystem || related;
          } else {
            const near = dist < Math.max(body.data.radius * 24, 16);
            const related =
              inspect === body ||
              inspect === parent ||
              inspect?.parent === body;
            show = near || related;
          }

          body.label.visible = show;
        }
      }
      visit(body.children);
    }
  };
  visit(bodies);
}

function shareView(): void {
  const p = new URLSearchParams();
  p.set("cx", camera.position.x.toFixed(2));
  p.set("cy", camera.position.y.toFixed(2));
  p.set("cz", camera.position.z.toFixed(2));
  p.set("tx", controls.target.x.toFixed(2));
  p.set("ty", controls.target.y.toFixed(2));
  p.set("tz", controls.target.z.toFixed(2));
  p.set("d", simDate.toISOString().slice(0, 10));
  if (selected) p.set("s", selected.data.name);
  const url = `${location.origin}${location.pathname}#${p.toString()}`;
  void navigator.clipboard.writeText(url).then(
    () => toast("Link da vista copiado"),
    () => toast(url),
  );
}

function loadHash(): void {
  const raw = location.hash.replace(/^#/, "");
  if (!raw) return;
  const p = new URLSearchParams(raw);
  const cx = Number(p.get("cx"));
  if (Number.isFinite(cx)) {
    camera.position.set(cx, Number(p.get("cy")), Number(p.get("cz")));
    controls.target.set(Number(p.get("tx")), Number(p.get("ty")), Number(p.get("tz")));
  }
  const d = p.get("d");
  if (d) setSimDate(new Date(`${d}T12:00:00Z`));
  const s = p.get("s");
  if (s) {
    const body = findRuntimeByName(s);
    if (body) selectBody(body, true);
  }
}

function updateMissions(date: Date): void {
  const y1 = (date.getTime() - Date.parse("1977-09-05T00:00:00Z")) / (365.25 * 86_400_000);
  const y2 = (date.getTime() - Date.parse("1977-08-20T00:00:00Z")) / (365.25 * 86_400_000);
  voyagerPosition(1, y1, tmp);
  voyager1.anchor.position.copy(tmp);
  voyagerPosition(2, y2, tmp);
  voyager2.anchor.position.copy(tmp);

  const earth = findRuntimeByName("Terra");
  if (earth) {
    earth.mesh.getWorldPosition(tmp);
    const away = tmp.clone().normalize().multiplyScalar(1.15);
    jwst.anchor.position.copy(tmp).add(away);
  }
}

treeFilter.addEventListener("input", () => filterTree(treeFilter.value));

speedInput.addEventListener("input", () => {
  speed = Number(speedInput.value);
  speedValue.textContent = `${speed.toFixed(1)}×`;
});

pauseBtn.addEventListener("click", () => {
  playUiClick();
  paused = !paused;
  pauseBtn.textContent = paused ? "Retomar" : "Pausar";
  pauseBtn.classList.toggle("is-paused", paused);
});

resetCameraBtn.addEventListener("click", () => {
  playWhoosh();
  focusTarget = null;
  followToggle.checked = false;
  camera.position.set(0, 36, 78);
  controls.target.set(0, 0, 0);
});

orbitsToggle.addEventListener("change", () => {
  playUiClick();
  setOrbitsVisible(orbitsToggle.checked);
});

beltsToggle?.addEventListener("change", () => {
  const master = beltsToggle.checked;
  for (const [name, belt] of beltByName) {
    const box = treeRoot.querySelector<HTMLInputElement>(`input[data-belt="${CSS.escape(name)}"]`);
    belt.visible = master && (box?.checked ?? true);
  }
});

labelsToggle.addEventListener("change", () => {
  if (!labelsToggle.checked) setLabelsVisible(false);
});
trailToggle.addEventListener("change", () => {
  trail.line.visible = trailToggle.checked;
  if (!trailToggle.checked) trail.reset();
});
relativeToggle.addEventListener("change", () => {
  relativeScaleOn = relativeToggle.checked;
  for (const body of bodies) applyBodyScale(body, relativeScaleOn);
});
liveToggle.addEventListener("change", () => {
  if (liveToggle.checked) applyKeplerDate(simDate);
});
soundToggle.addEventListener("change", () => setMuted(!soundToggle.checked));

function disposePoints(points: THREE.Points): void {
  points.geometry.dispose();
  (points.material as THREE.Material).dispose();
}

function rebuildBelts(): void {
  beltGroup.remove(asteroidBelt, kuiperBelt);
  disposePoints(asteroidBelt);
  disposePoints(kuiperBelt);
  const t = distanceBlend;
  asteroidBelt = createBelt({
    ...ASTEROID_BELT,
    inner: THREE.MathUtils.lerp(ASTEROID_BELT.inner, 2.2 * AU_SCENE, t),
    outer: THREE.MathUtils.lerp(ASTEROID_BELT.outer, 3.3 * AU_SCENE, t),
    thickness: THREE.MathUtils.lerp(ASTEROID_BELT.thickness, 2.4, t),
  });
  kuiperBelt = createBelt({
    ...KUIPER_BELT,
    inner: THREE.MathUtils.lerp(KUIPER_BELT.inner, 30 * AU_SCENE, t),
    outer: THREE.MathUtils.lerp(KUIPER_BELT.outer, 50 * AU_SCENE, t),
    thickness: THREE.MathUtils.lerp(KUIPER_BELT.thickness, 14, t),
  });
  beltGroup.add(asteroidBelt, kuiperBelt);
  beltByName.set(ASTEROID_BELT.name, asteroidBelt);
  beltByName.set(KUIPER_BELT.name, kuiperBelt);
}

function applyDistanceBlend(t: number): void {
  distanceBlend = t;
  distanceValue.textContent =
    t < 0.04 ? "Didática" : t > 0.96 ? "UA real" : `${Math.round(t * 100)}% real`;
  camera.far = 800 + t * 3200;
  camera.updateProjectionMatrix();
  controls.maxDistance = 280 + t * 1100;
  if (scene.fog instanceof THREE.FogExp2) {
    scene.fog.density = 0.0028 * (1 - t * 0.82);
  }
  rebuildPrimaryOrbits([...PLANETS, ...DWARF_PLANETS]);
  rebuildBelts();
  placeAllOrbits(bodies);
}

distanceInput.addEventListener("input", () => {
  applyDistanceBlend(Number(distanceInput.value));
});

async function runTour(): Promise<void> {
  const token = ++tourToken;
  tourBtn.disabled = true;
  paused = true;
  pauseBtn.textContent = "Retomar";
  pauseBtn.classList.add("is-paused");
  tourCaption.hidden = false;
  for (const stop of TOUR_STOPS) {
    if (token !== tourToken) break;
    const body = findRuntimeByName(stop.name);
    if (!body) continue;
    tourCaption.textContent = stop.caption;
    selectBody(body, true);
    await new Promise((r) => window.setTimeout(r, stop.ms));
  }
  if (token === tourToken) {
    tourCaption.hidden = true;
    focusTarget = null;
    followToggle.checked = false;
    camera.position.set(0, 36 + distanceBlend * 50, 78 + distanceBlend * 140);
    controls.target.set(0, 0, 0);
  }
  tourBtn.disabled = false;
}

tourBtn.addEventListener("click", () => {
  playUiClick();
  void runTour();
});

timelineInput.addEventListener("input", () => {
  setSimDate(sliderToDate(Number(timelineInput.value)), true);
});

function setImmersiveUi(on: boolean): void {
  document.body.classList.toggle("is-immersive", on);
  exitImmersiveBtn.hidden = !on;
  vrBtn.textContent = on ? "Sair do VR" : "VR";
}

async function exitImmersive(): Promise<void> {
  const session = renderer.xr.getSession();
  if (session) {
    try {
      await session.end();
    } catch {
      /* already ended */
    }
  }
  if (document.fullscreenElement) {
    try {
      await document.exitFullscreen();
    } catch {
      /* ignore */
    }
  }
  setImmersiveUi(false);
}

fullscreenBtn.addEventListener("click", () => {
  playUiClick();
  if (!document.fullscreenElement) void document.documentElement.requestFullscreen();
  else void document.exitFullscreen();
});

vrBtn.addEventListener("click", async () => {
  playUiClick();
  if (document.body.classList.contains("is-immersive") || renderer.xr.getSession()) {
    await exitImmersive();
    return;
  }
  const xr = "xr" in navigator ? navigator.xr : undefined;
  if (!xr) {
    toast("WebXR indisponível — modo imersivo. Esc ou Sair para voltar.");
    void document.documentElement.requestFullscreen();
    setImmersiveUi(true);
    return;
  }
  const supported = await xr.isSessionSupported("immersive-vr");
  if (!supported) {
    toast("Nenhum headset VR — modo imersivo. Esc ou Sair para voltar.");
    void document.documentElement.requestFullscreen();
    setImmersiveUi(true);
    return;
  }
  const session = await xr.requestSession("immersive-vr");
  session.addEventListener("end", () => setImmersiveUi(false));
  await renderer.xr.setSession(session);
  setImmersiveUi(true);
});

exitImmersiveBtn.addEventListener("click", () => {
  playUiClick();
  void exitImmersive();
});

screenshotBtn.addEventListener("click", () => {
  playUiClick();
  const url = renderer.domElement.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = `sistema-solar-${simDate.toISOString().slice(0, 10)}.png`;
  a.click();
  toast("Captura salva");
});

shareBtn.addEventListener("click", () => {
  playUiClick();
  shareView();
});

focusBtn.addEventListener("click", () => {
  if (!selected) return;
  selectBody(selected, true);
});

followToggle.addEventListener("change", () => {
  focusTarget = followToggle.checked && selected ? selected.mesh : null;
});

canvas.addEventListener("pointerdown", onPointerDown);
window.addEventListener("resize", resize);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    if (document.body.classList.contains("is-immersive") || renderer.xr.getSession()) {
      void exitImmersive();
      return;
    }
  }
  if (e.key === "h" || e.key === "H") {
    const next = !document.body.classList.contains("is-immersive");
    setImmersiveUi(next);
  }
});
window.addEventListener(
  "pointerdown",
  () => {
    void unlockAudio();
  },
  { once: true },
);

selectBody(sun, false);
timelineInput.value = String(dateToSlider(simDate));
refreshEvents();
if (liveToggle.checked) applyKeplerDate(simDate);
loadHash();

void tryFetchHorizonsSample(simDate).then((ok) => {
  ephemStatus.textContent = ok
    ? "JPL Horizons disponível — usando Kepler alinhado à data"
    : "Efemérides Kepler (J2000) — Horizons bloqueado no navegador";
});

function animate(): void {
  const delta = clock.getDelta();
  const dayScale = 12;

  if (!paused) {
    const deltaDays = delta * dayScale * speed;
    simDate = new Date(simDate.getTime() + deltaDays * 86_400_000);
    timelineInput.value = String(dateToSlider(simDate));
    const live = liveToggle.checked;
    if (live) applyKeplerDate(simDate);
    for (const body of bodies) updateBody(body, deltaDays, live);
    refreshEvents();
  }

  halleyPosition(julianDaysFromJ2000(simDate), cometPos);
  cometPos.multiplyScalar(1 + distanceBlend * 1.35);
  halley.anchor.position.copy(cometPos);
  updateCometTail(cometTail, cometPos, sunWorld);
  updateMissions(simDate);

  const earth = findRuntimeByName("Terra");
  const moon = findRuntimeByName("Lua");
  const venus = findRuntimeByName("Vênus");
  earth?.mesh.getWorldPosition(tmp);
  const earthPos = tmp.clone();
  moon?.mesh.getWorldPosition(followPos);
  const moonPos = moon ? followPos.clone() : null;
  venus?.mesh.getWorldPosition(labelWorld);
  const venusPos = venus ? labelWorld.clone() : null;
  const align = earth
    ? detectAlignment(sunWorld, earthPos, moonPos, venusPos)
    : null;
  if (align && eventBanner.hidden) {
    eventBanner.hidden = false;
    eventBanner.textContent = align === "eclipse-lunar" ? "Eclipse lunar" : align === "eclipse-solar" ? "Eclipse solar" : "Trânsito de Vênus";
  }

  if (earth) {
    const away = earthPos.clone().sub(sunWorld);
    if (away.lengthSq() > 1e-6) {
      away.normalize();
      earthShadow.visible = true;
      shadowDir.copy(away);
      earthShadow.position.copy(earthPos).addScaledVector(shadowDir, 5.2);
      earthShadow.quaternion.setFromUnitVectors(coneAxis, shadowDir);
      const lunar = align === "eclipse-lunar";
      (earthShadow.material as THREE.MeshBasicMaterial).opacity = lunar ? 0.45 : 0.2;
    }
  }

  if (earth?.earthMat) updateEarthSun(earth.earthMat, sunWorld);

  for (const name of ["Urano", "Netuno"] as const) {
    const ice = findRuntimeByName(name);
    const ring = ice?.ringMesh;
    if (!ring || !(ring.material instanceof THREE.MeshBasicMaterial)) continue;
    ice.mesh.getWorldPosition(tmp);
    const close = camera.position.distanceTo(tmp) < 14 || selected === ice;
    const base = ice.data.rings?.opacity ?? 0.35;
    ring.material.opacity = close ? Math.min(0.85, base + 0.4) : base;
  }

  if (trailToggle.checked && selected && !paused) {
    selected.mesh.getWorldPosition(tmp);
    trail.push(tmp);
  }

  if (focusTarget && followToggle.checked) {
    focusTarget.getWorldPosition(tmp);
    controls.target.lerp(tmp, 0.08);
    const distance = Math.max(selected?.data.radius ?? 1, 0.5) * 10 + 4;
    followPos.set(
      tmp.x + distance * 0.55,
      tmp.y + distance * 0.3,
      tmp.z + distance * 0.75,
    );
    camera.position.lerp(followPos, 0.05);
  }

  const pulse = 1 + Math.sin(performance.now() * 0.0015) * 0.025;
  const sunBase = relativeScaleOn ? (12 * 0.78) / SUN.radius : 1;
  sun.mesh.scale.setScalar(sunBase * pulse);

  controls.update();
  updateLabelLod();
  const mapScale = THREE.MathUtils.lerp(58, 52 * AU_SCENE, distanceBlend);
  minimap.draw(bodies, camera.position, mapScale);
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
