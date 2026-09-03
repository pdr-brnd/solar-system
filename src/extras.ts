import * as THREE from "three";
import { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { CelestialBody } from "./planets";
import type { BodyRuntime } from "./types";

export function makeLabel(name: string): CSS2DObject {
  const el = document.createElement("div");
  el.className = "world-label";
  el.textContent = name;
  const label = new CSS2DObject(el);
  label.position.set(0, 0, 0);
  label.center.set(0.5, 1.4);
  return label;
}

export function createHalleyBody(): CelestialBody {
  return {
    name: "Halley",
    kind: "comet",
    radius: 0.16,
    radiusEarth: 0.08,
    orbitRadius: 42,
    orbitDays: 76 * 365,
    spinDays: 2.2,
    inclination: 0.28,
    color: "#cfe7ff",
    description: "Cometa periódico com cauda de gelo e poeira apontando para longe do Sol.",
    facts: {
      Período: "76 anos",
      Periélio: "0,59 UA",
      Afélio: "35 UA",
      "Última visita": "1986",
    },
  };
}

export function createMissionBody(
  name: string,
  description: string,
  facts: Record<string, string>,
): CelestialBody {
  return {
    name,
    kind: "mission",
    radius: 0.12,
    radiusEarth: 0.04,
    orbitRadius: 0,
    orbitDays: 0,
    spinDays: 0.4,
    inclination: 0,
    color: "#f4f7ff",
    description,
    facts,
  };
}

export function createCometTail(): THREE.Points {
  const count = 220;
  const positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xb7d7ff,
    size: 0.08,
    transparent: true,
    opacity: 0.75,
    depthWrite: false,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geometry, material);
  points.name = "halley-tail";
  points.frustumCulled = false;
  return points;
}

/** Elliptical Halley-like path compressed into the scene. */
export function halleyPosition(daysFromJ2000: number, out: THREE.Vector3): THREE.Vector3 {
  const period = 76 * 365.25;
  const peri = 10;
  const aphe = 68;
  const a = (peri + aphe) / 2;
  const e = (aphe - peri) / (aphe + peri);
  const M = ((daysFromJ2000 / period) * Math.PI * 2) % (Math.PI * 2);
  let E = M;
  for (let i = 0; i < 6; i++) E = M + e * Math.sin(E);
  const nu = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(E / 2), Math.sqrt(1 - e) * Math.cos(E / 2));
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));
  const inc = 2.83;
  out.set(Math.cos(nu) * r, Math.sin(nu) * r * Math.sin(inc) * 0.35, Math.sin(nu) * r * Math.cos(inc));
  return out;
}

export function updateCometTail(
  tail: THREE.Points,
  cometPos: THREE.Vector3,
  sunPos: THREE.Vector3,
): void {
  const away = cometPos.clone().sub(sunPos);
  if (away.lengthSq() < 1e-6) away.set(1, 0, 0);
  away.normalize();
  const dist = cometPos.distanceTo(sunPos);
  const length = THREE.MathUtils.clamp(18 / Math.max(dist, 4), 0.8, 6);
  const pos = tail.geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const t = i / pos.count;
    const spread = t * 0.55;
    pos.setXYZ(
      i,
      cometPos.x + away.x * t * length + (Math.random() - 0.5) * spread,
      cometPos.y + away.y * t * length + (Math.random() - 0.5) * spread * 0.4,
      cometPos.z + away.z * t * length + (Math.random() - 0.5) * spread,
    );
  }
  pos.needsUpdate = true;
}

export function createProbeMesh(color: number): THREE.Mesh {
  const geom = new THREE.ConeGeometry(0.08, 0.28, 6);
  const mat = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.45,
    metalness: 0.4,
    roughness: 0.35,
  });
  const mesh = new THREE.Mesh(geom, mat);
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

export class OrbitTrail {
  readonly line: THREE.Line;
  private readonly positions: Float32Array;
  private count = 0;
  private readonly max: number;

  constructor(max = 420, color = 0xffc56b) {
    this.max = max;
    this.positions = new Float32Array(max * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(this.positions, 3));
    geometry.setDrawRange(0, 0);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    this.line = new THREE.Line(geometry, material);
    this.line.frustumCulled = false;
    this.line.renderOrder = 4;
  }

  reset(): void {
    this.count = 0;
    this.line.geometry.setDrawRange(0, 0);
  }

  push(p: THREE.Vector3): void {
    if (this.count < this.max) {
      this.positions[this.count * 3] = p.x;
      this.positions[this.count * 3 + 1] = p.y;
      this.positions[this.count * 3 + 2] = p.z;
      this.count++;
    } else {
      this.positions.copyWithin(0, 3);
      this.positions[(this.max - 1) * 3] = p.x;
      this.positions[(this.max - 1) * 3 + 1] = p.y;
      this.positions[(this.max - 1) * 3 + 2] = p.z;
    }
    const attr = this.line.geometry.attributes.position as THREE.BufferAttribute;
    attr.needsUpdate = true;
    this.line.geometry.setDrawRange(0, this.count);
    this.line.geometry.computeBoundingSphere();
  }
}

export function voyagerPosition(
  id: 1 | 2,
  yearsSinceLaunch: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  const t = Math.max(0, yearsSinceLaunch);
  const r = 36 + t * 1.35;
  if (id === 1) {
    out.set(Math.cos(0.55) * r, 18 + t * 0.22, Math.sin(0.55) * r);
  } else {
    out.set(Math.cos(-0.9) * r, -12 - t * 0.12, Math.sin(-0.9) * r);
  }
  return out;
}

export function relativeScale(body: BodyRuntime, earthDidactic = 0.78): number {
  const earthUnits = body.data.radiusEarth ?? body.data.radius / earthDidactic;
  return (earthUnits * earthDidactic) / body.data.radius;
}

export function applyBodyScale(body: BodyRuntime, relative: boolean): void {
  const s = relative ? relativeScale(body) : 1;
  for (const obj of body.scaleTargets ?? [body.mesh]) {
    obj.scale.setScalar(s);
  }
  for (const child of body.children) applyBodyScale(child, relative);
}
