import * as THREE from "three";
import type { BodyRuntime } from "./types";

export function createAtmosphere(radius: number, color: string): THREE.Mesh {
  const uniforms = {
    glowColor: { value: new THREE.Color(color) },
    intensity: { value: 0.55 },
  };
  const material = new THREE.ShaderMaterial({
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    vertexShader: /* glsl */ `
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vNormal = normalize(normalMatrix * normal);
        vView = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 glowColor;
      uniform float intensity;
      varying vec3 vNormal;
      varying vec3 vView;
      void main() {
        float f = pow(1.0 - abs(dot(vView, vNormal)), 2.4);
        gl_FragColor = vec4(glowColor, f * intensity);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.045, 48, 48), material);
  mesh.name = "atmosphere";
  mesh.renderOrder = 2;
  return mesh;
}

export function createEarthMaterial(
  dayMap: THREE.Texture,
  nightMap: THREE.Texture | null,
  clouds: THREE.Texture | null,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      dayMap: { value: dayMap },
      nightMap: { value: nightMap },
      cloudMap: { value: clouds },
      sunPos: { value: new THREE.Vector3() },
      hasNight: { value: nightMap ? 1 : 0 },
      hasClouds: { value: clouds ? 1 : 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec3 vN;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vN = normalize(mat3(modelMatrix) * normal);
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D dayMap;
      uniform sampler2D nightMap;
      uniform sampler2D cloudMap;
      uniform vec3 sunPos;
      uniform float hasNight;
      uniform float hasClouds;
      varying vec3 vWorldPos;
      varying vec3 vN;
      varying vec2 vUv;
      void main() {
        vec3 L = normalize(sunPos - vWorldPos);
        float d = dot(normalize(vN), L);
        float dayF = smoothstep(-0.08, 0.28, d);
        vec3 dayC = texture2D(dayMap, vUv).rgb;
        vec3 nightC = hasNight > 0.5
          ? texture2D(nightMap, vUv).rgb * 1.6
          : dayC * 0.07 + vec3(0.02, 0.04, 0.08);
        vec3 base = mix(nightC, dayC, dayF);
        if (hasClouds > 0.5) {
          float c = texture2D(cloudMap, vUv).r;
          base = mix(base, vec3(1.0), c * 0.4 * dayF);
        }
        gl_FragColor = vec4(base, 1.0);
      }
    `,
  });
}

export function updateEarthSun(mat: THREE.ShaderMaterial, sun: THREE.Vector3): void {
  mat.uniforms.sunPos.value.copy(sun);
}

export class EclipticMinimap {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  draw(
    bodies: BodyRuntime[],
    camera: THREE.Vector3,
    scale: number,
  ): void {
    const { canvas: c, ctx } = this;
    const w = c.width;
    const h = c.height;
    const cx = w / 2;
    const cy = h / 2;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(6, 10, 18, 0.72)";
    ctx.beginPath();
    ctx.arc(cx, cy, w / 2 - 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(240,160,75,0.25)";
    ctx.stroke();

    const k = (w * 0.42) / Math.max(scale, 8);

    ctx.strokeStyle = "rgba(110,128,153,0.35)";
    ctx.lineWidth = 1;
    for (const body of bodies) {
      if (body.data.kind !== "planet" && body.data.kind !== "dwarf") continue;
      const a = body.anchor.position.length() || 1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, a * k, a * k, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = "#f0a04b";
    ctx.beginPath();
    ctx.arc(cx, cy, 3.2, 0, Math.PI * 2);
    ctx.fill();

    const tmp = new THREE.Vector3();
    for (const body of bodies) {
      if (body.data.kind !== "planet" && body.data.kind !== "dwarf") continue;
      body.mesh.getWorldPosition(tmp);
      const x = cx + tmp.x * k;
      const y = cy + tmp.z * k;
      ctx.fillStyle = body.data.kind === "dwarf" ? "#c4a882" : "#8eb6ff";
      ctx.beginPath();
      ctx.arc(x, y, body.data.kind === "planet" ? 2.2 : 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#ffe0b5";
    ctx.beginPath();
    ctx.moveTo(cx + camera.x * k, cy + camera.z * k);
    ctx.lineTo(cx + camera.x * k + 5, cy + camera.z * k - 8);
    ctx.lineTo(cx + camera.x * k - 5, cy + camera.z * k - 8);
    ctx.closePath();
    ctx.fill();
  }
}

export function renderComparator(
  hostA: HTMLElement,
  hostB: HTMLElement,
  selected: BodyRuntime | null,
): void {
  const earth = 1;
  const other = selected?.data.radiusEarth ?? selected?.data.radius ?? earth;
  const max = Math.max(earth, other);
  const sizeA = 28 + (earth / max) * 72;
  const sizeB = 28 + (other / max) * 72;
  hostA.style.width = `${sizeA}px`;
  hostA.style.height = `${sizeA}px`;
  hostA.style.background = "#3d7ad6";
  hostB.style.width = `${sizeB}px`;
  hostB.style.height = `${sizeB}px`;
  const color = selected?.data.color ?? "#888";
  hostB.style.background = color;
  hostA.dataset.label = "Terra";
  hostB.dataset.label = selected?.data.name ?? "—";
  const capA = hostA.querySelector("span");
  const capB = hostB.querySelector("span");
  if (capA) capA.textContent = "Terra";
  if (capB) capB.textContent = selected?.data.name ?? "—";
}

export const TOUR_STOPS: { name: string; caption: string; ms: number }[] = [
  { name: "Sol", caption: "Nossa estrela — 99,8% da massa do Sistema Solar.", ms: 4200 },
  { name: "Terra", caption: "Lar, com estações e a Lua como companheira.", ms: 4800 },
  { name: "Saturno", caption: "O senhor dos anéis, a 9,5 UA do Sol.", ms: 4800 },
  { name: "Plutão", caption: "Confins do cinturão de Kuiper.", ms: 5200 },
];

export function makeCityLights(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#030712";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2200; i++) {
    const x = Math.random() * size;
    const y = size * (0.18 + Math.random() * 0.64);
    const a = 0.25 + Math.random() * 0.75;
    ctx.fillStyle = `rgba(255, ${170 + Math.random() * 70}, ${90 + Math.random() * 80}, ${a})`;
    ctx.fillRect(x, y, 1 + Math.random() * 2, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
