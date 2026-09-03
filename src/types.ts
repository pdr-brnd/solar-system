import type { CelestialBody } from "./planets";
import type * as THREE from "three";

export interface BodyRuntime {
  data: CelestialBody;
  /** Inclination + static moon orbit lines */
  system: THREE.Object3D;
  /** Orbital angle rotation only */
  pivot: THREE.Object3D;
  /** World-anchored body (rings + moons attach here) */
  anchor: THREE.Object3D;
  mesh: THREE.Mesh;
  clouds?: THREE.Mesh;
  scaleTargets?: THREE.Object3D[];
  label?: THREE.Object3D;
  parent?: BodyRuntime;
  tiltGroup?: THREE.Object3D;
  atmosphere?: THREE.Mesh;
  ringMesh?: THREE.Mesh;
  earthMat?: THREE.ShaderMaterial;
  angle: number;
  children: BodyRuntime[];
}
