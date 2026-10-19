import * as THREE from 'three';
import { GPUComputationRenderer, type Variable } from 'three/addons/misc/GPUComputationRenderer.js';
import noise from '../shaders/noise.glsl?raw';
import curl from '../shaders/curl.glsl?raw';
import respawn from '../shaders/respawn.glsl?raw';
import velocityFrag from '../shaders/velocity.frag?raw';
import positionFrag from '../shaders/position.frag?raw';

export interface SimParams {
  rise: number;
  flow: number;
  flowScale: number;
  drag: number;
  popRate: number;
  minRadius: number;
  maxRadius: number;
  windRadius: number;
  windForce: number;
  popRadius: number;
  burst: number;
}

/**
 * GPGPU bubble simulation: two ping-ponged float textures (position+radius,
 * velocity+pop state), one texel per bubble. Everything runs in fragment
 * shaders; the CPU only uploads a handful of uniforms per frame.
 */
export class Simulation {
  readonly size: number;
  readonly bounds: THREE.Vector3;
  private gpu: GPUComputationRenderer;
  private pos: Variable;
  private vel: Variable;
  private time = 0;
  private pendingClick = false;

  constructor(renderer: THREE.WebGLRenderer, size: number, bounds: THREE.Vector3, p: SimParams) {
    this.size = size;
    this.bounds = bounds;
    this.gpu = new GPUComputationRenderer(size, size, renderer);

    const pos0 = this.gpu.createTexture();
    const vel0 = this.gpu.createTexture();
    this.seed(pos0.image.data as Float32Array, vel0.image.data as Float32Array, p);

    const prelude = noise + curl + respawn;
    this.vel = this.gpu.addVariable('textureVelocity', prelude + velocityFrag, vel0);
    this.pos = this.gpu.addVariable('texturePosition', prelude + positionFrag, pos0);
    this.gpu.setVariableDependencies(this.vel, [this.pos, this.vel]);
    this.gpu.setVariableDependencies(this.pos, [this.pos, this.vel]);

    const shared = {
      uBounds: { value: bounds },
      uTime: { value: 0 },
      uDelta: { value: 0 },
    };
    Object.assign(this.vel.material.uniforms, shared, {
      uRise: { value: 0 }, uFlow: { value: 0 }, uFlowScale: { value: 0 }, uDrag: { value: 0 },
      uPopRate: { value: 0 }, uRayOrigin: { value: new THREE.Vector3() },
      uRayDir: { value: new THREE.Vector3(0, 0, -1) }, uPointer: { value: 0 },
      uWindRadius: { value: 0 }, uWindForce: { value: 0 }, uClick: { value: 0 },
      uPopRadius: { value: 0 }, uBurst: { value: 0 },
    });
    Object.assign(this.pos.material.uniforms, shared, {
      uMinRadius: { value: 0 }, uMaxRadius: { value: 0 },
    });

    const err = this.gpu.init();
    if (err) throw new Error(err);
  }

  /** Fill the volume with bubbles at random positions so the first frame is full. */
  private seed(pos: Float32Array, vel: Float32Array, p: SimParams) {
    const b = this.bounds;
    for (let i = 0; i < pos.length; i += 4) {
      const r = p.minRadius + (p.maxRadius - p.minRadius) * Math.pow(Math.random(), 5.0);
      pos[i] = (Math.random() * 2 - 1) * b.x * 0.9;
      pos[i + 1] = (Math.random() * 2 - 1) * b.y;
      pos[i + 2] = (Math.random() * 2 - 1) * b.z * 0.9;
      pos[i + 3] = r;
      vel[i] = 0;
      vel[i + 1] = p.rise * 0.5;
      vel[i + 2] = 0;
      vel[i + 3] = 0;
    }
  }

  get count() { return this.size * this.size; }

  /** Pop bubbles under the pointer on the next step. */
  click() { this.pendingClick = true; }

  step(dt: number, p: SimParams, ray: THREE.Ray, pointer: boolean) {
    this.time += dt;
    const vu = this.vel.material.uniforms;
    const pu = this.pos.material.uniforms;
    vu.uTime.value = pu.uTime.value = this.time;
    vu.uDelta.value = pu.uDelta.value = dt;
    vu.uRise.value = p.rise;
    vu.uFlow.value = p.flow;
    vu.uFlowScale.value = p.flowScale;
    vu.uDrag.value = p.drag;
    vu.uPopRate.value = p.popRate;
    vu.uWindRadius.value = p.windRadius;
    vu.uWindForce.value = p.windForce;
    vu.uPopRadius.value = p.popRadius;
    vu.uBurst.value = p.burst;
    vu.uRayOrigin.value.copy(ray.origin);
    vu.uRayDir.value.copy(ray.direction);
    vu.uPointer.value = pointer ? 1 : 0;
    vu.uClick.value = this.pendingClick ? 1 : 0;
    this.pendingClick = false;
    pu.uMinRadius.value = p.minRadius;
    pu.uMaxRadius.value = p.maxRadius;
    this.gpu.compute();
  }

  get positions() { return this.gpu.getCurrentRenderTarget(this.pos).texture; }
  get velocities() { return this.gpu.getCurrentRenderTarget(this.vel).texture; }

  dispose() { this.gpu.dispose(); }
}
